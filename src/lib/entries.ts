import { supabase } from './supabase'
import type { IgdbGame } from '../types/igdb'

export type GameStatus = 'finished' | 'playing' | 'backlog' | 'wishlist'

export interface GameEntry {
  id: string
  user_id: string
  game_id: number
  status: GameStatus
  rating: number | null
  review: string | null
  favorite: boolean
  playtime_minutes: number | null
  time_to_finish_minutes: number | null
  platform: string | null
  last_played_at: string | null
  created_at: string
  updated_at: string
}

/** Ensures the IGDB game is cached in our `games` table. */
export async function ensureGameCached(game: IgdbGame): Promise<void> {
  const { error } = await supabase.from('games').upsert(
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

  if (error) throw error
}

export async function getEntry(userId: string, gameId: number): Promise<GameEntry | null> {
  const { data, error } = await supabase
    .from('game_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('game_id', gameId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertEntry(params: {
  userId: string
  gameId: number
  status: GameStatus
  rating: number | null
  review: string | null
  favorite: boolean
  timeToFinishMinutes?: number | null
  platform?: string | null
}): Promise<void> {
  const { error } = await supabase.from('game_entries').upsert(
    {
      user_id: params.userId,
      game_id: params.gameId,
      status: params.status,
      rating: params.rating,
      review: params.review,
      favorite: params.favorite,
      ...(params.timeToFinishMinutes !== undefined ? { time_to_finish_minutes: params.timeToFinishMinutes } : {}),
      ...(params.platform !== undefined ? { platform: params.platform } : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,game_id' },
  )

  if (error) throw error
}

export async function deleteReview(userId: string, gameId: number): Promise<void> {
  const { error } = await supabase
    .from('game_entries')
    .update({ review: null, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('game_id', gameId)

  if (error) throw error
}

export interface CachedGame {
  id: number
  name: string
  cover_image_id: string | null
  first_release_date: string | null
}

export interface GameEntryWithGame extends GameEntry {
  games: CachedGame
}

export async function getUserEntries(userId: string): Promise<GameEntryWithGame[]> {
  const { data, error } = await supabase
    .from('game_entries')
    .select('*, games(id, name, cover_image_id, first_release_date)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data as GameEntryWithGame[]
}

/**
 * Imports a Steam library entry: caches the game and sets its playtime.
 * If the user doesn't already have an entry for this game, creates one with
 * status "backlog" so the user can later mark it as played/finished manually.
 */
export async function importSteamEntry(params: {
  userId: string
  gameId: number
  playtimeMinutes: number
  lastPlayedAt: string | null
}): Promise<void> {
  const existing = await getEntry(params.userId, params.gameId)

  const { error } = await supabase.from('game_entries').upsert(
    {
      user_id: params.userId,
      game_id: params.gameId,
      status: existing?.status ?? 'backlog',
      rating: existing?.rating ?? null,
      review: existing?.review ?? null,
      favorite: existing?.favorite ?? false,
      playtime_minutes: params.playtimeMinutes,
      last_played_at: params.lastPlayedAt,
      updated_at: existing?.updated_at ?? new Date().toISOString(),
    },
    { onConflict: 'user_id,game_id' },
  )

  if (error) throw error
}

/**
 * Imports a Steam wishlist item: caches the game and, if the user doesn't
 * already have an entry for it, creates one with status "wishlist".
 * Existing entries (any status) are left untouched.
 */
export async function importWishlistEntry(params: { userId: string; gameId: number }): Promise<void> {
  const existing = await getEntry(params.userId, params.gameId)
  if (existing) return

  const { error } = await supabase.from('game_entries').upsert(
    {
      user_id: params.userId,
      game_id: params.gameId,
      status: 'wishlist',
      rating: null,
      review: null,
      favorite: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,game_id' },
  )

  if (error) throw error
}

export async function deleteEntry(userId: string, gameId: number): Promise<void> {
  const { error } = await supabase
    .from('game_entries')
    .delete()
    .eq('user_id', userId)
    .eq('game_id', gameId)

  if (error) throw error
}

/** Deletes all of a user's game entries and lists, resetting their library/journal/reviews. */
export async function resetAccount(userId: string): Promise<void> {
  const { error: entriesError } = await supabase.from('game_entries').delete().eq('user_id', userId)
  if (entriesError) throw entriesError

  const { error: listsError } = await supabase.from('lists').delete().eq('user_id', userId)
  if (listsError) throw listsError
}

/** Removes all wishlist entries (e.g. ones imported from a Steam wishlist sync). */
export async function resetWishlist(userId: string): Promise<void> {
  const { error } = await supabase.from('game_entries').delete().eq('user_id', userId).eq('status', 'wishlist')
  if (error) throw error
}

/** Removes all entries with Steam playtime tracked (i.e. games imported from a Steam library sync). */
export async function resetSteamLibrary(userId: string): Promise<void> {
  const { error } = await supabase
    .from('game_entries')
    .delete()
    .eq('user_id', userId)
    .not('playtime_minutes', 'is', null)

  if (error) throw error
}
