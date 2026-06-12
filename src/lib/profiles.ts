import { supabase } from './supabase'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  steam_id: string | null
  steam_last_synced_at: string | null
  bio: string | null
  country_code: string | null
  created_at: string
}

export function displayName(profile: { username: string; display_name: string | null }): string {
  return profile.display_name ?? profile.username
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function updateUsername(userId: string, username: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ username }).eq('id', userId)
  if (error) throw error
}

export async function updateProfile(
  userId: string,
  changes: {
    display_name?: string | null
    avatar_url?: string | null
    steam_id?: string | null
    steam_last_synced_at?: string | null
    bio?: string | null
    country_code?: string | null
  },
): Promise<void> {
  const { error } = await supabase.from('profiles').update(changes).eq('id', userId)
  if (error) throw error
}

export async function searchProfiles(query: string, excludeUserId?: string): Promise<Profile[]> {
  let q = supabase.from('profiles').select('*').ilike('username', `%${query}%`).limit(10)
  if (excludeUserId) q = q.neq('id', excludeUserId)

  const { data, error } = await q
  if (error) throw error
  return data
}
