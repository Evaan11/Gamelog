import { supabase } from './supabase'
import type { Profile } from './profiles'

export interface GameStats {
  favoriteCount: number
  avgRating: number | null
  ratingCount: number
  reviewCount: number
}

export async function getGameStats(gameId: number): Promise<GameStats> {
  const { data, error } = await supabase
    .from('game_entries')
    .select('rating, favorite, review')
    .eq('game_id', gameId)

  if (error) throw error

  const rows = data ?? []
  const favoriteCount = rows.filter((r) => r.favorite).length
  const rated = rows.filter((r) => r.rating != null)
  const avgRating = rated.length
    ? rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length / 2
    : null
  const reviewCount = rows.filter((r) => r.review?.trim()).length

  return { favoriteCount, avgRating, ratingCount: rated.length, reviewCount }
}

export async function getGameStatsBatch(gameIds: number[]): Promise<Map<number, GameStats>> {
  if (gameIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('game_entries')
    .select('game_id, rating, favorite, review')
    .in('game_id', gameIds)

  if (error) throw error

  const map = new Map<number, GameStats>()
  for (const id of gameIds) {
    map.set(id, { favoriteCount: 0, avgRating: null, ratingCount: 0, reviewCount: 0 })
  }

  const byGame = new Map<number, { rating: number | null; favorite: boolean; review: string | null }[]>()
  for (const row of data ?? []) {
    const list = byGame.get(row.game_id) ?? []
    list.push(row)
    byGame.set(row.game_id, list)
  }

  for (const [gameId, rows] of byGame) {
    const favoriteCount = rows.filter((r) => r.favorite).length
    const rated = rows.filter((r) => r.rating != null)
    const avgRating = rated.length
      ? rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length / 2
      : null
    const reviewCount = rows.filter((r) => r.review?.trim()).length
    map.set(gameId, { favoriteCount, avgRating, ratingCount: rated.length, reviewCount })
  }

  return map
}

export async function getGamesByAvgPlaytime(
  offset: number,
  limit: number,
): Promise<{ gameId: number; avgPlaytimeMinutes: number }[]> {
  const { data, error } = await supabase.rpc('games_by_avg_playtime', { p_limit: limit, p_offset: offset })
  if (error) throw error
  return (data ?? []).map((row: { game_id: number; avg_playtime: number }) => ({
    gameId: row.game_id,
    avgPlaytimeMinutes: row.avg_playtime,
  }))
}

export interface PopularReview {
  id: string
  user_id: string
  rating: number | null
  review: string
  updated_at: string
  platform: string | null
  time_to_finish_minutes: number | null
  likeCount: number
  profiles: Profile
  games: { id: number; name: string; cover_image_id: string | null; first_release_date: string | null }
}

export async function getPopularReviewsThisWeek(limit = 5): Promise<PopularReview[]> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('game_entries')
    .select(
      'id, user_id, rating, review, updated_at, platform, time_to_finish_minutes, profiles!game_entries_user_id_fkey(*), games(id, name, cover_image_id, first_release_date)',
    )
    .not('review', 'is', null)
    .neq('review', '')
    .gte('updated_at', weekAgo)

  if (error) throw error

  const rows = (data ?? []) as unknown as Omit<PopularReview, 'likeCount'>[]
  if (rows.length === 0) return []

  const entryIds = rows.map((r) => r.id)
  const { data: likes, error: likesError } = await supabase
    .from('review_likes')
    .select('entry_id')
    .in('entry_id', entryIds)

  if (likesError) throw likesError

  const likeCounts = new Map<string, number>()
  for (const l of likes ?? []) likeCounts.set(l.entry_id, (likeCounts.get(l.entry_id) ?? 0) + 1)

  return rows
    .map((r) => ({ ...r, likeCount: likeCounts.get(r.id) ?? 0 }))
    .sort((a, b) => b.likeCount - a.likeCount || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, limit)
}

export interface GameDetailStats {
  avgRating: number | null
  ratingCount: number
  ratingDistribution: number[] // index 0 = 0.5 star ... index 9 = 5 stars
  played: number
  playing: number
  finished: number
  backlog: number
  wishlist: number
  reviewCount: number
  favoriteCount: number
  listCount: number
  avgPlaytimeMinutes: number | null
  avgTimeToFinishMinutes: number | null
}

