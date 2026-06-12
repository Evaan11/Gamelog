import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { getUserEntries, upsertEntry, type GameEntryWithGame, type GameStatus } from '../../lib/entries'
import { ReviewCard } from '../../components/ReviewCard'
import { ReviewModal } from '../../components/ReviewModal'
import { FavoriteGamePicker } from '../../components/FavoriteGamePicker'
import { getFavoriteGames, setFavoriteGame, removeFavoriteGame, type FavoriteGame } from '../../lib/favorites'
import { coverUrl } from '../../lib/igdb'
import type { ProfileOutletContext } from './ProfileLayout'

const STATUS_LABELS: Partial<Record<GameStatus, string>> = {
  playing: 'Playing',
  finished: 'Finished',
  backlog: 'To do',
}

const STATUS_ORDER: GameStatus[] = ['playing', 'finished', 'backlog']
const RECENT_REVIEWS_LIMIT = 3

export function ProfileOverview() {
  const { profile, isOwnProfile } = useOutletContext<ProfileOutletContext>()
  const [entries, setEntries] = useState<GameEntryWithGame[]>([])
  const [editingEntry, setEditingEntry] = useState<GameEntryWithGame | null>(null)
  const [favorites, setFavorites] = useState<FavoriteGame[]>([])
  const [editingSlot, setEditingSlot] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    getUserEntries(profile.id)
      .then((e) => {
        if (!cancelled) setEntries(e)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    getFavoriteGames(profile.id).then((f) => {
      if (!cancelled) setFavorites(f)
    })

    return () => {
      cancelled = true
    }
  }, [profile.id])

  const rated = entries.filter((e) => e.rating != null)
  const avgRating = rated.length
    ? (rated.reduce((sum, e) => sum + (e.rating ?? 0), 0) / rated.length / 2).toFixed(1)
    : null

  const counts = entries.reduce(
    (acc, e) => {
      acc[e.status] = (acc[e.status] ?? 0) + 1
      return acc
    },
    {} as Record<GameStatus, number>,
  )

  const recentlyPlayed = entries.filter((e) => e.status === 'playing' || e.status === 'finished').slice(0, 6)
  const recentReviews = entries.filter((e) => e.review && e.review.trim() !== '')

  async function handlePickFavorite(position: number, gameId: number) {
    await setFavoriteGame(profile.id, position, gameId)
    setFavorites((prev) => {
      const next = prev.filter((f) => f.position !== position)
      next.push({ position, game: { id: gameId, name: '', cover_image_id: null, first_release_date: null } })
      return next
    })
    const refreshed = await getFavoriteGames(profile.id)
    setFavorites(refreshed)
  }

  async function handleRemoveFavorite(position: number) {
    await removeFavoriteGame(profile.id, position)
    setFavorites((prev) => prev.filter((f) => f.position !== position))
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Favorite games</h2>
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[1, 2, 3, 4, 5].map((position) => {
          const fav = favorites.find((f) => f.position === position)
          return (
            <div key={position} className="relative">
              {position === 1 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 text-xl" title="Favorite game">
                  👑
                </div>
              )}
              {fav ? (
                <div className="relative group">
                  <Link to={`/game/${fav.game.id}`} className="relative block aspect-[3/4] rounded-lg overflow-hidden bg-surface ring-1 ring-white/5 transition-all hover:ring-accent">
                    {fav.game.cover_image_id ? (
                      <img
                        src={coverUrl(fav.game.cover_image_id, 'cover_big')}
                        alt={fav.game.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-text-muted p-1 text-center">
                        {fav.game.name}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center p-2 opacity-0 group-hover:opacity-100">
                      <span className="text-white text-sm font-semibold text-center leading-tight">{fav.game.name}</span>
                    </div>
                  </Link>
                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFavorite(position)}
                      aria-label="Remove favorite"
                      className="absolute top-1 right-1 z-10 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              ) : isOwnProfile ? (
                <button
                  type="button"
                  onClick={() => setEditingSlot(position)}
                  className="w-full aspect-[3/4] rounded-lg bg-surface ring-1 ring-white/5 flex items-center justify-center text-2xl text-text-muted hover:text-text hover:bg-surface-hover transition-colors cursor-pointer"
                  aria-label="Add favorite game"
                >
                  +
                </button>
              ) : (
                <div className="w-full aspect-[3/4] rounded-lg bg-surface ring-1 ring-white/5" />
              )}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-10">
        <div className="bg-surface rounded-lg p-4 text-center">
          <p className="text-2xl font-bold">{entries.length}</p>
          <p className="text-xs text-text-muted">Total games</p>
        </div>
        {STATUS_ORDER.map((s) => (
          <div key={s} className="bg-surface rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{counts[s] ?? 0}</p>
            <p className="text-xs text-text-muted">{STATUS_LABELS[s]}</p>
          </div>
        ))}
        <div className="bg-surface rounded-lg p-4 text-center col-span-2 sm:col-span-1">
          <p className="text-2xl font-bold">{avgRating ?? '-'}</p>
          <p className="text-xs text-text-muted">Avg rating</p>
        </div>
      </div>

      {loading && <p className="text-text-muted">Loading...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && entries.length === 0 && (
        <p className="text-text-muted">No games logged yet.</p>
      )}

      {recentlyPlayed.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-bold mb-4">Recently played</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {recentlyPlayed.map((entry) => (
              <Link
                key={entry.id}
                to={`/game/${entry.games.id}`}
                className="group relative aspect-[3/4] rounded-lg overflow-hidden bg-surface ring-1 ring-white/5 block transition-all hover:ring-accent"
              >
                {entry.games.cover_image_id ? (
                  <img
                    src={coverUrl(entry.games.cover_image_id, 'cover_big')}
                    alt={entry.games.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-text-muted p-1 text-center">
                    {entry.games.name}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center p-2 opacity-0 group-hover:opacity-100">
                  <span className="text-white text-sm font-semibold text-center leading-tight">{entry.games.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {recentReviews.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Recent reviews</h2>
            {recentReviews.length > RECENT_REVIEWS_LIMIT && (
              <Link to="../reviews" className="text-sm text-accent hover:underline">
                View all
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-4">
            {recentReviews.slice(0, RECENT_REVIEWS_LIMIT).map((entry) => (
              <ReviewCard
                key={entry.id}
                entryId={entry.id}
                game={entry.games}
                rating={entry.rating}
                review={entry.review!}
                date={entry.updated_at}
                platform={entry.platform}
                timeToFinishMinutes={entry.time_to_finish_minutes}
                isOwn={isOwnProfile}
                onEdit={() => setEditingEntry(entry)}
              />
            ))}
          </div>
        </div>
      )}

      {editingEntry && (
        <ReviewModal
          gameName={editingEntry.games.name}
          review={editingEntry.review ?? ''}
          rating={editingEntry.rating}
          favorite={editingEntry.favorite}
          timeToFinishHours={
            editingEntry.time_to_finish_minutes != null ? String(editingEntry.time_to_finish_minutes / 60) : ''
          }
          platform={editingEntry.platform ?? ''}
          platformOptions={editingEntry.platform ? [editingEntry.platform] : []}
          onClose={() => setEditingEntry(null)}
          onSave={async (changes) => {
            const hours = parseFloat(changes.timeToFinishHours)
            const timeToFinishMinutes = Number.isFinite(hours) && hours > 0 ? Math.round(hours * 60) : null
            const platform = changes.platform.trim() === '' ? null : changes.platform.trim()
            await upsertEntry({
              userId: profile.id,
              gameId: editingEntry.games.id,
              status: editingEntry.status,
              rating: changes.rating,
              review: changes.review,
              favorite: changes.favorite,
              timeToFinishMinutes,
              platform,
            })
            setEntries((prev) =>
              prev.map((e) =>
                e.id === editingEntry.id
                  ? {
                      ...e,
                      rating: changes.rating,
                      review: changes.review,
                      favorite: changes.favorite,
                      time_to_finish_minutes: timeToFinishMinutes,
                      platform,
                      updated_at: new Date().toISOString(),
                    }
                  : e,
              ),
            )
          }}
        />
      )}

      {editingSlot != null && (
        <FavoriteGamePicker
          onClose={() => setEditingSlot(null)}
          onSelect={(gameId) => handlePickFavorite(editingSlot, gameId)}
        />
      )}
    </div>
  )
}
