import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getUserLists,
  createList,
  addGameToList,
  removeGameFromList,
  type ListWithGames,
} from '../lib/lists'
import { ensureGameCached } from '../lib/entries'
import type { IgdbGame } from '../types/igdb'

export function AddToListMenu({ game }: { game: IgdbGame }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [lists, setLists] = useState<ListWithGames[]>([])
  const [loading, setLoading] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function load() {
    if (!user) return
    setLoading(true)
    getUserLists(user.id)
      .then(setLists)
      .finally(() => setLoading(false))
  }

  function toggleOpen() {
    if (!open) load()
    setOpen((o) => !o)
  }

  async function handleToggleGame(list: ListWithGames) {
    const inList = list.list_games.some((lg) => lg.game_id === game.id)
    if (inList) {
      await removeGameFromList(list.id, game.id)
    } else {
      await ensureGameCached(game)
      await addGameToList(list.id, game.id)
    }
    load()
  }

  async function handleCreate() {
    if (!user || !newTitle.trim()) return
    await createList(user.id, newTitle.trim())
    setNewTitle('')
    load()
  }

  if (!user) return null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggleOpen}
        className="border border-white/10 text-sm px-3 py-1.5 rounded hover:border-white/30 transition-colors cursor-pointer"
      >
        + Add to list
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-64 bg-surface border border-white/10 rounded-lg p-3 shadow-lg">
          {loading && <p className="text-text-muted text-sm">Loading...</p>}
          {!loading && lists.length === 0 && (
            <p className="text-text-muted text-sm mb-2">No lists yet.</p>
          )}
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto mb-2">
            {lists.map((list) => {
              const inList = list.list_games.some((lg) => lg.game_id === game.id)
              return (
                <label
                  key={list.id}
                  className="flex items-center gap-2 text-sm px-2 py-1.5 rounded hover:bg-surface-hover cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={inList}
                    onChange={() => handleToggleGame(list)}
                    className="accent-accent"
                  />
                  {list.title}
                </label>
              )
            })}
          </div>
          <div className="flex gap-2 border-t border-white/10 pt-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New list..."
              className="flex-1 bg-bg border border-white/10 rounded px-2 py-1 text-sm focus:outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newTitle.trim()}
              className="text-accent text-sm font-semibold disabled:opacity-50 cursor-pointer"
            >
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
