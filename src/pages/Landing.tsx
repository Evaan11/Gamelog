import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { browseGames } from '../lib/igdb'
import { getPopularReviewsThisWeek, type PopularReview } from '../lib/games'
import { deleteReview } from '../lib/entries'
import { coverUrl } from '../lib/igdb'
import { ReviewCard } from '../components/ReviewCard'
import type { IgdbGame } from '../types/igdb'

export function Landing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [recentGames, setRecentGames] = useState<IgdbGame[]>([])
  const [popularReviews, setPopularReviews] = useState<PopularReview[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    browseGames('recent', 0)
      .then((g) => setRecentGames(g.slice(0, 6)))
      .catch(() => {})

    getPopularReviewsThisWeek(5)
      .then(setPopularReviews)
      .catch(() => {})
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4">
      <section className="py-24 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          Track every game you play.
        </h1>
        <p className="text-text-muted text-lg mb-8">
          Log what you've finished, rate it, write a review, and see what your friends are
          playing. Like Letterboxd, but for games.
        </p>

        {!user && (
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/signup"
              className="bg-accent text-bg font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              Get started
            </Link>
            <Link
              to="/login"
              className="border border-white/15 px-6 py-3 rounded-lg hover:bg-surface-hover transition-colors"
            >
              Sign in
            </Link>
          </div>
        )}
      </section>

      <section className="pb-16 max-w-md mx-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`)
          }}
          className="relative"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your games..."
            className="w-full bg-surface border border-white/10 rounded px-4 py-2 pr-9 text-sm focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer"
            aria-label="Search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
        </form>
      </section>

      {recentGames.length > 0 && (
        <section className="pb-16">
          <h2 className="text-lg font-bold mb-4">Latest releases</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {recentGames.map((game) => (
              <Link
                key={game.id}
                to={`/game/${game.id}`}
                className="group relative aspect-[3/4] rounded-lg overflow-hidden bg-surface ring-1 ring-white/5 block transition-all hover:ring-accent"
              >
                {game.cover ? (
                  <img
                    src={coverUrl(game.cover.image_id)}
                    alt={game.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-text-muted p-1 text-center">
                    {game.name}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center p-2 opacity-0 group-hover:opacity-100">
                  <span className="text-white text-sm font-semibold text-center leading-tight">{game.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {popularReviews.length > 0 && (
        <section className="pb-24">
          <h2 className="text-lg font-bold mb-4">Popular reviews this week</h2>
          <div className="flex flex-col gap-4">
            {popularReviews.map((r) => (
              <ReviewCard
                key={r.id}
                entryId={r.id}
                game={r.games}
                rating={r.rating}
                review={r.review}
                date={r.updated_at}
                author={r.profiles}
                platform={r.platform}
                timeToFinishMinutes={r.time_to_finish_minutes}
                likeCount={r.likeCount}
                isOwn={user?.id === r.user_id}
                onDelete={() => {
                  deleteReview(r.user_id, r.games.id).then(() => {
                    setPopularReviews((rs) => rs.filter((rev) => rev.id !== r.id))
                  })
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
