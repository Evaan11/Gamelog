interface LikeButtonProps {
  active: boolean
  count: number
  onToggle: () => void
  size?: number
}

export function LikeButton({ active, count, onToggle, size = 16 }: LikeButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="group flex items-center gap-1 text-xs text-text-muted hover:text-accent-orange transition-colors cursor-pointer"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className={`transition-colors ${active ? 'text-accent-orange' : 'text-text-muted group-hover:text-accent-orange'}`}
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path d="M12 21s-7.5-4.6-10-9.1C0.3 8.6 2 5 5.5 5c2 0 3.5 1.1 4.5 2.6C11 6.1 12.5 5 14.5 5 18 5 19.7 8.6 22 11.9 19.5 16.4 12 21 12 21z" />
      </svg>
      {count > 0 && <span>{count}</span>}
    </button>
  )
}
