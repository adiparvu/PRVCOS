"use client"

import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Errors are reported to Sentry via the instrumentation hook
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-1 items-center justify-center min-h-screen bg-black">
      <div className="flex flex-col items-center gap-6 text-center px-6">
        <p className="text-white/40 text-xs font-mono uppercase tracking-widest">Error</p>
        <h2 className="text-white/95 text-xl font-semibold">Something went wrong</h2>
        <p className="text-white/40 text-sm max-w-xs">
          An unexpected error occurred. The issue has been recorded automatically.
        </p>
        {error.digest && <p className="text-white/20 text-xs font-mono">ref: {error.digest}</p>}
        <button
          onClick={reset}
          className="mt-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm backdrop-blur-xl transition-colors hover:bg-white/15 active:bg-white/20"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
