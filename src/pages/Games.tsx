import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { browseGames, searchGames, type BrowseSort } from '../lib/igdb'
import { GENRES, THEMES, PLATFORMS } from '../lib/filters'
import { StarRating } from '../components/StarRating'
import type { IgdbGame } from '../types/igdb'
import { GameCard } from '../components/GameCard'
import { getGameStatsBatch, type GameStats } from '../lib/games'

const SORT_LABELS: Record<BrowseSort, string> = {
  popular: 'Most popular',
  alphabetical: 'Alphabetical',
  top_rated: 'Top rated',
}

const SORT_OPTIONS: BrowseSort[] = ['popular', 'alphabetical', 'top_rated']
const PAGE_SIZE = 50

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: { id: number; name: string }[]
  selected: number[]
  onChange: (ids: number[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function toggle(id: number) {
    if (selected.includes(id)) onChange(selected.filter((s) => s !== id))
    else onChange([...selected, id])
  }

  const buttonLabel = selected.length > 0 ? `${label} (${selected.length})` : label

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-40 text-left bg-surface border border-white/10 rounded text-sm px-3 py-1.5 text-text-muted hover:text-text focus:outline-none focus:border-accent cursor-pointer truncate"
      >
        {buttonLabel}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-56 max-h-64 overflow-y-auto bg-surface border border-white/10 rounded shadow-lg p-1">
          {options.map((opt) => (
            <label
              key={opt.id}
              className="flex items-center gap-2 px-2 py-1 text-sm text-text-muted hover:text-text rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.id)}
                onChange={() => toggle(opt.id)}
                className="cursor-pointer"
              />
              {opt.name}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export function Games() {
  const [searchParams] = useSearchParams()
  const urlGenreId = searchParams.get('genreId') ? Number(searchParams.get('genreId')) : undefined
  const urlThemeId = searchParams.get('themeId') ? Number(searchParams.get('themeId')) : undefined
  const urlPlatformId = searchParams.get('platformId') ? Number(searchParams.get('platformId')) : undefined
  const [sort, setSort] = useState<BrowseSort>('popular')
  const [genreIds, setGenreIds] = useState<number[]>(urlGenreId != null ? [urlGenreId] : [])
  const [themeIds, setThemeIds] = useState<number[]>(urlThemeId != null ? [urlThemeId] : [])
  const [platformIds, setPlatformIds] = useState<number[]>(urlPlatformId != null ? [urlPlatformId] : [])
  const [minRating, setMinRating] = useState<number | undefined>(undefined)
  const [page, setPage] = useState(0)
  const [games, setGames] = useState<IgdbGame[]>([])
  const [stats, setStats] = useState<Map<number, GameStats>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeQuery, setActiveQuery] = useState('')

  useEffect(() => {
    if (urlGenreId != null) setGenreIds((ids) => (ids.includes(urlGenreId) ? ids : [...ids, urlGenreId]))
    setPage(0)
  }, [urlGenreId])

  useEffect(() => {
    if (urlThemeId != null) setThemeIds((ids) => (ids.includes(urlThemeId) ? ids : [...ids, urlThemeId]))
    setPage(0)
  }, [urlThemeId])

  useEffect(() => {
    if (urlPlatformId != null) setPlatformIds((ids) => (ids.includes(urlPlatformId) ? ids : [...ids, urlPlatformId]))
    setPage(0)
  }, [urlPlatformId])

  useEffect(() => {
    if (!query.trim()) {
      setActiveQuery('')
      return
    }
    const timeout = setTimeout(() => {
      setPage(0)
      setActiveQuery(query)
    }, 300)
    return () => clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const request = activeQuery.trim()
      ? searchGames(activeQuery)
      : browseGames(sort, page * PAGE_SIZE, { genreIds, themeIds, platformIds, minRating })

    request
      .then((g) => {
        if (!cancelled) {
          setGames(g)
          getGameStatsBatch(g.map((game) => game.id))
            .then((s) => {
              if (!cancelled) setStats(s)
            })
            .catch(() => {})
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load games')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [sort, page, activeQuery, genreIds, themeIds, platformIds, minRating])

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Games</h1>

        <div className="relative flex-1 max-w-xs mx-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games..."
            className="w-full bg-surface border border-white/10 rounded px-4 py-1.5 pr-9 text-sm focus:outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => {
              setPage(0)
              setActiveQuery(query)
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer"
            aria-label="Search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
        </div>
      </div>

      {!activeQuery && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as BrowseSort)
              setPage(0)
            }}
            className="w-40 bg-surface border border-white/10 rounded text-sm px-3 py-1.5 text-text-muted hover:text-text focus:outline-none focus:border-accent cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {SORT_LABELS[opt]}
              </option>
            ))}
          </select>

          <MultiSelect
            label="All genres"
            options={GENRES}
            selected={genreIds}
            onChange={(ids) => {
              setGenreIds(ids)
              setPage(0)
            }}
          />

          <MultiSelect
            label="All tags"
            options={THEMES}
            selected={themeIds}
            onChange={(ids) => {
              setThemeIds(ids)
              setPage(0)
            }}
          />

          <MultiSelect
            label="All platforms"
            options={PLATFORMS}
            selected={platformIds}
            onChange={(ids) => {
              setPlatformIds(ids)
              setPage(0)
            }}
          />

          <div className="w-48 flex items-center gap-1.5 bg-surface border border-white/10 rounded text-sm px-3 py-1.5 whitespace-nowrap">
            <span className="text-text-muted">Min rating:</span>
            <StarRating
              value={minRating ? minRating / 10 : null}
              onChange={(v) => {
                setMinRating(v ? v * 10 : undefined)
                setPage(0)
              }}
              size={16}
            />
          </div>

          {(genreIds.length > 0 || themeIds.length > 0 || platformIds.length > 0 || minRating != null) && (
            <Link
              to="/games"
              onClick={() => {
                setGenreIds([])
                setThemeIds([])
                setPlatformIds([])
                setMinRating(undefined)
                setPage(0)
              }}
              className="text-xs text-text-muted hover:text-text transition-colors"
            >
              Clear filters
            </Link>
          )}
        </div>
      )}

      {!activeQuery && (genreIds.length > 0 || themeIds.length > 0 || platformIds.length > 0) && (
        <div className="flex items-center gap-2 mb-6 flex-wrap -mt-4">
          {genreIds.map((id) => (
            <span
              key={`genre-${id}`}
              className="flex items-center gap-1.5 text-xs bg-surface border border-white/10 rounded-full pl-2.5 pr-1.5 py-1 text-text-muted"
            >
              {GENRES.find((g) => g.id === id)?.name ?? id}
              <button
                type="button"
                onClick={() => {
                  setGenreIds((ids) => ids.filter((i) => i !== id))
                  setPage(0)
                }}
                className="hover:text-text cursor-pointer"
              >
                ✕
              </button>
            </span>
          ))}
          {themeIds.map((id) => (
            <span
              key={`theme-${id}`}
              className="flex items-center gap-1.5 text-xs bg-surface border border-white/10 rounded-full pl-2.5 pr-1.5 py-1 text-text-muted"
            >
              {THEMES.find((t) => t.id === id)?.name ?? id}
              <button
                type="button"
                onClick={() => {
                  setThemeIds((ids) => ids.filter((i) => i !== id))
                  setPage(0)
                }}
                className="hover:text-text cursor-pointer"
              >
                ✕
              </button>
            </span>
          ))}
          {platformIds.map((id) => (
            <span
              key={`platform-${id}`}
              className="flex items-center gap-1.5 text-xs bg-surface border border-white/10 rounded-full pl-2.5 pr-1.5 py-1 text-text-muted"
            >
              {PLATFORMS.find((p) => p.id === id)?.name ?? id}
              <button
                type="button"
                onClick={() => {
                  setPlatformIds((ids) => ids.filter((i) => i !== id))
                  setPage(0)
                }}
                className="hover:text-text cursor-pointer"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {loading ? (
        <p className="text-text-muted">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {games.map((game) => (
            <GameCard key={game.id} game={game} stats={stats.get(game.id)} />
          ))}
        </div>
      )}

      {!activeQuery && (
        <div className="flex items-center justify-center gap-1 mt-8">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
            className="px-3 py-1.5 rounded text-sm border border-white/10 text-text-muted hover:text-text hover:border-white/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Previous
          </button>
          {Array.from({ length: 5 }, (_, i) => Math.max(0, page - 2) + i).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              disabled={loading}
              className={`w-8 h-8 rounded text-sm border transition-colors cursor-pointer disabled:cursor-not-allowed ${
                page === p
                  ? 'bg-accent text-bg border-accent font-semibold'
                  : 'border-white/10 text-text-muted hover:text-text hover:border-white/30'
              }`}
            >
              {p + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={loading || games.length < PAGE_SIZE}
            className="px-3 py-1.5 rounded text-sm border border-white/10 text-text-muted hover:text-text hover:border-white/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
