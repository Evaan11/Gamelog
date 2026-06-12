import { useState } from 'react'
import { StarRating } from './StarRating'
import { HeartButton } from './HeartButton'

interface ReviewModalProps {
  gameName: string
  review: string
  rating: number | null
  favorite: boolean
  timeToFinishHours: string
  platform: string
  platformOptions: string[]
  onClose: () => void
  onSave: (changes: {
    review: string
    rating: number | null
    favorite: boolean
    timeToFinishHours: string
    platform: string
  }) => void
}

export function ReviewModal({
  gameName,
  review,
  rating,
  favorite,
  timeToFinishHours,
  platform,
  platformOptions,
  onClose,
  onSave,
}: ReviewModalProps) {
  const [draftReview, setDraftReview] = useState(review)
  const [draftRating, setDraftRating] = useState(rating)
  const [draftFavorite, setDraftFavorite] = useState(favorite)
  const [draftTimeToFinish, setDraftTimeToFinish] = useState(timeToFinishHours)
  const [draftPlatform, setDraftPlatform] = useState(platform)

  function handleSave() {
    onSave({
      review: draftReview,
      rating: draftRating,
      favorite: draftFavorite,
      timeToFinishHours: draftTimeToFinish,
      platform: draftPlatform,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-lg w-full max-w-lg max-h-[85vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="font-bold">{gameName}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <div>
            <p className="text-xs text-text-muted font-bold mb-1.5">Rating</p>
            <div className="flex items-center gap-3">
              <StarRating value={draftRating} onChange={setDraftRating} />
              <HeartButton active={draftFavorite} onToggle={() => setDraftFavorite((f) => !f)} />
            </div>
          </div>

          <div>
            <label htmlFor="review-text" className="text-xs text-text-muted font-bold mb-1.5 block">
              Review
            </label>
            <textarea
              id="review-text"
              rows={6}
              value={draftReview}
              onChange={(e) => setDraftReview(e.target.value)}
              className="w-full bg-bg border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent resize-y"
            />
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <label htmlFor="modal-time-to-finish" className="text-xs text-text-muted">
                To finish (h)
              </label>
              <input
                id="modal-time-to-finish"
                type="number"
                min={0}
                step={0.5}
                value={draftTimeToFinish}
                onChange={(e) => setDraftTimeToFinish(e.target.value)}
                className="w-16 bg-bg border border-white/10 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label htmlFor="modal-platform" className="text-xs text-text-muted">
                Platform
              </label>
              <select
                id="modal-platform"
                value={draftPlatform}
                onChange={(e) => setDraftPlatform(e.target.value)}
                className="bg-bg border border-white/10 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-accent cursor-pointer"
              >
                <option value="">-</option>
                {platformOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-text-muted hover:text-text transition-colors cursor-pointer px-3 py-1.5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="text-sm bg-accent text-bg font-bold rounded px-3 py-1.5 hover:opacity-90 transition-opacity cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
