import { supabase } from './supabase'

function notifyAdmin(subject: string, text: string): void {
  supabase.functions.invoke('send-email', { body: { subject, text } }).catch(() => {})
}

export async function reportReview(reporterId: string, entryId: string, reason: string): Promise<void> {
  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId,
    target_type: 'review',
    target_id: entryId,
    reason,
  })
  if (error) throw error
  notifyAdmin('Gamelog: review reported', `Reporter: ${reporterId}\nReview entry: ${entryId}\nReason: ${reason}`)
}

export async function reportUser(reporterId: string, userId: string, reason: string): Promise<void> {
  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId,
    target_type: 'user',
    target_id: userId,
    reason,
  })
  if (error) throw error
  notifyAdmin('Gamelog: user reported', `Reporter: ${reporterId}\nReported user: ${userId}\nReason: ${reason}`)
}

export async function sendFeedback(userId: string, message: string, isBug: boolean): Promise<void> {
  const { error } = await supabase.from('feedback').insert({ user_id: userId, message, is_bug: isBug })
  if (error) throw error
  notifyAdmin(
    isBug ? 'Gamelog: bug report' : 'Gamelog: feedback',
    `From user: ${userId}\n\n${message}`,
  )
}

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase.from('blocks').insert({ blocker_id: blockerId, blocked_id: blockedId })
  if (error) throw error
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)

  if (error) throw error
}

export async function isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
    .maybeSingle()

  if (error) throw error
  return data != null
}

export async function getBlockedUserIds(blockerId: string): Promise<string[]> {
  const { data, error } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', blockerId)
  if (error) throw error
  return (data ?? []).map((r) => r.blocked_id)
}

export interface BlockedUser {
  blocked_id: string
  profiles: { id: string; username: string; display_name: string | null; avatar_url: string | null }
}

export async function getBlockedUsers(blockerId: string): Promise<BlockedUser[]> {
  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id, profiles!blocks_blocked_id_fkey(id, username, display_name, avatar_url)')
    .eq('blocker_id', blockerId)

  if (error) throw error
  return data as unknown as BlockedUser[]
}
