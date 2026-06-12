import { supabase } from './supabase'

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'

/** Builds the Steam OpenID login URL, returning the user to /steam-callback. */
export function getSteamLoginUrl(): string {
  const returnTo = `${window.location.origin}/steam-callback`
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnTo,
    'openid.realm': window.location.origin,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  })
  return `${STEAM_OPENID_URL}?${params.toString()}`
}

export interface SteamGame {
  appid: number
  name: string
  playtimeMinutes: number
  lastPlayedAt: string | null
}

/** Fetches the user's owned games from Steam via the steam-library edge function. */
export async function getSteamLibrary(steamId: string): Promise<SteamGame[]> {
  const { data, error } = await supabase.functions.invoke('steam-library', { body: { steamId } })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data.games as SteamGame[]
}

/** Fetches the user's Steam wishlist (app ids) via the steam-wishlist edge function. */
export async function getSteamWishlist(steamId: string): Promise<number[]> {
  const { data, error } = await supabase.functions.invoke('steam-wishlist', { body: { steamId } })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data.appIds as number[]
}

export interface SteamPrice {
  isFree: boolean
  currency?: string
  initial?: number
  final?: number
  discountPercent?: number
  appId?: string
}

/**
 * Fetches the current Steam store price (and discount, if any) for an app id.
 * If `appId` is omitted (or has no listing), falls back to a Steam store
 * search by `name` — useful for re-released games whose IGDB id has no
 * direct Steam mapping (e.g. "GTA V" -> "Grand Theft Auto V Enhanced").
 */
export async function getSteamPrice(appId: string | null, name?: string): Promise<SteamPrice | null> {
  const { data, error } = await supabase.functions.invoke('steam-price', { body: { appId, name } })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data.price as SteamPrice | null
}

/** Verifies the Steam OpenID callback params via the steam-verify edge function and returns the steamid64. */
export async function verifySteamCallback(searchParams: URLSearchParams): Promise<string> {
  const params: Record<string, string> = {}
  for (const [key, value] of searchParams.entries()) {
    params[key] = value
  }

  const { data, error } = await supabase.functions.invoke('steam-verify', { body: { params } })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data.steamId as string
}
