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
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
            <path d="M0 .48v23.04h4.22V.48H0zm15.385 0c-4.764 0-8.629 3.862-8.629 8.626 0 4.755 3.865 8.626 8.629 8.626 4.75 0 8.615-3.871 8.615-8.626C24 4.342 20.135.48 15.385.48z" />
          </svg>
          Support on Patreon
        </a>
      </div>
    </footer>
  )
}
