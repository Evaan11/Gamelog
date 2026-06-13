import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getProfile, updateProfile, updateUsername, displayName as profileDisplayName, type Profile } from '../lib/profiles'
import { supabase } from '../lib/supabase'
import { PasswordInput } from '../components/PasswordInput'
import { getSteamLoginUrl, getSteamLibrary, getSteamWishlist } from '../lib/steam'
import { getGameBySteamAppId } from '../lib/igdb'
import { ensureGameCached, importSteamEntry, importWishlistEntry, resetAccount, resetWishlist, resetSteamLibrary } from '../lib/entries'
import { getBlockedUsers, unblockUser, type BlockedUser } from '../lib/moderation'
import { CountryFlag } from '../components/CountryFlag'
import { COUNTRIES } from '../lib/countries'

const SORTED_COUNTRIES = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name))

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'account', label: 'Account' },
  { id: 'steam', label: 'Steam' },
  { id: 'blocked', label: 'Blocked users' },
] as const

type TabId = (typeof TABS)[number]['id']

export function Settings() {
  const { user, loading: authLoading, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [countryQuery, setCountryQuery] = useState('')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [email, setEmail] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetPassword, setResetPassword] = useState('')
  const [confirmResetLibrary, setConfirmResetLibrary] = useState(false)
  const [resettingLibrary, setResettingLibrary] = useState(false)
  const [resetLibraryError, setResetLibraryError] = useState<string | null>(null)
  const [confirmResetWishlist, setConfirmResetWishlist] = useState(false)
  const [resettingWishlist, setResettingWishlist] = useState(false)
  const [resetWishlistError, setResetWishlistError] = useState<string | null>(null)

  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ done: number; total: number; matched: number } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const [importingWishlist, setImportingWishlist] = useState(false)
  const [wishlistProgress, setWishlistProgress] = useState<{ done: number; total: number; matched: number } | null>(null)
  const [wishlistError, setWishlistError] = useState<string | null>(null)

  const [tab, setTab] = useState<TabId>('profile')

  useEffect(() => {
    if (!user) return
    setEmail(user.email ?? '')
  }, [user])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    getProfile(user.id)
      .then((p) => {
        if (cancelled || !p) return
        setProfile(p)
        setUsername(p.username)
        setDisplayName(p.display_name ?? '')
        setBio(p.bio ?? '')
        setCountryCode(p.country_code ?? '')
        setCountryQuery(SORTED_COUNTRIES.find((c) => c.code === p.country_code)?.name ?? '')
        setAvatarUrl(p.avatar_url ?? '')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    getBlockedUsers(user.id).then((b) => {
      if (!cancelled) setBlockedUsers(b)
    })

    return () => {
      cancelled = true
    }
  }, [user])

  if (authLoading || loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <div className="max-w-xl mx-auto px-4 py-10 text-text-muted">Profile not found.</div>

  async function handleUnlinkSteam() {
    setSaving(true)
    setError(null)
    try {
      await updateProfile(profile!.id, { steam_id: null })
      setProfile({ ...profile!, steam_id: null })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlink Steam')
    } finally {
      setSaving(false)
    }
  }

  async function handleImportLibrary() {
    if (!profile?.steam_id) return
    setImporting(true)
    setImportError(null)
    setImportProgress(null)
    try {
      const games = await getSteamLibrary(profile.steam_id)
      setImportProgress({ done: 0, total: games.length, matched: 0 })

      let matched = 0
      for (let i = 0; i < games.length; i++) {
        const game = games[i]
        try {
          const igdbGame = await getGameBySteamAppId(game.appid)
          if (igdbGame) {
            await ensureGameCached(igdbGame)
            await importSteamEntry({
              userId: user!.id,
              gameId: igdbGame.id,
              playtimeMinutes: game.playtimeMinutes,
              lastPlayedAt: game.lastPlayedAt,
            })
            matched++
          }
        } catch {
          // skip games that fail to match/import and continue
        }
        setImportProgress({ done: i + 1, total: games.length, matched })
      }
      await touchLastSynced()
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import library')
    } finally {
      setImporting(false)
    }
  }

  async function handleImportWishlist() {
    if (!profile?.steam_id) return
    setImportingWishlist(true)
    setWishlistError(null)
    setWishlistProgress(null)
    try {
      const appIds = await getSteamWishlist(profile.steam_id)
      setWishlistProgress({ done: 0, total: appIds.length, matched: 0 })

      let matched = 0
      for (let i = 0; i < appIds.length; i++) {
        const appId = appIds[i]
        try {
          const igdbGame = await getGameBySteamAppId(appId)
          if (igdbGame) {
            await ensureGameCached(igdbGame)
            await importWishlistEntry({ userId: user!.id, gameId: igdbGame.id })
            matched++
          }
        } catch {
          // skip games that fail to match/import and continue
        }
        setWishlistProgress({ done: i + 1, total: appIds.length, matched })
      }
      await touchLastSynced()
    } catch (err) {
      setWishlistError(err instanceof Error ? err.message : 'Failed to import wishlist')
    } finally {
      setImportingWishlist(false)
    }
  }

  async function handleResetSteamLibrary() {
    setResettingLibrary(true)
    setResetLibraryError(null)
    try {
      await resetSteamLibrary(user!.id)
      setConfirmResetLibrary(false)
    } catch (err) {
      setResetLibraryError(err instanceof Error ? err.message : 'Failed to reset library')
    } finally {
      setResettingLibrary(false)
    }
  }

  async function handleResetWishlist() {
    setResettingWishlist(true)
    setResetWishlistError(null)
    try {
      await resetWishlist(user!.id)
      setConfirmResetWishlist(false)
    } catch (err) {
      setResetWishlistError(err instanceof Error ? err.message : 'Failed to reset wishlist')
    } finally {
      setResettingWishlist(false)
    }
  }

  async function handleResetAccount() {
    setResetting(true)
    setResetError(null)
    try {
      if (!resetPassword) throw new Error('Please enter your password')
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: resetPassword,
      })
      if (signInError) throw new Error('Incorrect password')
      await resetAccount(user!.id)
      setConfirmReset(false)
      setResetPassword('')
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Failed to reset account')
    } finally {
      setResetting(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    setDeleteError(null)
    try {
      if (!deletePassword) throw new Error('Please enter your password')
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: deletePassword,
      })
      if (signInError) throw new Error('Incorrect password')
      const { data: sessionData } = await supabase.auth.getSession()
      const { error } = await supabase.functions.invoke('delete-account', {
        headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
      })
      if (error) throw error
      await signOut()
      navigate('/', { replace: true })
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account')
      setDeleting(false)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploadingAvatar(true)
    setError(null)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user!.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`

      await updateProfile(profile!.id, { avatar_url: url })
      setAvatarUrl(url)
      setProfile((p) => (p ? { ...p, avatar_url: url } : p))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function touchLastSynced() {
    const now = new Date().toISOString()
    await updateProfile(profile!.id, { steam_last_synced_at: now })
    setProfile((p) => (p ? { ...p, steam_last_synced_at: now } : p))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const trimmedUsername = username.trim()
      if (trimmedUsername && trimmedUsername !== profile!.username) {
        await updateUsername(profile!.id, trimmedUsername)
      }
      await updateProfile(profile!.id, {
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        country_code: countryCode || null,
      })
      setSuccess(true)
      if (trimmedUsername && trimmedUsername !== profile!.username) {
        navigate(`/u/${trimmedUsername}`, { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangeEmail() {
    setSavingEmail(true)
    setEmailError(null)
    setEmailSuccess(false)
    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim() })
      if (error) throw error
      setEmailSuccess(true)
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Failed to update email')
    } finally {
      setSavingEmail(false)
    }
  }

  async function handleChangePassword() {
    setSavingPassword(true)
    setPasswordError(null)
    setPasswordSuccess(false)
    try {
      if (!currentPassword) throw new Error('Please enter your current password')
      if (newPassword.length < 6) throw new Error('Password must be at least 6 characters')
      if (newPassword !== confirmPassword) throw new Error('Passwords do not match')
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword,
      })
      if (signInError) throw new Error('Current password is incorrect')
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <nav className="flex gap-1 border-b border-white/10 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              tab === t.id
                ? 'border-accent text-text'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'profile' && (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <label className="relative w-16 h-16 rounded-full bg-surface ring-1 ring-white/10 overflow-hidden flex items-center justify-center text-xl font-semibold shrink-0 cursor-pointer group shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              (displayName || username)[0]?.toUpperCase()
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white text-center px-1">
              {uploadingAvatar ? '...' : 'Change'}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              disabled={uploadingAvatar}
              className="hidden"
            />
          </label>
          <div className="flex-1">
            <p className="text-sm font-semibold">{displayName || username}</p>
            <p className="text-xs text-text-muted">Click your avatar to change it</p>
          </div>
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1">Username</label>
          <div className="flex items-center gap-2">
            <span className="text-text-muted">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1 bg-surface rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1">Display name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="w-full bg-surface rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Write a short bio..."
            rows={3}
            className="w-full bg-surface rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-accent resize-none"
          />
        </div>

        <div className="relative">
          <label className="block text-sm text-text-muted mb-1">Country</label>
          <input
            type="text"
            value={countryQuery}
            onChange={(e) => {
              setCountryQuery(e.target.value)
              setCountryCode('')
              setCountryDropdownOpen(true)
            }}
            onFocus={() => setCountryDropdownOpen(true)}
            onBlur={() => setTimeout(() => setCountryDropdownOpen(false), 150)}
            placeholder="Type to search..."
            className="w-full bg-surface border border-white/10 rounded text-sm px-3 py-2 focus:outline-none focus:border-accent"
          />
          {countryDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-full max-h-48 overflow-y-auto bg-surface border border-white/10 rounded shadow-lg z-20">
              <button
                type="button"
                onClick={() => {
                  setCountryCode('')
                  setCountryQuery('')
                  setCountryDropdownOpen(false)
                }}
                className="w-full text-left px-2 py-1.5 text-sm text-text-muted hover:bg-white/5 transition-colors cursor-pointer"
              >
                -
              </button>
              {SORTED_COUNTRIES.filter((c) => c.name.toLowerCase().includes(countryQuery.toLowerCase())).map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setCountryCode(c.code)
                    setCountryQuery(c.name)
                    setCountryDropdownOpen(false)
                  }}
                  className="w-full flex items-center gap-2 text-left px-2 py-1.5 text-sm hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <CountryFlag code={c.code} size={16} />
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-accent text-sm">Saved!</p>}

        <div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded bg-accent text-bg font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
      )}

      {tab === 'steam' && (
      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-sm text-text-muted mb-1">Steam account</label>
          {profile.steam_id ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <a
                  href={`https://steamcommunity.com/profiles/${profile.steam_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-accent hover:underline"
                >
                  Steam ID: {profile.steam_id}
                </a>
                <button
                  type="button"
                  onClick={handleUnlinkSteam}
                  disabled={saving}
                  className="text-sm text-text-muted hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Unlink
                </button>
              </div>

              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleImportLibrary}
                    disabled={importing}
                    className="flex items-center gap-2 px-4 py-2 rounded bg-[#171a21] text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={importing ? 'animate-spin shrink-0' : 'shrink-0'}>
                      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                      <path d="M3 21v-5h5" />
                    </svg>
                    {importing ? 'Syncing...' : 'Import/Sync Steam library'}
                  </button>
                  {profile.steam_last_synced_at && (
                    <span className="text-xs text-text-muted whitespace-nowrap">
                      Last synced: {new Date(profile.steam_last_synced_at).toLocaleString()}
                    </span>
                  )}
                </div>
                {resetLibraryError && <p className="text-red-400 text-sm mt-2">{resetLibraryError}</p>}
                {importProgress && (
                  <p className="text-xs text-text-muted mt-2">
                    {importProgress.done} / {importProgress.total} processed
                    {importProgress.done === importProgress.total &&
                      ` — ${importProgress.matched} games imported with playtime`}
                  </p>
                )}
                {importError && <p className="text-red-400 text-sm mt-2">{importError}</p>}
                <p className="text-xs text-text-muted mt-2">
                  Imports your Steam playtime for each matched game. New games are added to your "To do" list —
                  you'll still need to set their status manually.
                </p>
                {!confirmResetLibrary ? (
                  <button
                    type="button"
                    onClick={() => setConfirmResetLibrary(true)}
                    className="text-xs text-red-400 hover:underline transition-colors cursor-pointer mt-2"
                  >
                    Reset Steam library
                  </button>
                ) : (
                  <div className="flex flex-col gap-2 items-start mt-2">
                    <p className="text-xs text-text-muted">
                      This will remove all games imported from your Steam library (i.e. with tracked playtime).
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleResetSteamLibrary}
                        disabled={resettingLibrary}
                        className="text-xs text-red-400 hover:underline cursor-pointer disabled:opacity-50"
                      >
                        {resettingLibrary ? 'Resetting...' : 'Yes, reset Steam library'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmResetLibrary(false)}
                        disabled={resettingLibrary}
                        className="text-xs text-text-muted hover:text-text transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleImportWishlist}
                    disabled={importingWishlist}
                    className="flex items-center gap-2 px-4 py-2 rounded bg-[#171a21] text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={importingWishlist ? 'animate-spin shrink-0' : 'shrink-0'}>
                      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                      <path d="M3 21v-5h5" />
                    </svg>
                    {importingWishlist ? 'Syncing...' : 'Import/Sync Steam wishlist'}
                  </button>
                  {profile.steam_last_synced_at && (
                    <span className="text-xs text-text-muted whitespace-nowrap">
                      Last synced: {new Date(profile.steam_last_synced_at).toLocaleString()}
                    </span>
                  )}
                </div>
                {resetWishlistError && <p className="text-red-400 text-sm mt-2">{resetWishlistError}</p>}
                {wishlistProgress && (
                  <p className="text-xs text-text-muted mt-2">
                    {wishlistProgress.done} / {wishlistProgress.total} processed
                    {wishlistProgress.done === wishlistProgress.total &&
                      ` — ${wishlistProgress.matched} games added to your wishlist`}
                  </p>
                )}
                {wishlistError && <p className="text-red-400 text-sm mt-2">{wishlistError}</p>}
                <p className="text-xs text-text-muted mt-2">
                  Adds games from your Steam wishlist to yours. Games you've already logged (in any status) are left
                  untouched.
                </p>
                {!confirmResetWishlist ? (
                  <button
                    type="button"
                    onClick={() => setConfirmResetWishlist(true)}
                    className="text-xs text-red-400 hover:underline transition-colors cursor-pointer mt-2"
                  >
                    Reset Steam wishlist
                  </button>
                ) : (
                  <div className="flex flex-col gap-2 items-start mt-2">
                    <p className="text-xs text-text-muted">
                      This will remove all games in your wishlist.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleResetWishlist}
                        disabled={resettingWishlist}
                        className="text-xs text-red-400 hover:underline cursor-pointer disabled:opacity-50"
                      >
                        {resettingWishlist ? 'Resetting...' : 'Yes, reset Steam wishlist'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmResetWishlist(false)}
                        disabled={resettingWishlist}
                        className="text-xs text-text-muted hover:text-text transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <a
              href={getSteamLoginUrl()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#171a21] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Link Steam account
            </a>
          )}
        </div>
      </div>
      )}

      {tab === 'account' && (
      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-sm text-text-muted mb-1">Email address</label>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-surface rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={handleChangeEmail}
              disabled={savingEmail}
              className="px-4 py-2 rounded bg-surface border border-white/10 text-sm font-semibold hover:text-text text-text-muted transition-colors cursor-pointer disabled:opacity-50"
            >
              {savingEmail ? 'Saving...' : 'Update'}
            </button>
          </div>
          {emailError && <p className="text-red-400 text-sm mt-2">{emailError}</p>}
          {emailSuccess && (
            <p className="text-accent text-sm mt-2">
              Check your inbox to confirm the new email address.
            </p>
          )}
        </div>

        <div className="border-t border-white/10 pt-5 mt-5">
          <label className="block text-sm text-text-muted mb-1">Change password</label>
          <div className="flex flex-col gap-2">
            <PasswordInput
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="w-full bg-surface rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-accent"
            />
            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="w-full bg-surface rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-accent"
            />
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full bg-surface rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-accent"
            />
            <div>
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={savingPassword}
                className="px-4 py-2 rounded bg-surface border border-white/10 text-sm font-semibold hover:text-text text-text-muted transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingPassword ? 'Saving...' : 'Update password'}
              </button>
            </div>
          </div>
          {passwordError && <p className="text-red-400 text-sm mt-2">{passwordError}</p>}
          {passwordSuccess && <p className="text-accent text-sm mt-2">Password updated.</p>}
        </div>

        <div className="border-t border-white/10 pt-5 mt-5">
          {!confirmReset ? (
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="text-sm text-red-400 hover:underline cursor-pointer whitespace-nowrap"
              >
                Reset my account
              </button>
              <span className="text-xs text-text-muted mt-0.5">
                — wipes all your games, ratings, reviews, lists and wishlist, but keeps your account and profile.
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2 items-start">
              <p className="text-sm text-text-muted">
                This will permanently delete all your games, ratings, reviews and lists, but keep your account and
                profile. This cannot be undone.
              </p>
              <PasswordInput
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Enter your password to confirm"
                className="w-full max-w-xs bg-surface rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-accent"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetAccount}
                  disabled={resetting}
                  className="px-4 py-2 rounded bg-white/10 text-text border border-white/20 text-sm font-semibold hover:bg-white/20 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {resetting ? 'Resetting...' : 'Yes, reset my account'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmReset(false)
                    setResetPassword('')
                  }}
                  disabled={resetting}
                  className="text-sm text-text-muted hover:text-text transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              {resetError && <p className="text-red-400 text-sm">{resetError}</p>}
            </div>
          )}
        </div>

        <div className="border-t border-white/10 pt-5 mt-5">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-400 hover:underline cursor-pointer"
            >
              Delete account
            </button>
          ) : (
            <div className="flex flex-col gap-2 items-start">
              <p className="text-sm text-text-muted">
                This will permanently delete your account and all your data. This cannot be undone.
              </p>
              <PasswordInput
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password to confirm"
                className="w-full max-w-xs bg-surface rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-accent"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="px-4 py-2 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-semibold hover:bg-red-500/30 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Yes, delete my account'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDelete(false)
                    setDeletePassword('')
                  }}
                  disabled={deleting}
                  className="text-sm text-text-muted hover:text-text transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              {deleteError && <p className="text-red-400 text-sm">{deleteError}</p>}
            </div>
          )}
        </div>
      </div>
      )}

      {tab === 'blocked' && (
      <div className="flex flex-col gap-5">
        {blockedUsers.length === 0 ? (
          <p className="text-sm text-text-muted">You haven't blocked anyone.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {blockedUsers.map((b) => (
              <div key={b.blocked_id} className="flex items-center justify-between">
                <span className="text-sm text-text-muted">
                  {profileDisplayName(b.profiles)}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await unblockUser(user!.id, b.blocked_id)
                    setBlockedUsers((prev) => prev.filter((u) => u.blocked_id !== b.blocked_id))
                  }}
                  className="text-xs text-text-muted hover:text-text transition-colors cursor-pointer"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  )
}
