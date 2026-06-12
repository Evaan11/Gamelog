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
          <svg width="20" height="20" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
            <path d="M548.7,156.2c-156.3,0-283.5,127.1-283.5,283.4c0,155.8,127.2,282.6,283.5,282.6c155.8,0,282.6-126.9,282.6-282.6 C831.3,283.3,704.5,156.2,548.7,156.2z" />
          </svg>
          Support on Patreon
        </a>
      </div>
    </footer>
  )
}
