"use client"

import { useState } from "react"
import type { FormEvent } from "react"

export default function PortalLoginPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Derive company slug from URL — e.g. /portal/login?company=prv-renovations
  const companySlug =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("company") ?? "prv")
      : "prv"

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/portal/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, companySlug, portalType: "client" }),
      })

      if (res.status === 429) {
        setError("Too many requests. Please wait a few minutes before trying again.")
        return
      }

      if (!res.ok) {
        setError("Something went wrong. Please try again.")
        return
      }

      setSubmitted(true)
    } catch {
      setError("Network error. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16">
      {/* Logo */}
      <div className="mb-12 flex flex-col items-center gap-3">
        <span
          className="text-2xl font-bold tracking-tight text-white"
          style={{ letterSpacing: "-0.04em" }}
        >
          PRV
        </span>
        <span className="text-sm text-white/40">Client Portal</span>
      </div>

      {/* Glass card */}
      <div
        className="w-full max-w-sm rounded-[24px] p-8"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow:
            "0 24px 64px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
        }}
      >
        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.16)",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points="22,6 12,13 2,6"
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-white/95">Check your inbox</p>
              <p className="mt-1 text-sm text-white/50">
                We sent a sign-in link to <span className="text-white/75">{email}</span>. It expires
                in 15 minutes.
              </p>
            </div>
            <button
              type="button"
              className="mt-2 text-sm text-white/40 underline-offset-2 hover:text-white/60 hover:underline transition-colors"
              onClick={() => {
                setSubmitted(false)
                setEmail("")
              }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <h1
              className="mb-1 text-xl font-semibold text-white/95"
              style={{ letterSpacing: "-0.02em" }}
            >
              Sign in
            </h1>
            <p className="mb-8 text-sm text-white/45">
              Enter your email to receive a one-time sign-in link.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-medium text-white/50 uppercase tracking-wider"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white/90 placeholder:text-white/25 outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.28)"
                    e.currentTarget.style.background = "rgba(255,255,255,0.10)"
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.12)"
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)"
                  }}
                />
              </div>

              {error && <p className="text-xs text-red-400/80">{error}</p>}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full rounded-[100px] py-3.5 text-sm font-semibold text-black transition-all disabled:opacity-40"
                style={{
                  background: loading ? "rgba(255,255,255,0.75)" : "#ffffff",
                  boxShadow: "0 4px 16px rgba(255,255,255,0.15)",
                }}
              >
                {loading ? "Sending…" : "Send sign-in link"}
              </button>
            </form>
          </>
        )}
      </div>

      <p className="mt-8 text-xs text-white/20">
        Secure portal access · PRV Company Operating System
      </p>
    </main>
  )
}
