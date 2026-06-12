import { useState } from 'react'

interface ReportModalProps {
  title: string
  onClose: () => void
  onSubmit: (reason: string) => Promise<void>
}

export function ReportModal({ title, onClose, onSubmit }: ReportModalProps) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    if (!reason.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(reason.trim())
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-lg w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-3">{title}</h2>
        {done ? (
          <>
            <p className="text-sm text-text-muted mb-4">Thanks, your report has been submitted.</p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-accent text-bg font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you reporting this?"
              autoFocus
              rows={4}
              className="w-full bg-bg rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-accent resize-none mb-3"
            />
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !reason.trim()}
                className="px-4 py-2 rounded bg-accent text-bg font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit report'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="text-sm text-text-muted hover:text-text transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
