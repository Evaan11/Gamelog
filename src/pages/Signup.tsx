import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getProfileByUsername } from '../lib/profiles'
import { PasswordInput } from '../components/PasswordInput'

function passwordError(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain at least one letter and one number.'
  }
  return null
}

export function Signup() {
  const { signUp } = useAuth()
  const [username, setUsername] = useState('')
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const pwError = passwordError(password)
    if (pwError) {
      setError(pwError)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const existing = await getProfileByUsername(username.trim())
      if (existing) {
        setError('This username is already taken.')
        setLoading(false)
        return
      }

      await signUp(email, password, username.trim(), displayNameInput)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Check your inbox</h1>
        <p className="text-text-muted">
          We sent a confirmation link to <span className="text-text">{email}</span>. Confirm
          your email then{' '}
          <Link to="/login" className="text-accent">
            sign in
          </Link>
          .
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-6">Create your account</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm text-text-muted mb-1" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            type="text"
            required
            minLength={3}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-surface border border-white/10 rounded px-3 py-2 focus:outline-none focus:border-accent"
          />
          <p className="text-xs text-text-muted mt-1">Used to sign in and as your @handle. Must be unique.</p>
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1" htmlFor="displayName">
            Display name <span className="text-text-muted">(optional)</span>
          </label>
          <input
            id="displayName"
            type="text"
            value={displayNameInput}
            onChange={(e) => setDisplayNameInput(e.target.value)}
            placeholder={username || 'How others will see your name'}
            className="w-full bg-surface border border-white/10 rounded px-3 py-2 focus:outline-none focus:border-accent"
          />
          <p className="text-xs text-text-muted mt-1">Can be changed anytime in settings. Doesn't need to be unique.</p>
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-surface border border-white/10 rounded px-3 py-2 focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1" htmlFor="password">
            Password
          </label>
          <PasswordInput
            id="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-surface border border-white/10 rounded px-3 py-2 focus:outline-none focus:border-accent"
          />
          <p className="text-xs text-text-muted mt-1">At least 8 characters, including a letter and a number.</p>
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1" htmlFor="confirmPassword">
            Confirm password
          </label>
          <PasswordInput
            id="confirmPassword"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-surface border border-white/10 rounded px-3 py-2 focus:outline-none focus:border-accent"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-accent text-bg font-semibold px-4 py-2 rounded hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>

      <p className="text-sm text-text-muted mt-4">
        Already have an account?{' '}
        <Link to="/login" className="text-accent">
          Sign in
        </Link>
      </p>
    </div>
  )
}
