import { Link } from 'react-router-dom'
import type { IgdbGame } from '../types/igdb'
import { coverUrl } from '../lib/igdb'
import type { GameStats } from '../lib/games'

export function GameCard({
  game,
  stats,
  linkSuffix,
  avgPlaytimeMinutes,
}: {
  game: IgdbGame
  stats?: GameStats
  linkSuffix?: string
  avgPlaytimeMinutes?: number
}) {
  const year = game.first_release_date
    ? new Date(game.first_release_date * 1000).getFullYear()
    : null

  return (
    <Link to={`/game/${game.id}${linkSuffix ?? ''}`} className="group block">
      <div className="relative aspect-[3/4] bg-surface rounded overflow-hidden mb-2 ring-1 ring-white/5 group-hover:ring-accent transition-all">
        {game.cover ? (
          <img
            src={coverUrl(game.cover.image_id)}
            alt={game.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted text-xs px-2 text-center">
            No cover
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center p-2 opacity-0 group-hover:opacity-100">
          <span className="text-white text-sm font-semibold text-center leading-tight">{game.name}</span>
        </div>
      </div>
      <p className="text-sm font-medium leading-tight truncate">{game.name}</p>
      {year && <p className="text-xs text-text-muted">{year}</p>}
      {game.total_rating != null && (
        <p className="text-xs text-text-muted">Rating: {(game.total_rating / 10).toFixed(1)}</p>
      )}
      {avgPlaytimeMinutes != null && (
        <p className="text-xs text-text-muted">Avg playtime: {(avgPlaytimeMinutes / 60).toFixed(1)}h</p>
      )}
      {game.platforms && game.platforms.length > 0 && (
        <p className="text-[10px] text-text-muted truncate">
          Platforms: {game.platforms.map((p) => p.abbreviation ?? p.name).join(', ')}
        </p>
      )}
      {game.genres && game.genres.length > 0 && (
        <p className="text-[10px] text-text-muted truncate">
          Genre: {game.genres.map((g) => g.name).join(', ')}
        </p>
      )}
      {stats && (stats.ratingCount > 0 || stats.favoriteCount > 0 || stats.reviewCount > 0) && (
        <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
          {stats.ratingCount > 0 && (
            <span className="flex items-center gap-0.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7L5.8 21l1.6-7L2 9.2l7.1-.6z" />
              </svg>
              {stats.ratingCount}
            </span>
          )}
          {stats.favoriteCount > 0 && (
            <span className="flex items-center gap-0.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 21s-7.5-4.6-10-9.1C0.3 8.6 2 5 5.5 5c2 0 3.5 1.1 4.5 2.6C11 6.1 12.5 5 14.5 5 18 5 19.7 8.6 22 11.9 19.5 16.4 12 21 12 21z" />
              </svg>
              {stats.favoriteCount}
            </span>
          )}
          {stats.reviewCount > 0 && (
            <span className="flex items-center gap-0.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {stats.reviewCount}
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
