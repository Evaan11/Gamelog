// Supabase Edge Function: fetches the current Steam price (and discount, if
// any) for an app id via the public Steam Store API (no key required).
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { appId: rawAppId, name } = await req.json()
    let appId: string | null = /^\d+$/.test(String(rawAppId)) ? String(rawAppId) : null

    if (!appId && typeof name === 'string' && name.trim()) {
      const searchUrl = new URL('https://store.steampowered.com/api/storesearch')
      searchUrl.searchParams.set('term', name)
      searchUrl.searchParams.set('cc', 'fr')
      searchUrl.searchParams.set('l', 'en')
      const searchRes = await fetch(searchUrl)
      if (searchRes.ok) {
        const searchJson = await searchRes.json()
        const items = (searchJson.items ?? []) as { id: number; name: string; price?: unknown }[]
        const lowerName = name.toLowerCase()
        // Prefer a listing that actually has a price (the original game may be
        // delisted in favor of a "Definitive/Enhanced/Remastered" re-release).
        const withPrice = items.filter((item) => item.price)
        const match =
          withPrice.find((item) => item.name.toLowerCase() === lowerName) ??
          withPrice.find((item) => item.name.toLowerCase().startsWith(lowerName)) ??
          withPrice[0] ??
          items.find((item) => item.name.toLowerCase() === lowerName) ??
          items[0]
        if (match) appId = String(match.id)
      }
    }

    if (!appId) {
      return new Response(JSON.stringify({ price: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL('https://store.steampowered.com/api/appdetails')
    url.searchParams.set('appids', appId)
    url.searchParams.set('cc', 'fr')
    url.searchParams.set('filters', 'price_overview,is_free')

    const res = await fetch(url)
    if (!res.ok) {
      return new Response(JSON.stringify({ price: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const json = await res.json()
    const data = json[appId]?.data

    if (!data) {
      return new Response(JSON.stringify({ price: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (data.is_free) {
      return new Response(JSON.stringify({ price: { isFree: true, appId } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const overview = data.price_overview
    if (!overview) {
      return new Response(JSON.stringify({ price: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        price: {
          isFree: false,
          currency: overview.currency,
          initial: overview.initial / 100,
          final: overview.final / 100,
          discountPercent: overview.discount_percent,
          appId,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
