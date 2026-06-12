import { supabase } from './supabase'
import type { CachedGame } from './entries'

export interface FavoriteGame {
  position: number
  game: CachedGame
}

export async function getFavoriteGames(userId: string): Promise<FavoriteGame[]> {
  const { data, error } = await supabase
    .from('favorite_games')
    .select('position, games(id, name, cover_image_id, first_release_date)')
    .eq('user_id', userId)
    .order('position', { ascending: true })

  if (error) throw error
  return (data ?? []).map((row) => ({
    position: row.position,
    game: row.games as unknown as CachedGame,
  }))
}

export async function setFavoriteGame(userId: string, position: number, gameId: number): Promise<void> {
  const { error } = await supabase
    .from('favorite_games')
    .upsert({ user_id: userId, position, game_id: gameId }, { onConflict: 'user_id,position' })

  if (error) throw error
}

export async function removeFavoriteGame(userId: string, position: number): Promise<void> {
  const { error } = await supabase.from('favorite_games').delete().eq('user_id', userId).eq('position', position)
  if (error) throw error
}
