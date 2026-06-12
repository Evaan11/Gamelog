import { useEffect, useState } from 'react'
import { searchGames } from '../lib/igdb'
import type { IgdbGame } from '../types/igdb'
import { GameCard } from '../components/GameCard'
import { getGameStatsBatch, type GameStats } from '../lib/games'

export function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<IgdbGame[]>([])
  const [stats, setStats] = useState<Map<number, GameStats>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setSearched(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const timeout = setTimeout(() => {
      searchGames(query)
        .then((games) => {
          if (!cancelled) {
            setResults(games)
            setSearched(true)
            getGameStatsBatch(games.map((g) => g.id))
              .then((s) => {
                if (!cancelled) setStats(s)
              })
              .catch(() => {})
          }
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Search failed')
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Search games</h1>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search games..."
          className="flex-1 max-w-md mx-4 bg-surface border border-white/10 rounded px-4 py-1.5 text-sm focus:outline-none focus:border-accent"
        />
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {searched && !loading && results.length === 0 && !error && (
        <p className="text-text-muted">No games found for "{query}".</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {results.map((game) => (
          <GameCard key={game.id} game={game} stats={stats.get(game.id)} linkSuffix="?review=1" />
        ))}
      </div>
    </div>
  )
}
