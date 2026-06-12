import { useEffect, useMemo, useState, type JSX } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getGame, coverUrl, getSteamAppIdForGame } from '../lib/igdb'
import { ensureGameCached, getEntry, upsertEntry, deleteEntry, type GameStatus } from '../lib/entries'
import { getGameStats, getGameDetailStats, getGameReviews, getGameEntryUsers, type GameStats, type GameDetailStats, type GameReview, type GameEntryUser } from '../lib/games'
import { getFollowing } from '../lib/follows'
import { UserListModal } from '../components/UserListModal'
import { ReviewModal } from '../components/ReviewModal'
import { getProfile } from '../lib/profiles'
import { getSteamLibrary, getSteamPrice, type SteamPrice } from '../lib/steam'
import { StarRating } from '../components/StarRating'
import { HeartButton } from '../components/HeartButton'
import { AddToListMenu } from '../components/AddToListMenu'
import { ReviewCard } from '../components/ReviewCard'
import type { IgdbGame } from '../types/igdb'

const STATUS_LABELS: Partial<Record<GameStatus, string>> = {
  playing: 'Playing',
  finished: 'Finished',
  backlog: 'To do',
  wishlist: 'Wishlist',
}

const STATUS_OPTIONS: GameStatus[] = ['playing', 'finished', 'backlog', 'wishlist']

const STATUS_ICONS: Partial<Record<GameStatus, JSX.Element>> = {
  playing: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="6" />
      <circle cx="8" cy="12" r="1.5" fill="currentColor" />
      <circle cx="16" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),
  finished: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  backlog: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  ),
  wishlist: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
      <path d="M12 8c-1.5-3-5-3-5-1s2 1 5 1zM12 8c1.5-3 5-3 5-1s-2 1-5 1z" />
    </svg>
  ),
}

