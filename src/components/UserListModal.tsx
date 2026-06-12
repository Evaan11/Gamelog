import { Link } from 'react-router-dom'
import { StarRating } from './StarRating'
import { displayName } from '../lib/profiles'
import type { GameEntryUser } from '../lib/games'

interface UserListModalProps {
  title: string
  users: GameEntryUser[]
  loading: boolean
  onClose: () => void
}

export function UserListModal({ title, users, loading, onClose }: UserListModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-lg w-full max-w-sm max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text transition-colors cursor-pointer">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto divide-y divide-white/5">
          {loading ? (
            <p className="text-text-muted text-sm p-4">Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-text-muted text-sm p-4">No users yet.</p>
          ) : (
            users.map(({ profile, rating }) => (
              <Link
                key={profile.id}
                to={`/u/${profile.username}`}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-bg overflow-hidden ring-1 ring-white/10 shrink-0">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <span className="text-sm flex-1 truncate">{displayName(profile)}</span>
                {rating != null && <StarRating value={rating} readOnly size={14} />}
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
