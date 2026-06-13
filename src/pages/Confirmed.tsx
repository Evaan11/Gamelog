import { Link } from 'react-router-dom'

export function Confirmed() {
  return (
    <div className="max-w-sm mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold mb-4">Email confirmed</h1>
      <p className="text-text-muted">
        Your email address has been verified. You can now{' '}
        <Link to="/login" className="text-accent">
          sign in
        </Link>
        .
      </p>
    </div>
  )
}
