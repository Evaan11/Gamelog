import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { getUserEntries, type GameEntryWithGame, type GameStatus } from '../../lib/entries'
import { CachedGameCard } from '../../components/CachedGameCard'
import type { ProfileOutletContext } from './ProfileLayout'

const STATUS_LABELS: Record<GameStatus, string> = {
  playing: 'Playing',
  finished: 'Finished',
  backlog: 'To do',
  wishlist: 'Wishlist',
}

const STATUS_ORDER: GameStatus[] = ['playing', 'finished', 'backlog', 'wishlist']
const PAGE_SIZE = 24

type SortOption = 'alphabetical' | 'most_played'

const SORT_LABELS: Record<SortOption, string> = {
  alphabetical: 'Alphabetical',
  most_played: 'Most played',
}

const SORT_OPTIONS: SortOption[] = ['alphabetical', 'most_played']

export function ProfileGames() {
  const { profile } = useOutletContext<ProfileOutletContext>()
  const [entries, setEntries] = useState<GameEntryWithGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<GameStatus | null>(null)
  const [sort, setSort] = useState<SortOption>('alphabetical')
  const [page, setPage] = useState(0)

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

    return () => {
      cancelled = true
    }
  }, [profile.id])

  if (loading) return <p className="text-text-muted">Loading...</p>
  if (error) return <p className="text-red-400">{error}</p>
  if (entries.length === 0) return <p className="text-text-muted">No games logged yet.</p>

  const filtered = filter ? entries.filter((e) => e.status === filter) : entries

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'most_played':
        return (b.playtime_minutes ?? 0) - (a.playtime_minutes ?? 0)
      case 'alphabetical':
      default:
        return a.games.name.localeCompare(b.games.name)
    }
  })

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)

  return (
    <div>
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <p className="text-text-muted text-sm">{entries.length} Games</p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => {
              setFilter(null)
              setPage(0)
            }}
            className={`px-3 py-1.5 rounded text-sm border transition-colors cursor-pointer ${
              filter === null
                ? 'bg-accent text-bg border-accent font-semibold'
                : 'border-white/10 text-text-muted hover:text-text hover:border-white/30'
            }`}
          >
            All
          </button>
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setFilter(s)
                setPage(0)
              }}
              className={`px-3 py-1.5 rounded text-sm border transition-colors cursor-pointer ${
                filter === s
                  ? 'bg-accent text-bg border-accent font-semibold'
                  : 'border-white/10 text-text-muted hover:text-text hover:border-white/30'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as SortOption)
            setPage(0)
          }}
          className="ml-auto bg-surface border border-white/10 rounded text-sm px-3 py-1.5 text-text-muted hover:text-text focus:outline-none focus:border-accent cursor-pointer"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {SORT_LABELS[opt]}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-text-muted">No games in this category.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((entry) => (
              <CachedGameCard
                key={entry.id}
                game={entry.games}
                rating={entry.rating}
                favorite={entry.favorite}
                hasReview={!!entry.review?.trim()}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-6">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i)}
                  className={`w-8 h-8 rounded text-sm border transition-colors cursor-pointer ${
                    page === i
                      ? 'bg-accent text-bg border-accent font-semibold'
                      : 'border-white/10 text-text-muted hover:text-text hover:border-white/30'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
