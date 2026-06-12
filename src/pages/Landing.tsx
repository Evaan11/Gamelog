import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Landing() {
  const { user } = useAuth()

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

        {user ? (
          <Link
            to="/search"
            className="inline-block bg-accent text-bg font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            Find a game to log
          </Link>
        ) : (
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

      <section className="grid sm:grid-cols-3 gap-6 pb-24 text-center">
        <div className="bg-surface rounded-lg p-6">
          <h2 className="font-semibold mb-2">Log your library</h2>
          <p className="text-text-muted text-sm">
            Mark games as finished, in progress, or on your backlog.
          </p>
        </div>
        <div className="bg-surface rounded-lg p-6">
          <h2 className="font-semibold mb-2">Rate &amp; review</h2>
          <p className="text-text-muted text-sm">
            Give every game a rating out of 10 and write your thoughts.
          </p>
        </div>
        <div className="bg-surface rounded-lg p-6">
          <h2 className="font-semibold mb-2">Follow friends</h2>
          <p className="text-text-muted text-sm">
            See what your friends are finishing and what they think of it.
          </p>
        </div>
      </section>
    </div>
  )
}
