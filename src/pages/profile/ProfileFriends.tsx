import { useEffect, useState, type FormEvent } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { searchProfiles, displayName, type Profile } from '../../lib/profiles'
import { follow, unfollow, getFollowing, isFollowing } from '../../lib/follows'
import type { ProfileOutletContext } from './ProfileLayout'

export function ProfileFriends() {
  const { profile, isOwnProfile } = useOutletContext<ProfileOutletContext>()
  const { user } = useAuth()

  const [following, setFollowing] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false

    getFollowing(profile.id)
      .then((f) => {
        if (!cancelled) setFollowing(f)
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

  async function handleSearch(e: FormEvent) {
    e.preventDefault()
    if (!query.trim() || !user) return
    setSearching(true)
    try {
      const profiles = await searchProfiles(query, user.id)
      setResults(profiles)
      const checks = await Promise.all(profiles.map((p) => isFollowing(user.id, p.id)))
      setFollowingIds(new Set(profiles.filter((_, i) => checks[i]).map((p) => p.id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  async function handleToggleFollow(targetId: string) {
    if (!user) return
    const alreadyFollowing = followingIds.has(targetId)
    try {
      if (alreadyFollowing) {
        await unfollow(user.id, targetId)
        setFollowingIds((prev) => {
          const next = new Set(prev)
          next.delete(targetId)
          return next
        })
      } else {
        await follow(user.id, targetId)
        setFollowingIds((prev) => new Set(prev).add(targetId))
      }
      if (isOwnProfile) {
        const f = await getFollowing(profile.id)
        setFollowing(f)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update follow')
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {isOwnProfile && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Find people</h2>
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username..."
              className="flex-1 bg-surface border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={searching}
              className="bg-accent text-bg font-semibold px-5 py-2 rounded hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {results.length > 0 && (
            <div className="flex flex-col gap-2">
              {results.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-surface rounded-lg p-3"
                >
                  <Link to={`/u/${p.username}`} className="font-medium hover:text-accent transition-colors">
                    @{p.username}
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleToggleFollow(p.id)}
                    className={`text-sm px-3 py-1.5 rounded border transition-colors cursor-pointer ${
                      followingIds.has(p.id)
                        ? 'border-white/10 text-text-muted hover:text-red-400 hover:border-red-400'
                        : 'bg-accent text-bg border-accent font-semibold'
                    }`}
                  >
                    {followingIds.has(p.id) ? 'Following' : 'Follow'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">
          {isOwnProfile ? 'Following' : `${profile.display_name ?? profile.username} follows`}
        </h2>
        {loading && <p className="text-text-muted">Loading...</p>}
        {error && <p className="text-red-400">{error}</p>}
        {!loading && following.length === 0 && (
          <p className="text-text-muted">Not following anyone yet.</p>
        )}
        <div className="flex flex-col gap-2">
          {following.map((p) => (
            <Link
              key={p.id}
              to={`/u/${p.username}`}
              className="bg-surface rounded-lg p-3 font-medium hover:bg-surface-hover transition-colors"
            >
              {displayName(p)}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
