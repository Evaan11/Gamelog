import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="border-t border-white/10 py-6 mt-12">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-4 text-xs text-text-muted">
        <Link to="/legal" className="hover:text-text transition-colors">
          Legal notice & privacy policy
        </Link>
      </div>
    </footer>
  )
}
