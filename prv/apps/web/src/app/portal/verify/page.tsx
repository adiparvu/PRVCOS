"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"

function VerifyInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState("")
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    const token = searchParams.get("token")
    if (!token) {
      setStatus("error")
      setErrorMessage("Invalid link. Please request a new one.")
      return
    }

    fetch("/api/portal/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus("success")
          setTimeout(() => router.replace("/portal/dashboard"), 1200)
        } else {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          setStatus("error")
          setErrorMessage(data.error ?? "This link is invalid or has already been used.")
        }
      })
      .catch(() => {
        setStatus("error")
        setErrorMessage("Network error. Please check your connection.")
      })
  }, [router, searchParams])

  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-[24px] p-8 text-center"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow:
            "0 24px 64px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
        }}
      >
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
            <p className="text-sm text-white/60">Verifying your link…</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.16)",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="rgba(255,255,255,0.9)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-white/95">Signed in</p>
              <p className="mt-1 text-sm text-white/45">Redirecting to your portal…</p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                <path
                  d="M15 9l-6 6M9 9l6 6"
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-white/90">Link expired</p>
              <p className="mt-1 text-sm text-white/45">{errorMessage}</p>
            </div>
            <a
              href="/portal/login"
              className="mt-2 inline-block rounded-[100px] bg-white px-6 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-80"
            >
              Request a new link
            </a>
          </div>
        )}
      </div>
    </main>
  )
}

export default function PortalVerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="relative z-10 flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
        </main>
      }
    >
      <VerifyInner />
    </Suspense>
  )
}
