import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { coverUrl } from '../lib/igdb'
import { StarRating } from './StarRating'
import { LikeButton } from './LikeButton'
import { ReportModal } from './ReportModal'
import { useAuth } from '../contexts/AuthContext'
import { reportReview } from '../lib/moderation'
import {
  getReviewLikes,
  getReviewComments,
  likeReview,
  unlikeReview,
  addReviewComment,
  updateReviewComment,
  deleteReviewComment,
  type ReviewComment,
} from '../lib/activity'
import type { CachedGame } from '../lib/entries'
import { displayName, type Profile } from '../lib/profiles'

interface ReviewCardProps {
  entryId: string
  game: CachedGame
  rating: number | null
  review: string
  date: string
  author?: Profile
  platform?: string | null
  timeToFinishMinutes?: number | null
  likeCount?: number
  isOwn?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export function ReviewCard({
  entryId,
  game,
  rating,
  review,
  date,
  author,
  platform,
  timeToFinishMinutes,
  likeCount: initialLikeCount,
  isOwn,
  onEdit,
  onDelete,
}: ReviewCardProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [likeCount, setLikeCount] = useState(initialLikeCount ?? 0)
  const [liked, setLiked] = useState(false)
  const [comments, setComments] = useState<ReviewComment[]>([])
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    let cancelled = false
    getReviewLikes(entryId).then(({ count, userIds }) => {
      if (cancelled) return
      setLikeCount(count)
      setLiked(user ? userIds.includes(user.id) : false)
    })
    getReviewComments(entryId).then((c) => {
      if (!cancelled) setComments(c)
    })
    return () => {
      cancelled = true
    }
  }, [entryId, user])

  async function toggleLike() {
    if (!user) return
    if (liked) {
      setLiked(false)
      setLikeCount((c) => c - 1)
      await unlikeReview(user.id, entryId)
    } else {
      setLiked(true)
      setLikeCount((c) => c + 1)
      await likeReview(user.id, entryId)
    }
  }

  async function submitComment() {
    if (!user || !newComment.trim()) return
    await addReviewComment(entryId, user.id, newComment.trim())
    setNewComment('')
    const updated = await getReviewComments(entryId)
    setComments(updated)
  }

  async function saveCommentEdit(commentId: string) {
    if (!user || !editContent.trim()) return
    await updateReviewComment(commentId, user.id, editContent.trim())
    setEditingCommentId(null)
    const updated = await getReviewComments(entryId)
    setComments(updated)
  }

  async function removeComment(commentId: string) {
    if (!user) return
    await deleteReviewComment(commentId, user.id)
    setComments((c) => c.filter((comment) => comment.id !== commentId))
  }

  return (
    <div
      onClick={() => navigate(`/game/${game.id}?highlight=${entryId}`)}
      className="relative bg-surface rounded-lg p-4 flex gap-4 hover:bg-surface-hover transition-colors cursor-pointer"
    >
      <div className="absolute top-3 right-3 flex items-center gap-1 shrink-0 z-10">
        {isOwn && onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            aria-label="Edit review"
            className="text-text-muted hover:text-text transition-colors cursor-pointer px-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        )}
        {user && (
          <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="More options"
              className="text-text-muted hover:text-text transition-colors cursor-pointer px-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-surface border border-white/10 rounded shadow-lg overflow-hidden z-20">
                {isOwn && onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onDelete()
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-text-muted hover:bg-white/5 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    Delete review
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    setShowReportModal(true)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-text-muted hover:bg-white/5 hover:text-text transition-colors cursor-pointer"
                >
                  Report review
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="shrink-0">
        <div className="w-16 h-24 bg-bg rounded overflow-hidden ring-1 ring-white/5">
          {game.cover_image_id ? (
            <img
              src={coverUrl(game.cover_image_id, 'cover_small')}
              alt={game.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : null}
        </div>
      </div>
      <div className="min-w-0 flex-1 pr-12">
        <div className="flex items-center justify-between gap-2">
          {author && (
            <Link
              to={`/u/${author.username}`}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 text-sm text-text-muted hover:text-text transition-colors"
            >
              {displayName(author)}
            </Link>
          )}
        </div>
        <div>
          <span className="font-semibold">{game.name}</span>
        </div>
        <div className="flex items-center gap-2 my-1">
          {rating != null && <StarRating value={rating} readOnly size={14} />}
          <span className="text-xs text-text-muted">
            {new Date(date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
        {(platform || timeToFinishMinutes != null) && (
          <div className="flex items-center gap-2 mb-1 text-xs text-text-muted">
            {platform && (
              <span className="bg-bg border border-white/10 rounded px-1.5 py-0.5">{platform}</span>
            )}
            {timeToFinishMinutes != null && (
              <span>Finished in {Math.round((timeToFinishMinutes / 60) * 10) / 10}h</span>
            )}
          </div>
        )}
        <p className="text-sm text-text-muted whitespace-pre-wrap">{review}</p>

        <div className="flex items-center gap-4 mt-2" onClick={(e) => e.stopPropagation()}>
          <LikeButton active={liked} count={likeCount} onToggle={toggleLike} />
          <button
            type="button"
            onClick={() => setShowComments((s) => !s)}
            className="text-xs text-text-muted hover:text-text transition-colors cursor-pointer"
          >
            {comments.length > 0 ? `${comments.length} comments` : 'Comment'}
          </button>
        </div>

        {showComments && (
          <div className="mt-3 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            {comments.map((c) => (
              <div key={c.id} className="text-sm">
                {editingCommentId === c.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveCommentEdit(c.id)
                        if (e.key === 'Escape') setEditingCommentId(null)
                      }}
                      autoFocus
                      className="flex-1 bg-bg rounded px-2 py-1 text-sm border border-white/10 focus:outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => saveCommentEdit(c.id)}
                      className="text-xs text-accent hover:underline cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCommentId(null)}
                      className="text-xs text-text-muted hover:text-text cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2 group">
                    <p>
                      <Link to={`/u/${c.profiles.username}`} className="font-medium hover:text-accent transition-colors">
                        {displayName(c.profiles)}
                      </Link>{' '}
                      <span className="text-text-muted">{c.content}</span>
                    </p>
                    {user?.id === c.user_id && (
                      <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCommentId(c.id)
                            setEditContent(c.content)
                          }}
                          className="text-xs text-text-muted hover:text-text cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeComment(c.id)}
                          className="text-xs text-text-muted hover:text-red-400 cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {user && (
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitComment()
                  }}
                  placeholder="Add a comment..."
                  className="flex-1 bg-bg rounded px-3 py-1.5 text-sm border border-white/10 focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={submitComment}
                  className="px-3 py-1.5 text-sm rounded bg-accent text-bg font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {showReportModal && (
        <div onClick={(e) => e.stopPropagation()}>
          <ReportModal
            title="Report review"
            onClose={() => setShowReportModal(false)}
            onSubmit={(reason) => reportReview(user!.id, entryId, reason)}
          />
        </div>
      )}
    </div>
  )
}

