"use client"

import { useEffect } from "react"

// Catches errors in the root layout — renders its own <html>/<body>
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#000" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            gap: "1.5rem",
            textAlign: "center",
            padding: "1.5rem",
            fontFamily: "system-ui, sans-serif",
            color: "rgba(255,255,255,0.95)",
          }}
        >
          <p
            style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.75rem", letterSpacing: "0.1em" }}
          >
            CRITICAL ERROR
          </p>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
            Application failed to load
          </h2>
          {error.digest && (
            <p
              style={{
                color: "rgba(255,255,255,0.2)",
                fontSize: "0.75rem",
                fontFamily: "monospace",
              }}
            >
              ref: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: "0.5rem",
              padding: "0.625rem 1.25rem",
              borderRadius: "9999px",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.8)",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
