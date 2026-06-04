"use client"

import { Suspense, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="m17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/dashboard"
  const callbackError = searchParams.get("error")

  const supabase = createSupabaseBrowserClient()
  const [isPending, startTransition] = useTransition()

  const [mode, setMode] = useState<"password" | "magic">("password")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(
    callbackError ? "Authentication failed. Please try again." : null
  )
  const [magicSent, setMagicSent] = useState(false)

  const handlePasswordLogin = () => {
    if (!email || !password) {
      setError("Please enter your email and password.")
      return
    }
    setError(null)
    startTransition(async () => {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        setError(
          authError.message === "Invalid login credentials"
            ? "Incorrect email or password."
            : authError.message
        )
        return
      }
      router.push(next)
      router.refresh()
    })
  }

  const handleMagicLink = () => {
    if (!email) {
      setError("Please enter your email address.")
      return
    }
    setError(null)
    startTransition(async () => {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
        },
      })
      if (authError) {
        setError(authError.message)
        return
      }
      setMagicSent(true)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (mode === "password") handlePasswordLogin()
      else handleMagicLink()
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {/* Ambient background gradient */}
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255,255,255,0.04) 0%, transparent 100%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.20), 0 12px 32px rgba(0,0,0,0.6)",
            }}
          >
            <span className="text-white text-xl font-bold tracking-tight">P</span>
          </div>
          <div className="text-center">
            <h1 className="text-white/95 text-[22px] font-semibold tracking-tight">PRV</h1>
            <p className="text-white/40 text-[13px] mt-0.5">Company Operating System</p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-[28px] overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.11)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 32px 80px rgba(0,0,0,0.7)",
            backdropFilter: "blur(48px)",
            WebkitBackdropFilter: "blur(48px)",
          }}
        >
          {/* Mode toggle */}
          <div className="flex border-b border-white/[0.08]">
            {(["password", "magic"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m)
                  setError(null)
                  setMagicSent(false)
                }}
                className="flex-1 py-3.5 text-[13px] font-medium transition-all duration-150 relative"
                style={{
                  color: mode === m ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.35)",
                }}
                aria-pressed={mode === m}
              >
                {m === "password" ? "Password" : "Magic link"}
                {mode === m && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-white" />
                )}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-4">
            {magicSent ? (
              <div className="text-center py-4 space-y-3">
                <div
                  className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(255,255,255,0.7)"
                    strokeWidth="1.5"
                  >
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-white/90 text-[15px] font-medium">Check your email</p>
                <p className="text-white/45 text-[13px] leading-relaxed">
                  We sent a sign-in link to
                  <br />
                  <span className="text-white/70">{email}</span>
                </p>
                <button
                  onClick={() => {
                    setMagicSent(false)
                    setEmail("")
                  }}
                  className="text-[13px] text-white/40 hover:text-white/70 transition-colors underline underline-offset-2 mt-2"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <>
                {/* Email field */}
                <div className="space-y-1.5">
                  <label
                    className="text-[12px] font-medium text-white/50 uppercase tracking-wide"
                    htmlFor="email"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full h-11 rounded-[12px] px-3.5 text-[15px] text-white placeholder:text-white/20 transition-all duration-150 focus:outline-none"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      boxShadow: error && !password ? "0 0 0 1px rgba(239,68,68,0.4)" : undefined,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.10)"
                      e.currentTarget.style.border = "1px solid rgba(255,255,255,0.20)"
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.07)"
                      e.currentTarget.style.border = "1px solid rgba(255,255,255,0.10)"
                    }}
                  />
                </div>

                {/* Password field (password mode only) */}
                {mode === "password" && (
                  <div className="space-y-1.5">
                    <label
                      className="text-[12px] font-medium text-white/50 uppercase tracking-wide"
                      htmlFor="password"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full h-11 rounded-[12px] px-3.5 pr-10 text-[15px] text-white placeholder:text-white/20 transition-all duration-150 focus:outline-none"
                        style={{
                          background: "rgba(255,255,255,0.07)",
                          border: "1px solid rgba(255,255,255,0.10)",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.10)"
                          e.currentTarget.style.border = "1px solid rgba(255,255,255,0.20)"
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.07)"
                          e.currentTarget.style.border = "1px solid rgba(255,255,255,0.10)"
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        <EyeIcon open={showPassword} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <p className="text-[13px] text-white/80 bg-white/[0.10] border border-white/[0.20] rounded-[10px] px-3.5 py-2.5">
                    {error}
                  </p>
                )}

                {/* Submit */}
                <button
                  onClick={mode === "password" ? handlePasswordLogin : handleMagicLink}
                  disabled={isPending}
                  className="w-full h-11 rounded-[12px] text-[15px] font-semibold text-black transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: isPending ? "rgba(255,255,255,0.75)" : "#ffffff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                  }}
                >
                  {isPending ? (
                    <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : mode === "password" ? (
                    "Sign in"
                  ) : (
                    "Send magic link"
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/20 text-[12px] mt-8">PRV — Company Operating System</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <LoginForm />
    </Suspense>
  )
}