export async function getGameDetailStats(gameId: number): Promise<GameDetailStats> {
  const [{ data, error }, { count: listCount, error: listError }] = await Promise.all([
    supabase
      .from('game_entries')
      .select('rating, status, review, favorite, playtime_minutes, time_to_finish_minutes')
      .eq('game_id', gameId),
    supabase
      .from('list_games')
      .select('list_id', { count: 'exact', head: true })
      .eq('game_id', gameId),
  ])

  if (error) throw error
  if (listError) throw listError

  const rows = data ?? []
  const rated = rows.filter((r) => r.rating != null)
  const avgRating = rated.length
    ? rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length / 2
    : null

  const ratingDistribution = new Array(10).fill(0)
  for (const r of rated) {
    const bucket = Math.min(10, Math.max(1, r.rating ?? 0))
    ratingDistribution[bucket - 1] += 1
  }

  const playing = rows.filter((r) => r.status === 'playing').length
  const finished = rows.filter((r) => r.status === 'finished').length
  const backlog = rows.filter((r) => r.status === 'backlog').length
  const wishlist = rows.filter((r) => r.status === 'wishlist').length
  const played = playing + finished

  const reviewCount = rows.filter((r) => r.review?.trim()).length
  const favoriteCount = rows.filter((r) => r.favorite).length

  const playtimes = rows.filter((r) => r.playtime_minutes != null).map((r) => r.playtime_minutes as number)
  const avgPlaytimeMinutes = playtimes.length
    ? playtimes.reduce((sum, m) => sum + m, 0) / playtimes.length
    : null

  const timesToFinish = rows
    .filter((r) => r.time_to_finish_minutes != null)
    .map((r) => r.time_to_finish_minutes as number)
  const avgTimeToFinishMinutes = timesToFinish.length
    ? timesToFinish.reduce((sum, m) => sum + m, 0) / timesToFinish.length
    : null

  return {
    avgRating,
    ratingCount: rated.length,
    ratingDistribution,
    played,
    playing,
    finished,
    backlog,
    wishlist,
    reviewCount,
    favoriteCount,
    listCount: listCount ?? 0,
    avgPlaytimeMinutes,
    avgTimeToFinishMinutes,
  }
}

export interface GameEntryUser {
  profile: Profile
  rating: number | null
}

/** Fetches the profiles of users with a game_entries row matching the given filter for a game. */
export async function getGameEntryUsers(
  gameId: number,
  filter: 'played' | 'playing' | 'wishlist' | 'reviews' | 'likes',
): Promise<GameEntryUser[]> {
  let query = supabase.from('game_entries').select('user_id, rating, status, review, favorite').eq('game_id', gameId)

  if (filter === 'played') query = query.in('status', ['playing', 'finished'])
  else if (filter === 'playing') query = query.eq('status', 'playing')
  else if (filter === 'wishlist') query = query.eq('status', 'wishlist')
  else if (filter === 'likes') query = query.eq('favorite', true)

  const { data, error } = await query
  if (error) throw error

  let rows = data ?? []
  if (filter === 'reviews') rows = rows.filter((r) => r.review?.trim())

  if (rows.length === 0) return []

  const userIds = rows.map((r) => r.user_id)
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('*').in('id', userIds)
  if (profileError) throw profileError

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p as Profile]))

  return rows
    .map((r) => {
      const profile = profileById.get(r.user_id)
      return profile ? { profile, rating: r.rating } : null
    })
    .filter((x): x is GameEntryUser => x !== null)
}

export interface GameReview {
  id: string
  user_id: string
  rating: number | null
  review: string
  updated_at: string
  platform: string | null
  time_to_finish_minutes: number | null
  likeCount: number
  profiles: Profile
}

export async function getGameReviews(
  gameId: number,
  options?: { sort?: 'latest' | 'top'; userIds?: string[] },
): Promise<GameReview[]> {
  let query = supabase
    .from('game_entries')
    .select(
      'id, user_id, rating, review, updated_at, platform, time_to_finish_minutes, profiles!game_entries_user_id_fkey(*)',
    )
    .eq('game_id', gameId)
    .not('review', 'is', null)
    .neq('review', '')

  if (options?.userIds) query = query.in('user_id', options.userIds)

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as unknown as Omit<GameReview, 'likeCount'>[]
  if (rows.length === 0) return []

  const entryIds = rows.map((r) => r.id)
  const { data: likes, error: likesError } = await supabase
    .from('review_likes')
    .select('entry_id')
    .in('entry_id', entryIds)

  if (likesError) throw likesError

  const likeCounts = new Map<string, number>()
  for (const l of likes ?? []) likeCounts.set(l.entry_id, (likeCounts.get(l.entry_id) ?? 0) + 1)

  const result: GameReview[] = rows.map((r) => ({ ...r, likeCount: likeCounts.get(r.id) ?? 0 }))

  if (options?.sort === 'top') {
    result.sort(
      (a, b) => b.likeCount - a.likeCount || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )
  } else {
    result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }

  return result
}
