// Supabase Edge Function: fetches a user's owned games from the Steam Web API.
// Requires secret STEAM_API_KEY to be set:
//   supabase secrets set STEAM_API_KEY=xxx
import { corsHeaders } from '../_shared/cors.ts'

const STEAM_API_KEY = Deno.env.get('STEAM_API_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { steamId } = await req.json()
    if (typeof steamId !== 'string' || !/^\d+$/.test(steamId)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid "steamId" field' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/')
    url.searchParams.set('key', STEAM_API_KEY)
    url.searchParams.set('steamid', steamId)
    url.searchParams.set('include_appinfo', '1')
    url.searchParams.set('include_played_free_games', '1')
    url.searchParams.set('format', 'json')

    const res = await fetch(url)
    if (!res.ok) {
      const text = await res.text()
      return new Response(JSON.stringify({ error: `Steam API error: ${text}` }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const json = await res.json()
    const games = (json.response?.games ?? []).map(
      (g: { appid: number; name: string; playtime_forever: number; rtime_last_played?: number }) => ({
        appid: g.appid,
        name: g.name,
        playtimeMinutes: g.playtime_forever,
        lastPlayedAt: g.rtime_last_played ? new Date(g.rtime_last_played * 1000).toISOString() : null,
      }),
    )

    return new Response(JSON.stringify({ games }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
