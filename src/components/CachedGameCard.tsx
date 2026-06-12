import { Link } from 'react-router-dom'
import { coverUrl } from '../lib/igdb'
import type { CachedGame } from '../lib/entries'
import { StarRating } from './StarRating'
import { HeartButton } from './HeartButton'

interface CachedGameCardProps {
  game: CachedGame
  rating?: number | null
  favorite?: boolean
  hasReview?: boolean
}

export function CachedGameCard({ game, rating, favorite, hasReview }: CachedGameCardProps) {
  const year = game.first_release_date ? new Date(game.first_release_date).getFullYear() : null

  return (
    <Link to={`/game/${game.id}`} className="group block">
      <div className="aspect-[3/4] bg-surface rounded overflow-hidden mb-2 ring-1 ring-white/5 group-hover:ring-accent transition-all">
        {game.cover_image_id ? (
          <img
            src={coverUrl(game.cover_image_id)}
            alt={game.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted text-xs px-2 text-center">
            No cover
          </div>
        )}
      </div>
      <p className="text-sm font-medium leading-tight truncate">{game.name}</p>
      {year && <p className="text-xs text-text-muted">{year}</p>}
      {(rating != null || favorite || hasReview) && (
        <div className="flex items-center gap-2 mt-1">
          {rating != null && <StarRating value={rating} readOnly size={12} />}
          {favorite && <HeartButton active readOnly size={12} />}
          {hasReview && (
            <svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              className="text-text-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          )}
        </div>
      )}
    </Link>
  )
}
