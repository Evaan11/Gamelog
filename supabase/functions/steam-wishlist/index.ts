// Supabase Edge Function: fetches a user's Steam wishlist via the public
// IWishlistService/GetWishlist endpoint (no API key required).
import { corsHeaders } from '../_shared/cors.ts'

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

    const url = new URL('https://api.steampowered.com/IWishlistService/GetWishlist/v1/')
    url.searchParams.set('steamid', steamId)

    const res = await fetch(url)
    if (!res.ok) {
      const text = await res.text()
      return new Response(JSON.stringify({ error: `Steam API error: ${text}` }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const json = await res.json()
    const items = (json.response?.items ?? []) as { appid: number }[]
    const appIds = items.map((item) => item.appid)

    return new Response(JSON.stringify({ appIds }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
