import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="border-t border-white/10 py-6 mt-12">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-4 text-xs text-text-muted">
        <Link to="/legal" className="hover:text-text transition-colors">
          Legal notice & privacy policy
        </Link>
        <a
          href="https://patreon.com/gameloggd"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:text-text transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 569 546" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
            <circle cx="362.589" cy="204.518" r="204.518" />
            <rect x="0" y="0" width="100" height="545.792" />
          </svg>
          Support on Patreon
        </a>
      </div>
    </footer>
  )
}
