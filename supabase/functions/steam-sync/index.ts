// Supabase Edge Function: syncs every linked Steam account's library (playtime)
// and wishlist into game_entries. Meant to be triggered by a daily cron job
// (see migration 0011_steam_sync_cron.sql) but can also be called manually.
// Requires secrets STEAM_API_KEY, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET.
// Uses the auto-provided SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const STEAM_API_KEY = Deno.env.get('STEAM_API_KEY')!
const TWITCH_CLIENT_ID = Deno.env.get('TWITCH_CLIENT_ID')!
const TWITCH_CLIENT_SECRET = Deno.env.get('TWITCH_CLIENT_SECRET')!

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

let cachedToken: { value: string; expiresAt: number } | null = null

async function getTwitchToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value

  const url = new URL('https://id.twitch.tv/oauth2/token')
  url.searchParams.set('client_id', TWITCH_CLIENT_ID)
  url.searchParams.set('client_secret', TWITCH_CLIENT_SECRET)
  url.searchParams.set('grant_type', 'client_credentials')

  const res = await fetch(url, { method: 'POST' })
  if (!res.ok) throw new Error(`Twitch auth failed: ${res.status}`)

  const json = await res.json()
  cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 }
  return cachedToken.value
}

interface SteamGame {
  appid: number
  playtimeMinutes: number
  lastPlayedAt: string | null
}

async function fetchLibrary(steamId: string): Promise<SteamGame[]> {
  const url = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/')
  url.searchParams.set('key', STEAM_API_KEY)
  url.searchParams.set('steamid', steamId)
  url.searchParams.set('include_appinfo', '0')
  url.searchParams.set('include_played_free_games', '1')
  url.searchParams.set('format', 'json')

  const res = await fetch(url)
  if (!res.ok) return []
  const json = await res.json()
  return (json.response?.games ?? []).map(
    (g: { appid: number; playtime_forever: number; rtime_last_played?: number }) => ({
      appid: g.appid,
      playtimeMinutes: g.playtime_forever,
      lastPlayedAt: g.rtime_last_played ? new Date(g.rtime_last_played * 1000).toISOString() : null,
    }),
  )
}

async function fetchWishlist(steamId: string): Promise<number[]> {
  const url = new URL('https://api.steampowered.com/IWishlistService/GetWishlist/v1/')
  url.searchParams.set('steamid', steamId)

  const res = await fetch(url)
  if (!res.ok) return []
  const json = await res.json()
  return ((json.response?.items ?? []) as { appid: number }[]).map((item) => item.appid)
}

interface IgdbGame {
  id: number
  name: string
  cover?: { image_id: string }
  first_release_date?: number
  summary?: string
  total_rating?: number
}

/** Maps Steam app ids to IGDB games via external_games, in chunks. */
async function matchAppIds(appIds: number[]): Promise<Map<number, IgdbGame>> {
  const result = new Map<number, IgdbGame>()
  const token = await getTwitchToken()
  const unique = [...new Set(appIds)]

  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50)
    const uidList = chunk.map((id) => `"${id}"`).join(',')
    const body = `fields uid, game.id, game.name, game.cover.image_id, game.first_release_date, game.summary, game.total_rating;
where uid = (${uidList}) & external_game_source = 1;
limit 50;`

    const res = await fetch('https://api.igdb.com/v4/external_games', {
      method: 'POST',
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body,
    })
    if (!res.ok) continue

    const externalGames = (await res.json()) as { uid: string; game?: IgdbGame }[]
    for (const eg of externalGames) {
      if (eg.game) result.set(Number(eg.uid), eg.game)
    }
  }

  return result
}

async function ensureGameCached(game: IgdbGame): Promise<void> {
  await supabase.from('games').upsert(
    {
      id: game.id,
      name: game.name,
      cover_image_id: game.cover?.image_id ?? null,
      first_release_date: game.first_release_date
        ? new Date(game.first_release_date * 1000).toISOString()
        : null,
      summary: game.summary ?? null,
      total_rating: game.total_rating ?? null,
    },
    { onConflict: 'id' },
  )
}

async function syncProfile(profile: { id: string; steam_id: string }): Promise<{ library: number; wishlist: number }> {
  const [library, wishlistAppIds] = await Promise.all([
    fetchLibrary(profile.steam_id),
    fetchWishlist(profile.steam_id),
  ])

  const allAppIds = [...library.map((g) => g.appid), ...wishlistAppIds]
  const matches = await matchAppIds(allAppIds)

  const { data: existingEntries } = await supabase
    .from('game_entries')
    .select('game_id, status, rating, review, favorite, updated_at')
    .eq('user_id', profile.id)

  const existingByGameId = new Map((existingEntries ?? []).map((e) => [e.game_id, e]))

  let librarySynced = 0
  for (const game of library) {
    const igdbGame = matches.get(game.appid)
    if (!igdbGame) continue
    await ensureGameCached(igdbGame)

    const existing = existingByGameId.get(igdbGame.id)
    await supabase.from('game_entries').upsert(
      {
        user_id: profile.id,
        game_id: igdbGame.id,
        status: existing?.status ?? 'backlog',
        rating: existing?.rating ?? null,
        review: existing?.review ?? null,
        favorite: existing?.favorite ?? false,
        playtime_minutes: game.playtimeMinutes,
        last_played_at: game.lastPlayedAt,
        updated_at: existing?.updated_at ?? new Date().toISOString(),
      },
      { onConflict: 'user_id,game_id' },
    )
    librarySynced++
  }

  let wishlistSynced = 0
  for (const appId of wishlistAppIds) {
    const igdbGame = matches.get(appId)
    if (!igdbGame) continue
    if (existingByGameId.has(igdbGame.id)) continue
    await ensureGameCached(igdbGame)

    const { error } = await supabase.from('game_entries').upsert(
      {
        user_id: profile.id,
        game_id: igdbGame.id,
        status: 'wishlist',
        rating: null,
        review: null,
        favorite: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,game_id' },
    )
    if (!error) wishlistSynced++
  }

  await supabase
    .from('profiles')
    .update({ steam_last_synced_at: new Date().toISOString() })
    .eq('id', profile.id)

  return { library: librarySynced, wishlist: wishlistSynced }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, steam_id')
      .not('steam_id', 'is', null)

    if (error) throw error

    const results: Record<string, { library: number; wishlist: number } | { error: string }> = {}
    for (const profile of (profiles ?? []) as { id: string; steam_id: string }[]) {
      try {
        results[profile.id] = await syncProfile(profile)
      } catch (err) {
        results[profile.id] = { error: String(err) }
      }
    }

    return new Response(JSON.stringify({ synced: Object.keys(results).length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
