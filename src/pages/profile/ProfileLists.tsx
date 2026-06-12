import { useEffect, useState, type FormEvent } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getUserLists, createList, type ListWithGames } from '../../lib/lists'
import { coverUrl } from '../../lib/igdb'
import type { ProfileOutletContext } from './ProfileLayout'

export function ProfileLists() {
  const { profile, isOwnProfile } = useOutletContext<ProfileOutletContext>()
  const { user } = useAuth()

  const [lists, setLists] = useState<ListWithGames[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)

  function load() {
    setLoading(true)
    getUserLists(profile.id)
      .then(setLists)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [profile.id])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!user || !newTitle.trim()) return
    setCreating(true)
    try {
      await createList(user.id, newTitle.trim())
      setNewTitle('')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create list')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {isOwnProfile && (
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New list title..."
            className="flex-1 bg-surface border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={creating || !newTitle.trim()}
            className="bg-accent text-bg font-semibold px-5 py-2 rounded hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {creating ? 'Creating...' : 'Create list'}
          </button>
        </form>
      )}

      {loading && <p className="text-text-muted">Loading...</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && lists.length === 0 && <p className="text-text-muted">No lists yet.</p>}

      <div className="flex flex-col gap-4">
        {lists.map((list) => (
          <Link
            key={list.id}
            to={`/list/${list.id}`}
            className="block bg-surface rounded-lg p-4 hover:bg-surface-hover transition-colors"
          >
            <h3 className="font-semibold mb-3">{list.title}</h3>
            <div className="flex gap-2 overflow-x-auto">
              {list.list_games.slice(0, 8).map(({ games: game }) => (
                <div
                  key={game.id}
                  className="w-12 h-16 bg-bg rounded overflow-hidden ring-1 ring-white/5 shrink-0"
                >
                  {game.cover_image_id ? (
                    <img
                      src={coverUrl(game.cover_image_id, 'cover_small')}
                      alt={game.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>
              ))}
              {list.list_games.length === 0 && (
                <p className="text-text-muted text-sm">Empty list</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
