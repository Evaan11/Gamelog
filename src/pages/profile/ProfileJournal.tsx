import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { getUserEntries, type GameEntryWithGame, type GameStatus } from '../../lib/entries'
import { coverUrl } from '../../lib/igdb'
import { StarRating } from '../../components/StarRating'
import { HeartButton } from '../../components/HeartButton'
import type { ProfileOutletContext } from './ProfileLayout'

const STATUS_LABELS: Record<GameStatus, string> = {
  finished: 'Finished',
  playing: 'Playing',
  backlog: 'To do',
  wishlist: 'Wishlist',
}

const PAGE_SIZE = 20

export function ProfileJournal() {
  const { profile } = useOutletContext<ProfileOutletContext>()
  const [entries, setEntries] = useState<GameEntryWithGame[]>([])
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    getUserEntries(profile.id)
      .then((e) => {
        if (!cancelled) {
          setEntries(
            [...e].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
          )
        }
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
  if (entries.length === 0) return <p className="text-text-muted">No entries logged yet.</p>

  const groups: { label: string; entries: GameEntryWithGame[] }[] = []
  for (const entry of entries.slice(0, visible)) {
    const date = new Date(entry.created_at)
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    let group = groups.find((g) => g.label === label)
    if (!group) {
      group = { label, entries: [] }
      groups.push(group)
    }
    group.entries.push(entry)
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.label}>
          <h2 className="text-lg font-semibold mb-3">{group.label}</h2>
          <div className="flex flex-col divide-y divide-white/5">
            {group.entries.map((entry) => {
              const day = new Date(entry.created_at).getDate()
              return (
                <Link
                  key={entry.id}
                  to={`/game/${entry.games.id}`}
                  className="flex items-center gap-4 py-3 hover:bg-surface-hover transition-colors -mx-2 px-2 rounded"
                >
                  <span className="w-6 text-text-muted text-sm shrink-0">{day}</span>
                  <div className="w-10 h-14 bg-surface rounded overflow-hidden ring-1 ring-white/5 shrink-0">
                    {entry.games.cover_image_id ? (
                      <img
                        src={coverUrl(entry.games.cover_image_id, 'cover_small')}
                        alt={entry.games.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{entry.games.name}</p>
                    {entry.rating != null && <StarRating value={entry.rating} readOnly size={14} />}
                  </div>
                  {entry.favorite && <HeartButton active readOnly size={16} />}
                  <span className="text-text-muted text-sm shrink-0">{STATUS_LABELS[entry.status]}</span>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
      {visible < entries.length && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
          className="text-sm text-accent hover:underline cursor-pointer self-start"
        >
          Load more
        </button>
      )}
    </div>
  )
}
