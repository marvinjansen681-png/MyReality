'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[AppError]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-red/10 flex items-center justify-center mb-4">
        <AlertTriangle size={24} className="text-red" />
      </div>

      <h2 className="font-display text-xl font-bold text-primary mb-1">Something went wrong</h2>
      <p className="text-sm text-secondary mb-6 max-w-xs">
        An unexpected error occurred. Try refreshing the page or go back to the dashboard.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2.5 bg-gold text-black text-sm font-semibold rounded-md hover:bg-gold-light transition-colors min-h-[44px]"
        >
          <RefreshCw size={14} />
          Try again
        </button>
        <a
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2.5 border border-[var(--border)] text-secondary text-sm rounded-md hover:bg-hover transition-colors min-h-[44px]"
        >
          <Home size={14} />
          Dashboard
        </a>
      </div>

      {error.digest && (
        <p className="text-[10px] text-muted mt-6 font-mono">Error ID: {error.digest}</p>
      )}
    </div>
  )
}
