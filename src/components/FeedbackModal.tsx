import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { sendFeedback } from '../lib/moderation'

interface FeedbackModalProps {
  onClose: () => void
}

export function FeedbackModal({ onClose }: FeedbackModalProps) {
  const { user } = useAuth()
  const [message, setMessage] = useState('')
  const [isBug, setIsBug] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    if (!user || !message.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await sendFeedback(user.id, message.trim(), isBug)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send feedback')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface rounded-lg w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-3">Feedback</h2>
        {done ? (
          <>
            <p className="text-sm text-text-muted mb-4">Thanks, your message has been sent!</p>
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
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What's on your mind?"
              autoFocus
              rows={4}
              className="w-full bg-bg rounded px-3 py-2 text-sm border border-white/10 focus:outline-none focus:border-accent resize-none mb-3"
            />
            <label className="flex items-center gap-2 text-sm text-text-muted mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isBug}
                onChange={(e) => setIsBug(e.target.checked)}
                className="cursor-pointer"
              />
              This is a bug report
            </label>
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !message.trim()}
                className="px-4 py-2 rounded bg-accent text-bg font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Sending...' : 'Send'}
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
