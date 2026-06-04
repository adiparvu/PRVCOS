"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

export default function VerifyMfaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/dashboard"
  const factorId = searchParams.get("factorId") ?? ""

  const supabase = createSupabaseBrowserClient()
  const [isPending, startTransition] = useTransition()
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Redirect immediately if factorId is missing — no recovery possible (P-10)
  useEffect(() => {
    if (!factorId) {
      router.replace("/auth/login")
    } else {
      inputRef.current?.focus()
    }
  }, [factorId, router])

  // Accept explicit digits string to avoid stale-closure bug on auto-submit (P-18)
  const handleVerify = (digits: string) => {
    if (digits.length !== 6) {
      setError("Enter the 6-digit code from your authenticator app.")
      return
    }
    setError(null)
    startTransition(async () => {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      })
      if (challengeError) {
        setError("Could not initiate MFA challenge. Please try again.")
        return
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: digits,
      })

      if (verifyError) {
        setError(
          verifyError.message.includes("Invalid")
            ? "Incorrect code. Please try again."
            : verifyError.message
        )
        setCode("")
        inputRef.current?.focus()
        return
      }

      router.push(next)
      router.refresh()
    })
  }

  const handleCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6)
    setCode(digits)
    setError(null)
    // Pass digits directly — no setTimeout, no closure risk (P-18)
    if (digits.length === 6) {
      handleVerify(digits)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {/* Ambient */}
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
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="1.5"
            >
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 018 0v4" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-white/95 text-[20px] font-semibold tracking-tight">Verification</h1>
            <p className="text-white/40 text-[13px] mt-0.5">
              Enter the code from your authenticator
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-[28px] p-6 space-y-5"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.11)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 32px 80px rgba(0,0,0,0.7)",
            backdropFilter: "blur(48px)",
            WebkitBackdropFilter: "blur(48px)",
          }}
        >
          {/* Code input */}
          <div className="space-y-1.5">
            <label
              className="text-[12px] font-medium text-white/50 uppercase tracking-wide"
              htmlFor="mfa-code"
            >
              6-digit code
            </label>
            <input
              ref={inputRef}
              id="mfa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerify(code)}
              maxLength={6}
              className="w-full h-14 rounded-[14px] px-4 text-[28px] text-white tracking-[0.4em] font-mono placeholder:text-white/15 placeholder:text-[20px] placeholder:tracking-[0.4em] transition-all duration-150 focus:outline-none text-center"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.10)",
                letterSpacing: "0.4em",
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

          {/* Error */}
          {error && (
            <p className="text-[13px] text-white/80 bg-white/[0.10] border border-white/[0.20] rounded-[10px] px-3.5 py-2.5">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            onClick={() => handleVerify(code)}
            disabled={isPending || code.length !== 6}
            className="w-full h-11 rounded-[12px] text-[15px] font-semibold text-black transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
          >
            {isPending ? (
              <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              "Verify"
            )}
          </button>
        </div>

        {/* Back link */}
        <div className="text-center mt-6">
          <a
            href="/auth/login"
            className="text-[13px] text-white/30 hover:text-white/60 transition-colors"
          >
            Back to sign in
          </a>
        </div>
      </div>
    </div>
  )
}
