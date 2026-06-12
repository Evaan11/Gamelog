// Supabase Edge Function: checks the current Steam price of every game on
// every user's wishlist, and creates a "price_drop" notification when a game
// goes on sale (or when the discount changes from the last notified value).
// Meant to be triggered by a daily cron job, but can also be called manually.
// Requires secrets TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET.
// Uses the auto-provided SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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

/** Finds a Steam app id for an IGDB game id, falling back to a name-based store search. */
async function findSteamAppId(gameId: number, name: string): Promise<string | null> {
  const token = await getTwitchToken()

  const res = await fetch('https://api.igdb.com/v4/external_games', {
    method: 'POST',
    headers: {
      'Client-ID': TWITCH_CLIENT_ID,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body: `fields uid; where game = ${gameId} & external_game_source = 1; limit 1;`,
  })
  if (res.ok) {
    const externalGames = (await res.json()) as { uid: string }[]
    if (externalGames[0]?.uid) return externalGames[0].uid
  }

  const searchUrl = new URL('https://store.steampowered.com/api/storesearch')
  searchUrl.searchParams.set('term', name)
  searchUrl.searchParams.set('cc', 'fr')
  searchUrl.searchParams.set('l', 'en')
  const searchRes = await fetch(searchUrl)
  if (!searchRes.ok) return null

  const searchJson = await searchRes.json()
  const items = (searchJson.items ?? []) as { id: number; name: string; price?: unknown }[]
  const lowerName = name.toLowerCase()
  const withPrice = items.filter((item) => item.price)
  const match =
    withPrice.find((item) => item.name.toLowerCase() === lowerName) ??
    withPrice.find((item) => item.name.toLowerCase().startsWith(lowerName)) ??
    withPrice[0] ??
    items.find((item) => item.name.toLowerCase() === lowerName) ??
    items[0]

  return match ? String(match.id) : null
}

interface SteamPrice {
  isFree: boolean
  currency?: string
  initial?: number
  final?: number
  discountPercent?: number
}

async function getSteamPrice(appId: string): Promise<SteamPrice | null> {
  const url = new URL('https://store.steampowered.com/api/appdetails')
  url.searchParams.set('appids', appId)
  url.searchParams.set('cc', 'fr')
  url.searchParams.set('filters', 'price_overview,is_free')

  const res = await fetch(url)
  if (!res.ok) return null

  const json = await res.json()
  const data = json[appId]?.data
  if (!data) return null
  if (data.is_free) return { isFree: true }

  const overview = data.price_overview
  if (!overview) return null

  return {
    isFree: false,
    currency: overview.currency,
    initial: overview.initial / 100,
    final: overview.final / 100,
    discountPercent: overview.discount_percent,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { data: entries, error } = await supabase
      .from('game_entries')
      .select('id, user_id, game_id, last_notified_discount, games(id, name)')
      .eq('status', 'wishlist')

    if (error) throw error

    type Entry = {
      id: string
      user_id: string
      game_id: number
      last_notified_discount: number | null
      games: { id: number; name: string } | { id: number; name: string }[]
    }

    const priceCache = new Map<number, SteamPrice | null>()
    let notified = 0

    for (const entry of (entries ?? []) as Entry[]) {
      const game = Array.isArray(entry.games) ? entry.games[0] : entry.games
      if (!game) continue

      let price = priceCache.get(game.id)
      if (price === undefined) {
        try {
          const appId = await findSteamAppId(game.id, game.name)
          price = appId ? await getSteamPrice(appId) : null
        } catch {
          price = null
        }
        priceCache.set(game.id, price)
      }

      const discount = price && !price.isFree ? (price.discountPercent ?? 0) : 0

      if (discount > 0 && discount !== entry.last_notified_discount) {
        await supabase.from('notifications').insert({
          user_id: entry.user_id,
          actor_id: entry.user_id,
          type: 'price_drop',
          entry_id: entry.id,
          data: {
            game_id: game.id,
            name: game.name,
            discountPercent: discount,
            final: price!.final,
            initial: price!.initial,
            currency: price!.currency,
          },
        })
        notified++
      }

      if (discount !== (entry.last_notified_discount ?? 0)) {
        await supabase
          .from('game_entries')
          .update({ last_notified_discount: discount > 0 ? discount : null })
          .eq('id', entry.id)
      }
    }

    return new Response(JSON.stringify({ checked: entries?.length ?? 0, notified }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
