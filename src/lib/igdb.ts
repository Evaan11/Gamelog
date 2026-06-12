import { supabase } from './supabase'
import type { IgdbGame } from '../types/igdb'

/**
 * IGDB requires a Twitch app token + client secret, which can't live in the
 * browser. Searches are proxied through the "igdb-proxy" Supabase Edge
 * Function (see supabase/functions/igdb-proxy).
 */
export async function searchGames(query: string): Promise<IgdbGame[]> {
  if (!query.trim()) return []

  const { data, error } = await supabase.functions.invoke<IgdbGame[]>('igdb-proxy', {
    body: { search: query },
  })

  if (error) throw error
  return data ?? []
}

export async function getGame(id: number): Promise<IgdbGame | null> {
  const { data, error } = await supabase.functions.invoke<IgdbGame[]>('igdb-proxy', {
    body: { id },
  })

  if (error) throw error
  return data?.[0] ?? null
}

export async function getGameBySteamAppId(appId: number): Promise<IgdbGame | null> {
  const { data, error } = await supabase.functions.invoke<IgdbGame[]>('igdb-proxy', {
    body: { steamAppId: appId },
  })

  if (error) throw error
  return data?.[0] ?? null
}

export async function getSteamAppIdForGame(igdbId: number): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke<{ appId: string | null }>('igdb-proxy', {
    body: { igdbIdForSteam: igdbId },
  })

  if (error) throw error
  return data?.appId ?? null
}

export function coverUrl(imageId: string, size: 'cover_small' | 'cover_big' | 'screenshot_huge' = 'cover_big') {
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`
}

export type BrowseSort = 'popular' | 'alphabetical'

export interface BrowseFilters {
  genreIds?: number[]
  themeIds?: number[]
  platformIds?: number[]
  minRating?: number
}

export async function browseGames(
  sort: BrowseSort,
  offset: number,
  filters?: BrowseFilters,
): Promise<IgdbGame[]> {
  const { data, error } = await supabase.functions.invoke<IgdbGame[]>('igdb-proxy', {
    body: { browse: { sort, offset, ...filters } },
  })

  if (error) throw error
  return data ?? []
}
