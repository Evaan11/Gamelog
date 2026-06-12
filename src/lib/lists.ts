import { supabase } from './supabase'
import type { CachedGame } from './entries'

export interface GameList {
  id: string
  user_id: string
  title: string
  created_at: string
}

export interface ListWithGames extends GameList {
  list_games: { game_id: number; games: CachedGame }[]
}

export async function getUserLists(userId: string): Promise<ListWithGames[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('*, list_games(game_id, games(id, name, cover_image_id, first_release_date))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as unknown as ListWithGames[]
}

export async function getList(listId: string): Promise<ListWithGames | null> {
  const { data, error } = await supabase
    .from('lists')
    .select('*, list_games(game_id, games(id, name, cover_image_id, first_release_date))')
    .eq('id', listId)
    .maybeSingle()

  if (error) throw error
  return data as unknown as ListWithGames | null
}

export async function createList(userId: string, title: string): Promise<GameList> {
  const { data, error } = await supabase
    .from('lists')
    .insert({ user_id: userId, title })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteList(listId: string): Promise<void> {
  const { error } = await supabase.from('lists').delete().eq('id', listId)
  if (error) throw error
}

export async function addGameToList(listId: string, gameId: number): Promise<void> {
  const { error } = await supabase
    .from('list_games')
    .upsert({ list_id: listId, game_id: gameId }, { onConflict: 'list_id,game_id' })

  if (error) throw error
}

export async function removeGameFromList(listId: string, gameId: number): Promise<void> {
  const { error } = await supabase
    .from('list_games')
    .delete()
    .eq('list_id', listId)
    .eq('game_id', gameId)

  if (error) throw error
}
