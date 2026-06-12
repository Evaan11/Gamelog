// Supabase Edge Function: proxies search requests to IGDB.
// Requires secrets TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET to be set:
//   supabase secrets set TWITCH_CLIENT_ID=xxx TWITCH_CLIENT_SECRET=xxx
import { corsHeaders } from '../_shared/cors.ts'

const TWITCH_CLIENT_ID = Deno.env.get('TWITCH_CLIENT_ID')!
const TWITCH_CLIENT_SECRET = Deno.env.get('TWITCH_CLIENT_SECRET')!

let cachedToken: { value: string; expiresAt: number } | null = null

async function getTwitchToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value
  }

  const url = new URL('https://id.twitch.tv/oauth2/token')
  url.searchParams.set('client_id', TWITCH_CLIENT_ID)
  url.searchParams.set('client_secret', TWITCH_CLIENT_SECRET)
  url.searchParams.set('grant_type', 'client_credentials')

  const res = await fetch(url, { method: 'POST' })
  if (!res.ok) throw new Error(`Twitch auth failed: ${res.status}`)

  const json = await res.json()
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in - 60) * 1000,
  }
  return cachedToken.value
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { search, id, ids, steamAppId, igdbIdForSteam, browse } = await req.json()

    if (browse) {
      const sortField =
        browse.sort === 'alphabetical'
          ? 'name asc'
          : browse.sort === 'top_rated'
            ? 'total_rating desc'
            : 'total_rating_count desc'
      const offset = Number(browse.offset) || 0
      const token = await getTwitchToken()
      const genreIds = (Array.isArray(browse.genreIds) ? browse.genreIds : []).map(Number).filter(Number.isInteger)
      const genreFilter = genreIds.length > 0 ? ` & genres = (${genreIds.join(',')})` : ''
      const themeIds = (Array.isArray(browse.themeIds) ? browse.themeIds : []).map(Number).filter(Number.isInteger)
      const themeFilter = themeIds.length > 0 ? ` & themes = (${themeIds.join(',')})` : ''
      const platformIds = (Array.isArray(browse.platformIds) ? browse.platformIds : []).map(Number).filter(Number.isInteger)
      const platformFilter = platformIds.length > 0 ? ` & platforms = (${platformIds.join(',')})` : ''
      const minRating = Number(browse.minRating)
      const ratingFilter = Number.isFinite(minRating) && minRating > 0 ? ` & total_rating >= ${minRating}` : ''
      const body = `fields name, cover.image_id, first_release_date, summary, total_rating, total_rating_count, category, platforms.name, platforms.abbreviation, genres.name, themes.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, screenshots.image_id, artworks.image_id;
where total_rating_count > 0${genreFilter}${themeFilter}${platformFilter}${ratingFilter};
sort ${sortField};
limit 50;
offset ${offset};`

      const res = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'text/plain',
        },
        body,
      })

      if (!res.ok) {
        const text = await res.text()
        return new Response(JSON.stringify({ error: `IGDB error: ${text}` }), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      let games = await res.json()
      const MAIN_CATEGORIES = new Set([0, 4, 8, 9, 10, 11])
      games = games.filter((g: { cover?: unknown; category?: number }) =>
        g.cover != null && MAIN_CATEGORIES.has(g.category ?? 0),
      )

      return new Response(JSON.stringify(games), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (igdbIdForSteam !== undefined) {
      const gameId = Number(igdbIdForSteam)
      if (!Number.isInteger(gameId)) {
        return new Response(JSON.stringify({ error: 'Invalid "igdbIdForSteam" field' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const token = await getTwitchToken()

      // Re-releases/remasters/remakes often share a Steam listing with a
      // different IGDB id than the "main" entry, so gather every related id
      // (in both directions) and try them all.
      const [gameRes, relatedRes] = await Promise.all([
        fetch('https://api.igdb.com/v4/games', {
          method: 'POST',
          headers: {
            'Client-ID': TWITCH_CLIENT_ID,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'text/plain',
          },
          body: `fields remasters, remakes, ports, version_parent, parent_game; where id = ${gameId};`,
        }),
        fetch('https://api.igdb.com/v4/games', {
          method: 'POST',
          headers: {
            'Client-ID': TWITCH_CLIENT_ID,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'text/plain',
          },
          body: `fields id; where remasters = ${gameId} | remakes = ${gameId} | ports = ${gameId} | version_parent = ${gameId}; limit 10;`,
        }),
      ])
      const [gameInfo] = gameRes.ok ? await gameRes.json() : [{}]
      const related = relatedRes.ok ? await relatedRes.json() : []
      const candidateIds = [
        gameId,
        ...(gameInfo?.remasters ?? []),
        ...(gameInfo?.remakes ?? []),
        ...(gameInfo?.ports ?? []),
        ...(gameInfo?.version_parent ? [gameInfo.version_parent] : []),
        ...(gameInfo?.parent_game ? [gameInfo.parent_game] : []),
        ...related.map((g: { id: number }) => g.id),
      ]

      const body = `fields uid, game; where game = (${candidateIds.join(',')}) & external_game_source = 1;`

      const res = await fetch('https://api.igdb.com/v4/external_games', {
        method: 'POST',
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'text/plain',
        },
        body,
      })

      if (!res.ok) {
        const text = await res.text()
        return new Response(JSON.stringify({ error: `IGDB error: ${text}` }), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const externalGames = (await res.json()) as { uid: string; game: number }[]
      // Prefer a re-release's Steam id over the base game's, since the base
      // listing is often delisted (e.g. GTA V -> GTA V Enhanced).
      const sorted = externalGames.sort((a, b) => (a.game === gameId ? 1 : 0) - (b.game === gameId ? 1 : 0))
      const appId = sorted[0]?.uid ?? null
      return new Response(JSON.stringify({ appId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (steamAppId !== undefined) {
      const token = await getTwitchToken()
      const body = `fields game.id, game.name, game.cover.image_id, game.first_release_date, game.summary, game.total_rating;
where uid = "${String(steamAppId).replace(/"/g, '')}" & external_game_source = 1;`

      const res = await fetch('https://api.igdb.com/v4/external_games', {
        method: 'POST',
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'text/plain',
        },
        body,
      })

      if (!res.ok) {
        const text = await res.text()
        return new Response(JSON.stringify({ error: `IGDB error: ${text}` }), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const externalGames = await res.json()
      const games = externalGames.map((eg: { game?: unknown }) => eg.game).filter(Boolean)
      return new Response(JSON.stringify(games), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let body: string
    if (id !== undefined) {
      const gameId = Number(id)
      if (!Number.isInteger(gameId)) {
        return new Response(JSON.stringify({ error: 'Invalid "id" field' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      body = `fields name, cover.image_id, first_release_date, summary, total_rating, platforms.name, platforms.abbreviation, genres.name, themes.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, screenshots.image_id, artworks.image_id;
where id = ${gameId};`
    } else if (Array.isArray(ids) && ids.length > 0) {
      const gameIds = ids.map(Number).filter(Number.isInteger)
      body = `fields name, cover.image_id, first_release_date, summary, total_rating, platforms.name, platforms.abbreviation, genres.name, themes.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, screenshots.image_id, artworks.image_id;
where id = (${gameIds.join(',')});
limit ${gameIds.length};`
    } else if (typeof search === 'string' && search.trim()) {
      body = `search "${search.replace(/"/g, '\\"')}";
fields name, cover.image_id, first_release_date, summary, total_rating, category, platforms.name, platforms.abbreviation, genres.name, themes.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, screenshots.image_id, artworks.image_id;
limit 50;`
    } else {
      return new Response(JSON.stringify({ error: 'Missing "search" or "id" field' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = await getTwitchToken()

    const res = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body,
    })

    if (!res.ok) {
      const text = await res.text()
      return new Response(JSON.stringify({ error: `IGDB error: ${text}` }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let games = await res.json()

    if (typeof search === 'string' && search.trim()) {
      const MAIN_CATEGORIES = new Set([0, 4, 8, 9, 10, 11])
      games = games.filter(
        (g: { cover?: unknown; category?: number }) => g.cover != null && MAIN_CATEGORIES.has(g.category ?? 0),
      )
      games.sort(
        (a: { total_rating?: number }, b: { total_rating?: number }) =>
          (b.total_rating ?? 0) - (a.total_rating ?? 0),
      )
      games = games.slice(0, 20)
    }

    return new Response(JSON.stringify(games), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
