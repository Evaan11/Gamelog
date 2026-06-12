import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { getUserEntries, type GameEntryWithGame } from '../../lib/entries'
import { CachedGameCard } from '../../components/CachedGameCard'
import type { ProfileOutletContext } from './ProfileLayout'

export function ProfileWishlist() {
  const { profile } = useOutletContext<ProfileOutletContext>()
  const [entries, setEntries] = useState<GameEntryWithGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    getUserEntries(profile.id)
      .then((e) => {
        if (!cancelled) setEntries(e.filter((entry) => entry.status === 'wishlist'))
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
  if (entries.length === 0) return <p className="text-text-muted">No games on the wishlist yet.</p>

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
      {entries.map((entry) => (
        <CachedGameCard key={entry.id} game={entry.games} />
      ))}
    </div>
  )
}
