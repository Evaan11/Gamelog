import { useEffect, useState } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getList, deleteList, removeGameFromList, type ListWithGames } from '../lib/lists'
import { CachedGameCard } from '../components/CachedGameCard'
import { getProfile, displayName, type Profile } from '../lib/profiles'

export function ListDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()

  const [list, setList] = useState<ListWithGames | null>(null)
  const [owner, setOwner] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleted, setDeleted] = useState(false)

  function load() {
    if (!id) return
    setLoading(true)
    getList(id)
      .then(async (l) => {
        setList(l)
        if (l) setOwner(await getProfile(l.user_id))
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  async function handleDeleteList() {
    if (!list) return
    if (!confirm(`Delete the list "${list.title}"?`)) return
    await deleteList(list.id)
    setDeleted(true)
  }

  async function handleRemoveGame(gameId: number) {
    if (!list) return
    await removeGameFromList(list.id, gameId)
    load()
  }

  if (deleted) return <Navigate to="/profile" replace />
  if (loading) return <div className="max-w-6xl mx-auto px-4 py-10 text-text-muted">Loading...</div>
  if (error) return <div className="max-w-6xl mx-auto px-4 py-10 text-red-400">{error}</div>
  if (!list) return <div className="max-w-6xl mx-auto px-4 py-10 text-text-muted">List not found.</div>

  const isOwner = user?.id === list.user_id

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold">{list.title}</h1>
        {isOwner && (
          <button
            type="button"
            onClick={handleDeleteList}
            className="text-sm text-text-muted hover:text-red-400 transition-colors cursor-pointer"
          >
            Delete list
          </button>
        )}
      </div>
      {owner && (
        <p className="text-text-muted mb-8">
          by{' '}
          <Link to={`/u/${owner.username}`} className="text-accent">
            {displayName(owner)}
          </Link>
        </p>
      )}

      {list.list_games.length === 0 ? (
        <p className="text-text-muted">This list is empty.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {list.list_games.map(({ games: game }) => (
            <div key={game.id} className="relative">
              <CachedGameCard game={game} />
              {isOwner && (
                <button
                  type="button"
                  onClick={() => handleRemoveGame(game.id)}
                  className="absolute top-1 right-1 bg-bg/80 text-text-muted hover:text-red-400 rounded px-1.5 py-0.5 text-xs cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