export function GameDetail() {
  const { id } = useParams<{ id: string }>()
  const gameId = Number(id)
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [game, setGame] = useState<IgdbGame | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [status, setStatus] = useState<GameStatus | ''>('')
  const [rating, setRating] = useState<number | null>(null)
  const [review, setReview] = useState('')
  const [favorite, setFavorite] = useState(false)
  const [playtimeMinutes, setPlaytimeMinutes] = useState<number | null>(null)
  const [timeToFinishHours, setTimeToFinishHours] = useState('')
  const [unloggedPlaytimeMinutes, setUnloggedPlaytimeMinutes] = useState<number | null>(null)
  const [steamPrice, setSteamPrice] = useState<SteamPrice | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [stats, setStats] = useState<GameStats | null>(null)
  const [detailStats, setDetailStats] = useState<GameDetailStats | null>(null)
  const [reviews, setReviews] = useState<GameReview[]>([])
  const [reviewSort, setReviewSort] = useState<'latest' | 'top'>('latest')
  const [reviewScope, setReviewScope] = useState<'everyone' | 'friends'>('everyone')
  const [followingIds, setFollowingIds] = useState<string[] | null>(null)
  const [platform, setPlatform] = useState('')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [userListModal, setUserListModal] = useState<{ title: string; filter: 'played' | 'playing' | 'wishlist' | 'reviews' | 'likes' } | null>(null)
  const [userListUsers, setUserListUsers] = useState<GameEntryUser[]>([])
  const [userListLoading, setUserListLoading] = useState(false)

  function openUserList(title: string, filter: 'played' | 'playing' | 'wishlist' | 'reviews' | 'likes') {
    if (!game) return
    setUserListModal({ title, filter })
    setUserListLoading(true)
    getGameEntryUsers(game.id, filter)
      .then(setUserListUsers)
      .finally(() => setUserListLoading(false))
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const g = await getGame(gameId)
        if (cancelled) return
        setGame(g)

        getGameStats(gameId).then((s) => {
          if (!cancelled) setStats(s)
        })
        getGameDetailStats(gameId).then((s) => {
          if (!cancelled) setDetailStats(s)
        })
        if (user) {
          getFollowing(user.id).then((friends) => {
            if (!cancelled) setFollowingIds(friends.map((f) => f.id))
          })
        }

        let loggedPlaytime: number | null = null
        if (user && g) {
          const entry = await getEntry(user.id, gameId)
          if (cancelled) return
          if (entry) {
            setStatus(entry.status)
            setRating(entry.rating ?? null)
            setReview(entry.review ?? '')
            setPlatform(entry.platform ?? '')
            setFavorite(entry.favorite)
            setPlaytimeMinutes(entry.playtime_minutes)
            loggedPlaytime = entry.playtime_minutes
            setTimeToFinishHours(
              entry.time_to_finish_minutes != null ? String(Math.round((entry.time_to_finish_minutes / 60) * 10) / 10) : '',
            )
          }
        }

        // If the game isn't logged (or has no playtime yet) but the user has a linked
        // Steam account, try to surface their Steam playtime for this game anyway.
        if (user && g && loggedPlaytime == null) {
          try {
            const profile = await getProfile(user.id)
            if (profile?.steam_id) {
              const appId = await getSteamAppIdForGame(g.id)
              if (appId) {
                const library = await getSteamLibrary(profile.steam_id)
                const match = library.find((lg) => String(lg.appid) === appId)
                if (!cancelled && match) setUnloggedPlaytimeMinutes(match.playtimeMinutes)
              }
            }
          } catch {
            // Steam playtime is a nice-to-have; ignore failures.
          }
        }

        if (g) {
          try {
            const appId = await getSteamAppIdForGame(g.id)
            let price = appId ? await getSteamPrice(appId) : null
            if (!price) price = await getSteamPrice(null, g.name)
            if (!cancelled) setSteamPrice(price)
          } catch {
            // Steam price is a nice-to-have; ignore failures.
          }
        }
        const highlightId = searchParams.get('highlight')
        if (highlightId) {
          setTimeout(() => {
            document.getElementById(`review-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }, 100)
        }

        if (user && searchParams.get('review') === '1') {
          setShowReviewModal(true)
          searchParams.delete('review')
          setSearchParams(searchParams, { replace: true })
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load game')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (Number.isInteger(gameId)) load()
    return () => {
      cancelled = true
    }
  }, [gameId, user])

  useEffect(() => {
    if (!Number.isInteger(gameId)) return
    let cancelled = false
    const userIds = reviewScope === 'friends' && user ? [...(followingIds ?? []), user.id] : undefined
    getGameReviews(gameId, { sort: reviewSort, userIds }).then((r) => {
      if (!cancelled) setReviews(r)
    })
    return () => {
      cancelled = true
    }
  }, [gameId, reviewSort, reviewScope, followingIds, user])

  async function quickSave(changes: {
    rating?: number | null
    favorite?: boolean
    review?: string
    status?: GameStatus
    timeToFinishMinutes?: number | null
    platform?: string | null
  }) {
    if (!user || !game) return

    const newRating = changes.rating !== undefined ? changes.rating : rating
    const newFavorite = changes.favorite !== undefined ? changes.favorite : favorite
    const newReview = changes.review !== undefined ? changes.review : review
    const newStatus: GameStatus = changes.status ?? (status || 'finished')

    if (changes.rating !== undefined) setRating(changes.rating)
    if (changes.favorite !== undefined) setFavorite(changes.favorite)
    setStatus(newStatus)

    setSaving(true)
    setSaveMessage(null)
    try {
      await ensureGameCached(game)
      await upsertEntry({
        userId: user.id,
        gameId: game.id,
        status: newStatus,
        rating: newRating,
        review: newReview.trim() === '' ? null : newReview.trim(),
        favorite: newFavorite,
        ...(changes.timeToFinishMinutes !== undefined ? { timeToFinishMinutes: changes.timeToFinishMinutes } : {}),
        ...(changes.platform !== undefined ? { platform: changes.platform } : {}),
      })
      if (changes.timeToFinishMinutes !== undefined) {
        getGameDetailStats(game.id).then(setDetailStats)
      }
      if (changes.review !== undefined) {
        const userIds = reviewScope === 'friends' && user ? [...(followingIds ?? []), user.id] : undefined
        getGameReviews(game.id, { sort: reviewSort, userIds }).then(setReviews)
      }
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function handleReviewModalSave(changes: {
    review: string
    rating: number | null
    favorite: boolean
    timeToFinishHours: string
    platform: string
  }) {
    setReview(changes.review)
    setTimeToFinishHours(changes.timeToFinishHours)
    setPlatform(changes.platform)
    const hours = parseFloat(changes.timeToFinishHours)
    quickSave({
      review: changes.review,
      rating: changes.rating,
      favorite: changes.favorite,
      timeToFinishMinutes: Number.isFinite(hours) && hours > 0 ? Math.round(hours * 60) : null,
      platform: changes.platform.trim() === '' ? null : changes.platform.trim(),
    })
  }

  async function handleRemove() {
    if (!user || !game) return
    setSaving(true)
    setSaveMessage(null)
    try {
      await deleteEntry(user.id, game.id)
      setStatus('')
      setRating(null)
      setReview('')
      setFavorite(false)
      setPlatform('')
      setSaveMessage('Removed from your log.')
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Failed to remove')
    } finally {
      setSaving(false)
    }
  }

  const backdropId = useMemo(() => {
    const backdrops = [...(game?.artworks ?? []), ...(game?.screenshots ?? [])]
    return backdrops.length > 0 ? backdrops[Math.floor(Math.random() * backdrops.length)].image_id : null
  }, [game])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-white/10 border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <p className="text-red-400">{error ?? 'Game not found.'}</p>
      </div>
    )
  }

  const releaseDate = game.first_release_date
    ? new Date(game.first_release_date * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <div className="relative">
      {backdropId && (
        <div className="fixed top-0 left-0 right-0 h-[420px] overflow-hidden -z-10">
          <img
            src={coverUrl(backdropId, 'screenshot_huge')}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-bg/40 via-bg/80 to-bg" />
        </div>
      )}
      <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="grid sm:grid-cols-[200px_1fr] gap-8">
        <div>
          <div className="aspect-[3/4] bg-surface rounded-xl overflow-hidden ring-1 ring-white/5">
            {game.cover ? (
              <img
                src={coverUrl(game.cover.image_id)}
                alt={game.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-muted text-sm">
                No cover
              </div>
            )}
          </div>

          {!user ? (
            <p className="text-text-muted text-xs mt-4">
              <Link to="/login" className="text-accent">
                Sign in
              </Link>{' '}
              to log this game.
            </p>
          ) : (
            <div className="bg-surface rounded-lg p-3 flex flex-col gap-4 mt-4">
              <div className="flex items-center justify-center gap-3">
                <StarRating value={rating} onChange={(r) => quickSave({ rating: r })} />
                <HeartButton active={favorite} onToggle={() => quickSave({ favorite: !favorite })} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => quickSave({ status: s })}
                    className={`rounded-lg p-3.5 flex flex-col items-center justify-center text-center gap-1 transition-colors cursor-pointer ${
                      status === s
                        ? 'bg-accent/20 text-accent border border-accent/30 font-bold'
                        : 'bg-bg text-text-muted hover:bg-white/5'
                    }`}
                  >
                    {STATUS_ICONS[s]}
                    <span className="text-sm">{STATUS_LABELS[s]}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowReviewModal(true)}
                className="bg-accent/20 text-accent border border-accent/30 rounded-lg py-2 text-sm font-bold transition-colors hover:bg-accent/30 cursor-pointer"
              >
                Review
              </button>

              {playtimeMinutes != null && (
                <div className="flex items-center gap-2 text-sm text-text-muted whitespace-nowrap">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>{Math.round(playtimeMinutes / 6) / 10}h played on Steam</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={saving}
                  className="flex items-center gap-1 text-text-muted hover:text-red-400 transition-colors text-xs cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                    <path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                  Remove from log
                </button>
                {saveMessage && <span className="text-xs text-text-muted">{saveMessage}</span>}
              </div>
            </div>
          )}

          {showReviewModal && (
            <ReviewModal
              gameName={game.name}
              review={review}
              rating={rating}
              favorite={favorite}
              timeToFinishHours={timeToFinishHours}
              platform={platform}
              platformOptions={(game.platforms ?? []).map((p) => p.abbreviation ?? p.name)}
              onClose={() => setShowReviewModal(false)}
              onSave={handleReviewModalSave}
            />
          )}
        </div>

        <div>
          <h1 className="text-3xl font-bold mb-1">{game.name}</h1>
          {releaseDate && <p className="text-gray-200 font-bold mb-1">{releaseDate}</p>}

          {game.involved_companies && game.involved_companies.length > 0 && (
            <p className="text-sm text-gray-200 font-bold mb-2">
              By{' '}
              {game.involved_companies
                .filter((c) => c.developer || c.publisher)
                .map((c) => c.company.name)
                .filter((name, i, arr) => arr.indexOf(name) === i)
                .join(', ')}
            </p>
          )}

          {game.platforms && game.platforms.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span className="text-xs text-gray-200 font-bold">Platforms:</span>
              {[...game.platforms].sort((a, b) => (a.abbreviation ?? a.name).localeCompare(b.abbreviation ?? b.name)).map((p) => (
                <Link
                  key={p.id}
                  to={`/games?platformId=${p.id}&platformName=${encodeURIComponent(p.abbreviation ?? p.name)}`}
                  className="text-xs bg-surface border border-white/10 rounded px-2 py-0.5 text-gray-200 font-bold hover:border-accent hover:text-accent transition-colors"
                >
                  {p.abbreviation ?? p.name}
                </Link>
              ))}
            </div>
          )}

          {game.genres && game.genres.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <span className="text-xs text-gray-200 font-bold">Genre:</span>
              {[...game.genres].sort((a, b) => a.name.localeCompare(b.name)).map((g) => (
                <Link
                  key={g.id}
                  to={`/games?genreId=${g.id}&genreName=${encodeURIComponent(g.name)}`}
                  className="text-xs bg-surface border border-white/10 rounded px-2 py-0.5 text-gray-200 font-bold hover:border-accent hover:text-accent transition-colors"
                >
                  {g.name}
                </Link>
              ))}
            </div>
          )}

          {game.themes && game.themes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <span className="text-xs text-gray-200 font-bold">Tags:</span>
              {[...game.themes].sort((a, b) => a.name.localeCompare(b.name)).map((t) => (
                <Link
                  key={t.id}
                  to={`/games?themeId=${t.id}&themeName=${encodeURIComponent(t.name)}`}
                  className="text-xs bg-surface border border-white/10 rounded px-2 py-0.5 text-gray-200 font-bold hover:border-accent hover:text-accent transition-colors"
                >
                  {t.name}
                </Link>
              ))}
            </div>
          )}

          {stats && (stats.ratingCount > 0 || stats.favoriteCount > 0) && (
            <div className="flex items-center gap-4 mb-4 text-sm text-text-muted">
              {stats.avgRating != null && (
                <button
                  type="button"
                  onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-1.5 hover:text-text transition-colors cursor-pointer"
                >
                  <StarRating value={stats.avgRating * 2} readOnly size={14} />
                  <span>
                    {stats.avgRating.toFixed(1)} ({stats.ratingCount})
                  </span>
                </button>
              )}
              {stats.favoriteCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <HeartButton active readOnly size={14} />
                  <span>{stats.favoriteCount}</span>
                </div>
              )}
            </div>
          )}

          {unloggedPlaytimeMinutes != null && (
            <p className="text-xs text-text-muted mb-4">
              {Math.round(unloggedPlaytimeMinutes / 6) / 10}h played on Steam (not logged yet)
            </p>
          )}

          {game.summary && <p className="text-sm leading-relaxed mb-4">{game.summary}</p>}

          {(user || steamPrice) && (
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              {user && <AddToListMenu game={game} />}
              {steamPrice && (
                <a
                  href={steamPrice.appId ? `steam://store/${steamPrice.appId}` : undefined}
                  className="flex items-center gap-2 bg-surface rounded-lg px-3 py-2 text-sm hover:bg-white/10 transition-colors"
                >
                  {steamPrice.isFree ? (
                    <span className="font-bold text-accent">Free on Steam</span>
                  ) : (
                    <>
                      {steamPrice.discountPercent! > 0 && (
                        <>
                          <span className="bg-green-500/20 text-green-400 rounded px-1.5 py-0.5 text-xs font-bold">
                            -{steamPrice.discountPercent}%
                          </span>
                          <span className="text-text-muted line-through text-xs">
                            {steamPrice.initial!.toFixed(2)} {steamPrice.currency}
                          </span>
                        </>
                      )}
                      <span className="font-bold">
                        {steamPrice.final!.toFixed(2)} {steamPrice.currency}
                      </span>
                      <span className="text-xs text-text-muted">on Steam</span>
                    </>
                  )}
                </a>
              )}
            </div>
          )}

          <div className="grid sm:grid-cols-[200px_1fr_1.6fr] gap-4 items-stretch">
        {detailStats && (
          <div className="bg-surface rounded-lg p-4 flex flex-col h-full">
            <p className="text-xs text-text-muted font-bold mb-1">Avg Rating</p>
            {detailStats.avgRating != null ? (
              <button
                type="button"
                onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-3xl font-bold mb-2 text-left hover:text-accent transition-colors cursor-pointer"
              >
                {detailStats.avgRating.toFixed(1)}
              </button>
            ) : (
              <p className="text-3xl font-bold mb-2 text-text-muted">-</p>
            )}
            <div className="flex items-end gap-1 flex-1">
              {detailStats.ratingDistribution.map((count, i) => {
                const max = Math.max(...detailStats.ratingDistribution, 1)
                const heightPct = count === 0 ? 2 : Math.max(4, (count / max) * 100)
                const pct = detailStats.ratingCount > 0 ? (count / detailStats.ratingCount) * 100 : 0
                const stars = (i + 1) / 2
                return (
                  <div
                    key={i}
                    className="flex-1 bg-accent/60 hover:bg-accent rounded-sm transition-colors cursor-default"
                    style={{ height: `${heightPct}%` }}
                    title={`${stars}★ — ${count} vote${count === 1 ? '' : 's'} (${pct.toFixed(1)}%)`}
                  />
                )
              })}
            </div>
            <div className="flex justify-between text-[10px] text-text-muted mt-1">
              <span>0.5★</span>
              <span>5★</span>
            </div>
          </div>
        )}

        {detailStats && (
          <div className="bg-surface rounded-lg divide-y divide-white/5 h-full flex flex-col">
            <button type="button" onClick={() => openUserList('Played', 'played')} className="w-full flex-1 flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors cursor-pointer text-left">
              <span className="text-text-muted">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="20" height="12" rx="6" />
                  <circle cx="8" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="16" cy="12" r="1.5" fill="currentColor" />
                </svg>
              </span>
              <span className="text-sm text-text-muted flex-1">Played</span>
              <span className="font-bold">{detailStats.played}</span>
            </button>
            <button type="button" onClick={() => openUserList('Playing', 'playing')} className="w-full flex-1 flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors cursor-pointer text-left">
              <span className="text-text-muted">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="6 4 20 12 6 20 6 4" />
                </svg>
              </span>
              <span className="text-sm text-text-muted flex-1">Playing</span>
              <span className="font-bold">{detailStats.playing}</span>
            </button>
            <button type="button" onClick={() => openUserList('Wishlist', 'wishlist')} className="w-full flex-1 flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors cursor-pointer text-left">
              <span className="text-text-muted">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 12V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14l4-2 4 2 4-2 4 2v-3" />
                </svg>
              </span>
              <span className="text-sm text-text-muted flex-1">Wishlist</span>
              <span className="font-bold">{detailStats.wishlist}</span>
            </button>
            <button
              type="button"
              onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex-1 flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors cursor-pointer text-left"
            >
              <span className="text-text-muted">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7L5.8 21l1.6-7L2 9.2l7.1-.6z" />
                </svg>
              </span>
              <span className="text-sm text-text-muted flex-1">Ratings</span>
              <span className="font-bold">{detailStats.ratingCount}</span>
            </button>
          </div>
        )}

        {detailStats && (
        <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full">
          <button type="button" onClick={() => openUserList('Reviews', 'reviews')} className="bg-surface rounded-lg p-2.5 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors cursor-pointer">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mb-0.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="font-bold text-sm">{detailStats.reviewCount}</span>
            <span className="text-xs text-text-muted">Reviews</span>
          </button>
          <button type="button" onClick={() => openUserList('Likes', 'likes')} className="bg-surface rounded-lg p-2.5 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors cursor-pointer">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="mb-0.5">
              <path d="M12 21s-7.5-4.6-10-9.1C0.3 8.6 2 5 5.5 5c2 0 3.5 1.1 4.5 2.6C11 6.1 12.5 5 14.5 5 18 5 19.7 8.6 22 11.9 19.5 16.4 12 21 12 21z" />
            </svg>
            <span className="font-bold text-sm">{detailStats.favoriteCount}</span>
            <span className="text-xs text-text-muted">Likes</span>
          </button>
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-2.5 flex flex-col items-center justify-center text-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mb-0.5 text-accent">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {detailStats.avgPlaytimeMinutes != null ? (
              <span className="font-bold text-sm">{Math.round(detailStats.avgPlaytimeMinutes / 6) / 10}h</span>
            ) : (
              <span className="font-bold text-sm text-text-muted">-</span>
            )}
            <span className="text-xs text-accent">average (Steam)</span>
          </div>
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-2.5 flex flex-col items-center justify-center text-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mb-0.5 text-accent">
              <path d="M4 22V4a1 1 0 0 1 1-1h13l-2 4 2 4H6a1 1 0 0 0-1 1v10" />
            </svg>
            {detailStats.avgTimeToFinishMinutes != null ? (
              <span className="font-bold text-sm">{Math.round(detailStats.avgTimeToFinishMinutes / 6) / 10}h</span>
            ) : (
              <span className="font-bold text-sm text-text-muted">-</span>
            )}
            <span className="text-xs text-accent">to finish</span>
          </div>
        </div>
        )}
          </div>
        </div>
      </div>

      <div id="reviews" className="mt-10">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-bold">Reviews</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-surface rounded-lg p-1 text-sm">
              <button
                type="button"
                onClick={() => setReviewSort('latest')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${reviewSort === 'latest' ? 'bg-accent/20 text-accent font-semibold' : 'text-text-muted hover:text-text'}`}
              >
                Latest
              </button>
              <button
                type="button"
                onClick={() => setReviewSort('top')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${reviewSort === 'top' ? 'bg-accent/20 text-accent font-semibold' : 'text-text-muted hover:text-text'}`}
              >
                Top liked
              </button>
            </div>
            {user && (
              <div className="flex items-center gap-1 bg-surface rounded-lg p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setReviewScope('everyone')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${reviewScope === 'everyone' ? 'bg-accent/20 text-accent font-semibold' : 'text-text-muted hover:text-text'}`}
                >
                  Everyone
                </button>
                <button
                  type="button"
                  onClick={() => setReviewScope('friends')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${reviewScope === 'friends' ? 'bg-accent/20 text-accent font-semibold' : 'text-text-muted hover:text-text'}`}
                >
                  Friends
                </button>
              </div>
            )}
          </div>
        </div>
        {reviews.length === 0 ? (
          <p className="text-text-muted text-sm">No reviews yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {reviews.map((r) => (
              <div
                key={r.id}
                id={`review-${r.id}`}
                className={
                  searchParams.get('highlight') === r.id
                    ? 'rounded-lg ring-2 ring-accent transition-shadow'
                    : ''
                }
              >
                <ReviewCard
                  entryId={r.id}
                  game={{ id: game.id, name: game.name, cover_image_id: game.cover?.image_id ?? null, first_release_date: null }}
                  rating={r.rating}
                  review={r.review}
                  date={r.updated_at}
                  author={r.profiles}
                  platform={r.platform}
                  timeToFinishMinutes={r.time_to_finish_minutes}
                  likeCount={r.likeCount}
                  isOwn={user?.id === r.user_id}
                  onEdit={() => setShowReviewModal(true)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
      {userListModal && (
        <UserListModal
          title={userListModal.title}
          users={userListUsers}
          loading={userListLoading}
          onClose={() => setUserListModal(null)}
        />
      )}
    </div>
  )
}
