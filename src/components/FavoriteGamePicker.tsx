import { useEffect, useState } from 'react'
import { searchGames } from '../lib/igdb'
import { ensureGameCached } from '../lib/entries'
import { coverUrl } from '../lib/igdb'
import type { IgdbGame } from '../types/igdb'

interface FavoriteGamePickerProps {
  onClose: () => void
  onSelect: (gameId: number) => Promise<void>
}

export function FavoriteGamePicker({ onClose, onSelect }: FavoriteGamePickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<IgdbGame[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    let cancelled = false
    setLoading(true)
    const timeout = setTimeout(() => {
      searchGames(query)
        .then((games) => {
          if (!cancelled) setResults(games)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [query])

  async function handlePick(game: IgdbGame) {
    setSaving(true)
    try {
      await ensureGameCached(game)
      await onSelect(game.id)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface rounded-lg w-full max-w-md p-5 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-3">Choose a favorite game</h2>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search games..."
          autoFocus
          className="w-full bg-bg rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-accent mb-3"
        />
        <div className="overflow-y-auto flex flex-col gap-1 flex-1">
          {loading && <p className="text-text-muted text-sm">Searching...</p>}
          {!loading &&
            results.map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => handlePick(game)}
                disabled={saving}
                className="flex items-center gap-3 text-left px-2 py-2 rounded hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <div className="w-8 h-11 bg-bg rounded overflow-hidden shrink-0 ring-1 ring-white/5">
                  {game.cover?.image_id && (
                    <img src={coverUrl(game.cover.image_id, 'cover_small')} alt={game.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <span className="text-sm">{game.name}</span>
              </button>
            ))}
        </div>
        <button type="button" onClick={onClose} className="mt-3 text-sm text-text-muted hover:text-text transition-colors cursor-pointer self-start">
          Cancel
        </button>
      </div>
    </div>
  )
}
