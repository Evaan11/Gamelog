import { supabase } from './supabase'
import type { CachedGame } from './entries'
import type { Profile } from './profiles'

export type NotificationType = 'follow' | 'like' | 'comment' | 'price_drop'

export interface PriceDropData {
  game_id: number
  name: string
  discountPercent: number
  final: number
  initial: number
  currency: string
}

export interface Notification {
  id: string
  user_id: string
  actor_id: string
  type: NotificationType
  entry_id: string | null
  created_at: string
  read: boolean
  data: PriceDropData | null
  actor: Profile
  entry: { id: string; game_id: number; games: CachedGame } | null
}

export async function getNotifications(
  userId: string,
  offset = 0,
  limit = 15,
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey(*), entry:game_entries(id, game_id, games(id, name, cover_image_id, first_release_date))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return data as unknown as Notification[]
}

export async function markNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)

  if (error) throw error
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)

  if (error) throw error
  return count ?? 0
}

export interface ActivityEntry {
  id: string
  user_id: string
  game_id: number
  status: string
  rating: number | null
  review: string | null
  favorite: boolean
  updated_at: string
  created_at: string
  games: CachedGame
  profiles: Profile
}

export async function getFriendsActivity(
  userId: string,
  offset = 0,
  limit = 15,
): Promise<ActivityEntry[]> {
  const { data: followingRows, error: followError } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)

  if (followError) throw followError
  const followingIds = (followingRows ?? []).map((r) => r.following_id)
  if (followingIds.length === 0) return []

  const { data, error } = await supabase
    .from('game_entries')
    .select('*, games(id, name, cover_image_id, first_release_date), profiles!game_entries_user_id_fkey(*)')
    .in('user_id', followingIds)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return data as unknown as ActivityEntry[]
}

export async function likeReview(userId: string, entryId: string): Promise<void> {
  const { error } = await supabase.from('review_likes').insert({ user_id: userId, entry_id: entryId })
  if (error) throw error
}

export async function unlikeReview(userId: string, entryId: string): Promise<void> {
  const { error } = await supabase
    .from('review_likes')
    .delete()
    .eq('user_id', userId)
    .eq('entry_id', entryId)

  if (error) throw error
}

export async function getReviewLikes(entryId: string): Promise<{ count: number; userIds: string[] }> {
  const { data, error } = await supabase.from('review_likes').select('user_id').eq('entry_id', entryId)
  if (error) throw error
  const userIds = (data ?? []).map((r) => r.user_id)
  return { count: userIds.length, userIds }
}

export interface ReviewComment {
  id: string
  entry_id: string
  user_id: string
  content: string
  created_at: string
  profiles: Profile
}

export async function getReviewComments(entryId: string): Promise<ReviewComment[]> {
  const { data, error } = await supabase
    .from('review_comments')
    .select('*, profiles(*)')
    .eq('entry_id', entryId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as unknown as ReviewComment[]
}

export async function addReviewComment(entryId: string, userId: string, content: string): Promise<void> {
  const { error } = await supabase
    .from('review_comments')
    .insert({ entry_id: entryId, user_id: userId, content })

  if (error) throw error
}

export async function updateReviewComment(commentId: string, userId: string, content: string): Promise<void> {
  const { error } = await supabase
    .from('review_comments')
    .update({ content })
    .eq('id', commentId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function deleteReviewComment(commentId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('review_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId)

  if (error) throw error
}
