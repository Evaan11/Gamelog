import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  getNotifications,
  getFriendsActivity,
  markNotificationsRead,
  type Notification,
  type ActivityEntry,
} from '../../lib/activity'
import { ReviewCard } from '../../components/ReviewCard'
import { deleteReview } from '../../lib/entries'
import { coverUrl } from '../../lib/igdb'
import { displayName } from '../../lib/profiles'
import { follow, unfollow, isFollowing } from '../../lib/follows'
import { useAuth } from '../../contexts/AuthContext'
import { StarRating } from '../../components/StarRating'
import type { ProfileOutletContext } from './ProfileLayout'

const STATUS_LABELS: Record<string, string> = {
  finished: 'finished',
  playing: 'started playing',
  backlog: 'added to their to-do list',
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function notificationText(n: Notification): string {
  switch (n.type) {
    case 'follow':
      return 'started following you'
    case 'like':
      return 'liked your review'
    case 'comment':
      return 'commented on your review'
    case 'price_drop':
      return ''
  }
}

const PAGE_SIZE = 15

export function ProfileActivity() {
  const { profile, isOwnProfile } = useOutletContext<ProfileOutletContext>()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [notificationsHasMore, setNotificationsHasMore] = useState(false)
  const [notificationsLoadingMore, setNotificationsLoadingMore] = useState(false)
  const [feed, setFeed] = useState<ActivityEntry[]>([])
  const [feedHasMore, setFeedHasMore] = useState(false)
  const [feedLoadingMore, setFeedLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const tasks: Promise<unknown>[] = [
      getFriendsActivity(profile.id, 0, PAGE_SIZE).then((f) => {
        if (!cancelled) {
          setFeed(f)
          setFeedHasMore(f.length === PAGE_SIZE)
        }
      }),
    ]

    if (isOwnProfile) {
      tasks.push(
        getNotifications(profile.id, 0, PAGE_SIZE).then((n) => {
          if (!cancelled) {
            setNotifications(n)
            setNotificationsHasMore(n.length === PAGE_SIZE)
            checkFollowStatus(n)
          }
        }),
      )
      markNotificationsRead(profile.id).catch(() => {})
    }

    Promise.all(tasks)
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [profile.id, isOwnProfile])

  async function loadMoreNotifications() {
    setNotificationsLoadingMore(true)
    try {
      const more = await getNotifications(profile.id, notifications.length, PAGE_SIZE)
      setNotifications((prev) => [...prev, ...more])
      setNotificationsHasMore(more.length === PAGE_SIZE)
      checkFollowStatus(more)
    } finally {
      setNotificationsLoadingMore(false)
    }
  }

  function checkFollowStatus(list: Notification[]) {
    if (!user) return
    const actorIds = [...new Set(list.filter((n) => n.type === 'follow').map((n) => n.actor.id))]
    actorIds.forEach((actorId) => {
      isFollowing(user.id, actorId).then((f) => {
        if (f) setFollowingIds((prev) => new Set(prev).add(actorId))
      })
    })
  }

  async function toggleFollowBack(actorId: string) {
    if (!user) return
    if (followingIds.has(actorId)) {
      await unfollow(user.id, actorId)
      setFollowingIds((prev) => {
        const next = new Set(prev)
        next.delete(actorId)
        return next
      })
    } else {
      await follow(user.id, actorId)
      setFollowingIds((prev) => new Set(prev).add(actorId))
    }
  }

  async function loadMoreFeed() {
    setFeedLoadingMore(true)
    try {
      const more = await getFriendsActivity(profile.id, feed.length, PAGE_SIZE)
      setFeed((prev) => [...prev, ...more])
      setFeedHasMore(more.length === PAGE_SIZE)
    } finally {
      setFeedLoadingMore(false)
    }
  }

  if (loading) return <p className="text-text-muted">Loading...</p>
  if (error) return <p className="text-red-400">{error}</p>

  return (
    <div className="flex flex-col gap-8">
      {isOwnProfile && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Notifications</h2>
          {notifications.length === 0 ? (
            <p className="text-text-muted text-sm">No notifications yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-white/5">
              {notifications.map((n) =>
                n.type === 'price_drop' && n.data ? (
                  <Link
                    key={n.id}
                    to={`/game/${n.data.game_id}`}
                    className="flex items-center gap-3 py-3 hover:bg-surface-hover transition-colors -mx-2 px-2 rounded"
                  >
                    {n.entry?.games.cover_image_id && (
                      <div className="w-14 h-20 bg-bg rounded overflow-hidden ring-1 ring-white/5 shrink-0">
                        <img
                          src={coverUrl(n.entry.games.cover_image_id, 'cover_small')}
                          alt={n.entry.games.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="w-9 h-9 rounded-full bg-surface ring-1 ring-white/10 overflow-hidden shrink-0 flex items-center justify-center text-lg">
                      🏷️
                    </div>
                    <p className="text-sm flex-1 min-w-0">
                      <span className="font-medium">{n.data.name}</span>{' '}
                      <span className="text-text-muted">is on sale on Steam:</span>{' '}
                      <span className="bg-green-500/20 text-green-400 rounded px-1.5 py-0.5 text-xs font-bold">
                        -{n.data.discountPercent}%
                      </span>{' '}
                      <span className="text-text-muted line-through text-xs">
                        {n.data.initial.toFixed(2)} {n.data.currency}
                      </span>{' '}
                      <span className="font-bold">
                        {n.data.final.toFixed(2)} {n.data.currency}
                      </span>
                    </p>
                    <span className="text-xs text-text-muted shrink-0">
                      {timeAgo(n.created_at)}
                    </span>
                  </Link>
                ) : (
                  <Link
                    key={n.id}
                    to={n.entry ? `/game/${n.entry.game_id}` : `/u/${n.actor.username}`}
                    className="flex items-center gap-3 py-3 hover:bg-surface-hover transition-colors -mx-2 px-2 rounded"
                  >
                    <div className="w-9 h-9 rounded-full bg-surface ring-1 ring-white/10 overflow-hidden shrink-0 flex items-center justify-center text-sm font-semibold">
                      {n.actor.avatar_url ? (
                        <img src={n.actor.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        n.actor.username[0]?.toUpperCase()
                      )}
                    </div>
                    <p className="text-sm flex-1 min-w-0">
                      <span className="font-medium">{displayName(n.actor)}</span>{' '}
                      <span className="text-text-muted">{notificationText(n)}</span>
                      {n.type === 'follow' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleFollowBack(n.actor.id)
                          }}
                          className={`ml-2 px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                            followingIds.has(n.actor.id)
                              ? 'bg-surface text-text-muted hover:text-text border border-white/10'
                              : 'bg-accent text-bg hover:opacity-90'
                          }`}
                        >
                          {followingIds.has(n.actor.id) ? 'Following' : 'Follow back'}
                        </button>
                      )}{' '}
                      <span className="text-xs text-text-muted">{timeAgo(n.created_at)}</span>
                    </p>
                    {n.entry?.games.cover_image_id && (
                      <div className="w-8 h-11 bg-bg rounded overflow-hidden ring-1 ring-white/5 shrink-0">
                        <img
                          src={coverUrl(n.entry.games.cover_image_id, 'cover_small')}
                          alt={n.entry.games.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </Link>
                ),
              )}
            </div>
          )}
          {notificationsHasMore && (
            <button
              type="button"
              onClick={loadMoreNotifications}
              disabled={notificationsLoadingMore}
              className="mt-3 text-sm text-accent hover:underline cursor-pointer disabled:opacity-50"
            >
              {notificationsLoadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">Friends Activity</h2>
        {feed.length === 0 ? (
          <p className="text-text-muted text-sm">
            {isOwnProfile ? 'Follow people to see their activity here.' : 'No recent activity.'}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {feed.map((entry) =>
              entry.review && entry.review.trim() !== '' ? (
                <ReviewCard
                  key={entry.id}
                  entryId={entry.id}
                  game={entry.games}
                  rating={entry.rating}
                  review={entry.review}
                  date={entry.updated_at}
                  author={entry.profiles}
                  isOwn={user?.id === entry.user_id}
                  onDelete={() => {
                    deleteReview(entry.user_id, entry.games.id).then(() => {
                      setFeed((f) => f.filter((e) => e.id !== entry.id))
                    })
                  }}
                />
              ) : (
                <Link
                  key={entry.id}
                  to={`/game/${entry.games.id}`}
                  className="flex items-center gap-4 p-3 bg-surface rounded-lg hover:bg-surface-hover transition-colors"
                >
                  <div className="w-10 h-14 bg-bg rounded overflow-hidden ring-1 ring-white/5 shrink-0">
                    {entry.games.cover_image_id ? (
                      <img
                        src={coverUrl(entry.games.cover_image_id, 'cover_small')}
                        alt={entry.games.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <Link to={`/u/${entry.profiles.username}`} className="font-medium hover:text-accent transition-colors">
                        {displayName(entry.profiles)}
                      </Link>{' '}
                      <span className="text-text-muted">{STATUS_LABELS[entry.status] ?? entry.status}</span>{' '}
                      <span className="font-medium">{entry.games.name}</span>
                    </p>
                    {entry.rating != null && <StarRating value={entry.rating} readOnly size={14} />}
                  </div>
                  <span className="text-xs text-text-muted shrink-0">
                    {new Date(entry.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </Link>
              ),
            )}
          </div>
        )}
        {feedHasMore && (
          <button
            type="button"
            onClick={loadMoreFeed}
            disabled={feedLoadingMore}
            className="mt-3 text-sm text-accent hover:underline cursor-pointer disabled:opacity-50"
          >
            {feedLoadingMore ? 'Loading...' : 'Load more'}
          </button>
        )}
      </section>
    </div>
  )
}
