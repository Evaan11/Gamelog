import { useState } from 'react'

/**
 * 5-star rating input with half-star precision.
 * Value is stored in half-star units (1-10), e.g. 5 = 2.5 stars, 9 = 4.5 stars.
 */
interface StarRatingProps {
  value: number | null
  onChange?: (value: number | null) => void
  readOnly?: boolean
  size?: number
}

export function StarRating({ value, onChange, readOnly, size = 28 }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const filled = hovered ?? value ?? 0

  function handleClick(starIndex: number, half: 'left' | 'right') {
    if (readOnly || !onChange) return
    const newValue = starIndex * 2 + (half === 'left' ? 1 : 2)
    onChange(newValue === (value ?? 0) ? null : newValue)
  }

  return (
    <div
      className="inline-flex items-center gap-0.5"
      role={readOnly ? undefined : 'group'}
      onMouseLeave={() => setHovered(null)}
    >
      {[0, 1, 2, 3, 4].map((starIndex) => {
        const starValue = (starIndex + 1) * 2
        const fillLevel =
          filled >= starValue ? 'full' : filled === starValue - 1 ? 'half' : 'empty'

        return (
          <div key={starIndex} className="relative" style={{ width: size, height: size }}>
            <Star fillLevel={fillLevel} size={size} />
            {!readOnly && (
              <>
                <button
                  type="button"
                  aria-label={`${starIndex + 0.5} stars`}
                  className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
                  onMouseEnter={() => setHovered(starIndex * 2 + 1)}
                  onClick={() => handleClick(starIndex, 'left')}
                />
                <button
                  type="button"
                  aria-label={`${starIndex + 1} stars`}
                  className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
                  onMouseEnter={() => setHovered(starIndex * 2 + 2)}
                  onClick={() => handleClick(starIndex, 'right')}
                />
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Star({ fillLevel, size }: { fillLevel: 'full' | 'half' | 'empty'; size: number }) {
  const id = `star-half-${Math.random().toString(36).slice(2)}`

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="text-accent">
      <defs>
        <linearGradient id={id}>
          <stop offset="50%" stopColor="currentColor" />
          <stop offset="50%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7L5.8 21l1.6-7L2 9.2l7.1-.6z"
        fill={fillLevel === 'full' ? 'currentColor' : fillLevel === 'half' ? `url(#${id})` : 'none'}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  )
}
