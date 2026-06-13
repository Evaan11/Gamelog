import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useParams, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getProfileByUsername, type Profile } from '../../lib/profiles'
import { blockUser, unblockUser, isBlocked, reportUser } from '../../lib/moderation'
import { follow, unfollow, isFollowing } from '../../lib/follows'
import { ReportModal } from '../../components/ReportModal'
import { CountryFlag } from '../../components/CountryFlag'

const TABS = [
  { to: '', label: 'Profile', end: true },
  { to: 'games', label: 'Games' },
  { to: 'journal', label: 'Journal' },
  { to: 'activity', label: 'Activity' },
  { to: 'reviews', label: 'Reviews' },
  { to: 'lists', label: 'Lists' },
  { to: 'friends', label: 'Friends' },
  { to: 'likes', label: 'Likes' },
  { to: 'wishlist', label: 'Wishlist' },
]

export interface ProfileOutletContext {
  profile: Profile
  isOwnProfile: boolean
}

export function ProfileLayout() {
  const { username } = useParams<{ username: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!username) return
    let cancelled = false

    getProfileByUsername(username)
      .then((p) => {
        if (!cancelled) setProfile(p)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load profile')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [username])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    if (!user || !profile || user.id === profile.id) return
    isBlocked(user.id, profile.id).then(setBlocked)
    isFollowing(user.id, profile.id).then(setFollowing)
  }, [user, profile])

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-10 text-text-muted">Loading...</div>
  if (error) return <div className="max-w-6xl mx-auto px-4 py-10 text-red-400">{error}</div>
  if (!profile) return <div className="max-w-6xl mx-auto px-4 py-10 text-text-muted">User not found.</div>

  const isOwnProfile = user?.id === profile.id

  async function toggleFollow() {
    if (!user) return
    setFollowLoading(true)
    try {
      if (following) {
        await unfollow(user.id, profile!.id)
        setFollowing(false)
      } else {
        await follow(user.id, profile!.id)
        setFollowing(true)
      }
    } finally {
      setFollowLoading(false)
    }
  }

  function copyProfileLink() {
    navigator.clipboard.writeText(window.location.origin + `/u/${profile!.username}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-surface ring-1 ring-white/10 overflow-hidden shrink-0 flex items-center justify-center text-xl font-semibold">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                (profile.display_name ?? profile.username)[0]?.toUpperCase()
              )}
            </div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              {profile.display_name ?? profile.username}
              {profile.country_code && <CountryFlag code={profile.country_code} size={24} />}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyProfileLink}
              aria-label="Copy profile link"
              title={copied ? 'Copied!' : 'Copy profile link'}
              className="text-text-muted hover:text-text transition-colors cursor-pointer px-1"
            >
              {copied ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="px-3 py-1.5 rounded text-sm font-semibold transition-colors cursor-pointer bg-surface text-text-muted hover:text-text border border-white/10"
              >
                Edit profile
              </button>
            )}
            {!isOwnProfile && user && (
              <button
                type="button"
                onClick={toggleFollow}
                disabled={followLoading}
                className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                  following
                    ? 'bg-surface text-text-muted hover:text-text border border-white/10'
                    : 'bg-accent text-bg hover:opacity-90'
                }`}
              >
                {following ? 'Following' : 'Follow'}
              </button>
            )}
          {!isOwnProfile && user && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Report or block user"
                title="Report or block user"
                className="text-text-muted hover:text-text transition-colors cursor-pointer px-1"
              >
                🚩
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-surface border border-white/10 rounded shadow-lg overflow-hidden z-20">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      setShowReportModal(true)
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-text-muted hover:bg-white/5 hover:text-text transition-colors cursor-pointer"
                  >
                    Report user
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setMenuOpen(false)
                      if (blocked) {
                        await unblockUser(user.id, profile.id)
                        setBlocked(false)
                      } else {
                        await blockUser(user.id, profile.id)
                        setBlocked(true)
                      }
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-text-muted hover:bg-white/5 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    {blocked ? 'Unblock user' : 'Block user'}
                  </button>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
        <p className="text-text-muted flex items-center gap-2">
          @{profile.username}
        </p>

        {(profile.bio || isOwnProfile) && (
          <div className="mt-3 max-w-md">
            <span className="text-xs text-text-muted font-bold block mb-1">Bio</span>
            <div className="flex items-start gap-2">
              {profile.bio ? (
                <p className="text-sm text-text whitespace-pre-wrap">{profile.bio}</p>
              ) : (
                <p className="text-sm text-text-muted italic">No bio yet.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <nav className="flex gap-1 border-b border-white/10 mb-8 overflow-x-auto touch-pan-x whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-accent text-text'
                  : 'border-transparent text-text-muted hover:text-text'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet context={{ profile, isOwnProfile } satisfies ProfileOutletContext} />

      {showReportModal && user && (
        <ReportModal
          title="Report user"
          onClose={() => setShowReportModal(false)}
          onSubmit={(reason) => reportUser(user.id, profile.id, reason)}
        />
      )}
    </div>
  )
}

export function ProfileRedirect() {
  const { user, loading } = useAuth()
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)

  useEffect(() => {
    if (!user) return
    import('../../lib/profiles').then(({ getProfile }) => {
      getProfile(user.id).then(setProfile)
    })
  }, [user])

  if (loading || profile === undefined) return null
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <div className="max-w-6xl mx-auto px-4 py-10 text-text-muted">Profile not found.</div>

  return <Navigate to={`/u/${profile.username}`} replace />
}
