interface HeartButtonProps {
  active: boolean
  onToggle?: () => void
  readOnly?: boolean
  size?: number
}

export function HeartButton({ active, onToggle, readOnly, size = 24 }: HeartButtonProps) {
  const icon = (
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
  )

  if (readOnly) {
    return <span title={active ? 'Favorite' : undefined}>{icon}</span>
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      className="group cursor-pointer hover:scale-110 transition-transform"
    >
      {icon}
    </button>
  )
}
