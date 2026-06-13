import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getUnreadNotificationCount } from '../lib/activity'
import { getProfile } from '../lib/profiles'
import { FeedbackModal } from './FeedbackModal'

export function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)

  useEffect(() => {
    if (!user) {
      setUsername(null)
      setUnreadCount(0)
      return
    }
    getProfile(user.id).then((p) => setUsername(p?.username ?? null))

    function refreshCount() {
      getUnreadNotificationCount(user!.id).then(setUnreadCount).catch(() => {})
    }

    refreshCount()
    const interval = setInterval(refreshCount, 30000)
    return () => clearInterval(interval)
  }, [user])

  // Refresh unread count when navigating away from the activity tab (it gets marked as read there)
  useEffect(() => {
    if (!user) return
    if (!location.pathname.endsWith('/activity')) {
      getUnreadNotificationCount(user.id).then(setUnreadCount).catch(() => {})
    } else {
      const timeout = setTimeout(() => setUnreadCount(0), 1000)
      return () => clearTimeout(timeout)
    }
  }, [location.pathname, user])

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 h-14 flex items-center justify-between gap-2 sm:gap-6">
        <Link to="/" className="font-bold text-xl sm:text-3xl tracking-tight shrink-0">
          GameLog<span className="text-accent">gd</span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4 text-sm">
          {user ? (
            <>
              <Link
                to={username ? `/u/${username}/activity` : '/profile'}
                className="relative text-gray-200 hover:text-white font-bold transition-colors"
                aria-label="Activity"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-accent text-bg text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                  className="flex items-center gap-1 text-gray-200 hover:text-white font-bold transition-colors cursor-pointer"
                  aria-label="Profile menu"
                >
                  {username ?? 'Profile'}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-surface border border-white/10 rounded shadow-lg overflow-hidden z-20">
                    <Link to="/profile" className="block px-4 py-2 text-text-muted hover:text-text hover:bg-white/5 transition-colors">
                      Profile
                    </Link>
                    {username && (
                      <>
                        <Link to={`/u/${username}/games`} className="block px-4 py-2 text-text-muted hover:text-text hover:bg-white/5 transition-colors">
                          Games
                        </Link>
                        <Link to={`/u/${username}/journal`} className="block px-4 py-2 text-text-muted hover:text-text hover:bg-white/5 transition-colors">
                          Journal
                        </Link>
                        <Link to={`/u/${username}/activity`} className="block px-4 py-2 text-text-muted hover:text-text hover:bg-white/5 transition-colors">
                          Activity
                        </Link>
                        <Link to={`/u/${username}/reviews`} className="block px-4 py-2 text-text-muted hover:text-text hover:bg-white/5 transition-colors">
                          Reviews
                        </Link>
                        <Link to={`/u/${username}/lists`} className="block px-4 py-2 text-text-muted hover:text-text hover:bg-white/5 transition-colors">
                          Lists
                        </Link>
                        <Link to={`/u/${username}/friends`} className="block px-4 py-2 text-text-muted hover:text-text hover:bg-white/5 transition-colors">
                          Friends
                        </Link>
                        <Link to={`/u/${username}/likes`} className="block px-4 py-2 text-text-muted hover:text-text hover:bg-white/5 transition-colors">
                          Likes
                        </Link>
                        <Link to={`/u/${username}/wishlist`} className="block px-4 py-2 text-text-muted hover:text-text hover:bg-white/5 transition-colors">
                          Wishlist
                        </Link>
                      </>
                    )}
                    <div className="border-t border-white/10" />
                    <Link to="/settings" className="block px-4 py-2 text-text-muted hover:text-text hover:bg-white/5 transition-colors">
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShowFeedbackModal(true)}
                      className="block w-full text-left px-4 py-2 text-text-muted hover:text-text hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      Feedback/Bug
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-text-muted hover:text-text hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>

              <Link
                to="/games"
                onClick={(e) => {
                  if (location.pathname === '/games') {
                    e.preventDefault()
                    navigate(0)
                  }
                }}
                className="text-gray-200 hover:text-white font-bold transition-colors"
              >
                Games
              </Link>

              <Link to="/search" className="flex items-center gap-1.5 text-gray-200 hover:text-white font-bold transition-colors" aria-label="Search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span className="hidden sm:inline">Search</span>
              </Link>

              <Link
                to="/search"
                className="flex items-center gap-1.5 bg-accent text-bg font-bold px-2 sm:px-3 py-1.5 rounded text-sm hover:opacity-90 transition-opacity shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Log
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/games"
                onClick={(e) => {
                  if (location.pathname === '/games') {
                    e.preventDefault()
                    navigate(0)
                  }
                }}
                className="text-gray-200 hover:text-white font-bold transition-colors shrink-0"
              >
                Games
              </Link>

              <Link to="/search" className="flex items-center gap-1.5 text-gray-200 hover:text-white font-bold transition-colors shrink-0" aria-label="Search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span className="hidden sm:inline">Search</span>
              </Link>
              <Link to="/login" className="text-gray-200 hover:text-white font-bold transition-colors shrink-0">
                Sign in
              </Link>
              <Link
                to="/signup"
                className="bg-accent text-bg font-bold px-2 sm:px-3 py-1.5 rounded hover:opacity-90 transition-opacity shrink-0"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
      {showFeedbackModal && <FeedbackModal onClose={() => setShowFeedbackModal(false)} />}
    </header>
  )
}
