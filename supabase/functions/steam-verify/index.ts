// Supabase Edge Function: verifies a Steam OpenID 2.0 callback and returns the steamid64.
import { corsHeaders } from '../_shared/cors.ts'

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { params } = await req.json()
    if (!params || typeof params !== 'object') {
      return new Response(JSON.stringify({ error: 'Missing "params" field' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const claimedId: string | undefined = params['openid.claimed_id']
    if (!claimedId) {
      return new Response(JSON.stringify({ error: 'Missing openid.claimed_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Re-validate the signed assertion with Steam to prevent spoofing.
    const verifyParams = new URLSearchParams(params)
    verifyParams.set('openid.mode', 'check_authentication')

    const res = await fetch(STEAM_OPENID_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: verifyParams.toString(),
    })

    const text = await res.text()
    if (!text.includes('is_valid:true')) {
      return new Response(JSON.stringify({ error: 'Invalid Steam OpenID assertion' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const match = claimedId.match(/^https:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/)
    if (!match) {
      return new Response(JSON.stringify({ error: 'Unexpected claimed_id format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ steamId: match[1] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
