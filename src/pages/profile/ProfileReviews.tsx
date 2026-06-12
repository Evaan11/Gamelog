import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { getUserEntries, deleteReview, type GameEntryWithGame } from '../../lib/entries'
import { ReviewCard } from '../../components/ReviewCard'
import { useAuth } from '../../contexts/AuthContext'
import type { ProfileOutletContext } from './ProfileLayout'

const PAGE_SIZE = 10

export function ProfileReviews() {
  const { profile } = useOutletContext<ProfileOutletContext>()
  const { user } = useAuth()
  const [entries, setEntries] = useState<GameEntryWithGame[]>([])
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    getUserEntries(profile.id)
      .then((e) => {
        if (!cancelled) setEntries(e.filter((entry) => entry.review && entry.review.trim() !== ''))
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
  if (entries.length === 0) return <p className="text-text-muted">No reviews written yet.</p>

  return (
    <div className="flex flex-col gap-4">
      {entries.slice(0, visible).map((entry) => (
        <ReviewCard
          key={entry.id}
          entryId={entry.id}
          game={entry.games}
          rating={entry.rating}
          review={entry.review!}
          date={entry.updated_at}
          isOwn={user?.id === profile.id}
          onDelete={() => {
            deleteReview(profile.id, entry.games.id).then(() => {
              setEntries((e) => e.filter((entry2) => entry2.id !== entry.id))
            })
          }}
        />
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
