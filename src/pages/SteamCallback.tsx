import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { verifySteamCallback } from '../lib/steam'
import { updateProfile } from '../lib/profiles'

export function SteamCallback() {
  const { user, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    verifySteamCallback(searchParams)
      .then((steamId) => updateProfile(user.id, { steam_id: steamId }))
      .then(() => {
        if (!cancelled) setDone(true)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to link Steam account')
      })

    return () => {
      cancelled = true
    }
  }, [user, searchParams])

  if (authLoading) return null
  if (!user) return <Navigate to="/login" replace />
  if (done) return <Navigate to="/settings" replace />

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      {error ? (
        <div>
          <p className="text-red-400 mb-4">{error}</p>
          <a href="/settings" className="text-accent hover:underline">
            Back to settings
          </a>
        </div>
      ) : (
        <p className="text-text-muted">Linking your Steam account...</p>
      )}
    </div>
  )
}
