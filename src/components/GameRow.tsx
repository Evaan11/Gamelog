import { Link } from 'react-router-dom'
import { coverUrl } from '../lib/igdb'
import type { GameEntryWithGame } from '../lib/entries'
import { StarRating } from './StarRating'
import { HeartButton } from './HeartButton'

export function GameRow({ entry }: { entry: GameEntryWithGame }) {
  const { games: game } = entry
  const year = game.first_release_date ? new Date(game.first_release_date).getFullYear() : null
  const hours = entry.playtime_minutes != null ? Math.round(entry.playtime_minutes / 6) / 10 : null

  return (
    <Link
      to={`/game/${game.id}`}
      className="flex items-center gap-3 bg-surface rounded-lg p-3 hover:bg-surface-hover transition-colors"
    >
      <div className="w-12 h-16 bg-bg rounded overflow-hidden ring-1 ring-white/5 shrink-0">
        {game.cover_image_id ? (
          <img
            src={coverUrl(game.cover_image_id, 'cover_small')}
            alt={game.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{game.name}</p>
        {year && <p className="text-xs text-text-muted">{year}</p>}
        {entry.review && <p className="text-sm text-text-muted line-clamp-2 mt-1">{entry.review}</p>}
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {hours != null && <span className="text-xs text-text-muted">{hours}h</span>}
        {entry.favorite && <HeartButton active readOnly size={16} />}
        {entry.rating != null && <StarRating value={entry.rating} readOnly size={16} />}
      </div>
    </Link>
  )
}
