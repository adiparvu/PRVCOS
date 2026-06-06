"use client"

import { Suspense, useState, useTransition, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

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
      <path d="m17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
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
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )

function passwordStrength(pw: string): { score: number; label: string } {
  if (!pw) return { score: 0, label: "" }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const labels = ["Too short", "Fair", "Good", "Strong"]
  return { score, label: labels[Math.max(0, score - 1)] ?? "Too short" }
}

const STRENGTH_CLASS: Record<number, string> = { 1: "weak", 2: "fair", 3: "good", 4: "strong" }

const STRENGTH_COLOR: Record<string, string> = {
  weak: "rgba(239,68,68,0.75)",
  fair: "rgba(234,179,8,0.75)",
  good: "rgba(255,255,255,0.50)",
  strong: "rgba(255,255,255,0.82)",
}

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const email = searchParams.get("email") ?? ""
  const inviteToken = searchParams.get("token") ?? ""
  const companyId = searchParams.get("company") ?? ""

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const firstRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Redirect to login if required params are missing
    if (!email || !inviteToken || !companyId) {
      router.replace("/auth/login")
    } else {
      firstRef.current?.focus()
    }
  }, [email, inviteToken, companyId, router])

  const { score, label } = passwordStrength(password)
  const strengthCls = STRENGTH_CLASS[score] ?? ""
  const isValid = firstName.trim().length > 0 && lastName.trim().length > 0 && score >= 1

  const handleSubmit = () => {
    if (!isValid) return
    setError(null)
    startTransition(async () => {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          companyId,
          inviteToken,
        }),
      })
      const data = (await res.json()) as { error?: string; code?: string }

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.")
        return
      }

      router.push("/dashboard")
      router.refresh()
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isValid) handleSubmit()
  }

  const inputBase: React.CSSProperties = {
    width: "100%",
    height: 44,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 12,
    padding: "0 14px",
    fontSize: 15,
    color: "#fff",
    outline: "none",
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "#000" }}
    >
      {/* Ambient */}
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255,255,255,0.045) 0%, transparent 100%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <div
            className="w-14 h-14 rounded-[18px] flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), 0 12px 32px rgba(0,0,0,0.6)",
            }}
          >
            <span className="text-white text-xl font-bold tracking-tight">P</span>
          </div>
          <div className="text-center">
            <h1 className="text-white/95 text-[22px] font-semibold tracking-tight">PRV</h1>
            <p className="text-white/38 text-[13px] mt-0.5">Company Operating System</p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-[28px]"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.11)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.18), 0 32px 80px rgba(0,0,0,0.72), 0 8px 24px rgba(0,0,0,0.4)",
            backdropFilter: "blur(48px) saturate(180%)",
            WebkitBackdropFilter: "blur(48px) saturate(180%)",
            padding: "28px 24px 24px",
          }}
        >
          {/* Header */}
          <div className="mb-5">
            <h2 className="text-white/95 text-[18px] font-semibold tracking-tight">
              Accept invitation
            </h2>
            <p className="text-white/42 text-[13px] mt-1">Set up your account to get started</p>
          </div>

          {/* Email badge */}
          <div
            className="flex items-center gap-2 mb-5 rounded-[11px] px-3 py-2"
            style={{
              background: "rgba(255,255,255,0.055)",
              border: "1px solid rgba(255,255,255,0.09)",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="1.5"
              className="shrink-0"
            >
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="flex-1 text-[13px] text-white/60 overflow-hidden text-ellipsis whitespace-nowrap">
              {email}
            </span>
            <span
              className="text-[10px] shrink-0 px-1.5 py-0.5 rounded-md"
              style={{
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.28)",
              }}
            >
              invited
            </span>
          </div>

          {/* Name row */}
          <div className="grid grid-cols-2 gap-2.5 mb-3.5">
            {(
              [
                {
                  id: "first",
                  label: "First name",
                  value: firstName,
                  setter: setFirstName,
                  placeholder: "Ion",
                  ref: firstRef,
                },
                {
                  id: "last",
                  label: "Last name",
                  value: lastName,
                  setter: setLastName,
                  placeholder: "Popescu",
                  ref: undefined,
                },
              ] as const
            ).map((f) => (
              <div key={f.id}>
                <label
                  className="block text-[11px] font-medium uppercase tracking-wide mb-1.5"
                  style={{ color: "rgba(255,255,255,0.42)", letterSpacing: "0.07em" }}
                  htmlFor={f.id}
                >
                  {f.label}
                </label>
                <input
                  id={f.id}
                  ref={"ref" in f ? f.ref : undefined}
                  type="text"
                  autoComplete={f.id === "first" ? "given-name" : "family-name"}
                  placeholder={f.placeholder}
                  value={f.value}
                  onChange={(e) => f.setter(e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={inputBase}
                  onFocus={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.10)"
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.07)"
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"
                  }}
                />
              </div>
            ))}
          </div>

          {/* Password */}
          <div className="mb-1">
            <label
              className="block text-[11px] font-medium uppercase tracking-wide mb-1.5"
              style={{ color: "rgba(255,255,255,0.42)", letterSpacing: "0.07em" }}
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ ...inputBase, paddingRight: 42 }}
                onFocus={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.10)"
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"
                }}
                onBlur={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.07)"
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "rgba(255,255,255,0.28)" }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>

            {/* Strength bars */}
            {password.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 3,
                        borderRadius: 2,
                        background:
                          i <= score
                            ? (STRENGTH_COLOR[strengthCls] ?? "rgba(255,255,255,0.10)")
                            : "rgba(255,255,255,0.10)",
                        transition: "background 0.3s",
                      }}
                    />
                  ))}
                </div>
                <p className="text-[11px] mt-1.5" style={{ color: "rgba(255,255,255,0.32)" }}>
                  {label}
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-4" style={{ height: 1, background: "rgba(255,255,255,0.07)" }} />

          {/* Terms */}
          <p
            className="text-center text-[12px] mb-4"
            style={{ color: "rgba(255,255,255,0.28)", lineHeight: 1.55 }}
          >
            By creating an account you agree to our{" "}
            <a
              href="/legal/terms"
              className="underline underline-offset-2"
              style={{ color: "rgba(255,255,255,0.48)" }}
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="/legal/privacy"
              className="underline underline-offset-2"
              style={{ color: "rgba(255,255,255,0.48)" }}
            >
              Privacy Policy
            </a>
          </p>

          {/* Error */}
          {error && (
            <p
              className="text-[13px] mb-4 rounded-[10px] px-3.5 py-2.5"
              style={{
                color: "rgba(255,255,255,0.80)",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.16)",
              }}
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!isValid || isPending}
            className="w-full h-11 rounded-[12px] text-[15px] font-semibold tracking-tight transition-all duration-150 flex items-center justify-center"
            style={{
              background: isValid && !isPending ? "#ffffff" : "rgba(255,255,255,0.22)",
              color: isValid && !isPending ? "#000000" : "rgba(0,0,0,0.45)",
              boxShadow: isValid && !isPending ? "0 1px 3px rgba(0,0,0,0.4)" : "none",
              cursor: isValid && !isPending ? "pointer" : "not-allowed",
            }}
          >
            {isPending ? (
              <span
                className="inline-block w-4 h-4 rounded-full border-2"
                style={{
                  borderColor: "rgba(0,0,0,0.20)",
                  borderTopColor: "rgba(0,0,0,0.75)",
                  animation: "spin 0.7s linear infinite",
                }}
              />
            ) : (
              "Create account"
            )}
          </button>
        </div>

        <p className="text-center text-white/16 text-[12px] mt-7">PRV — Company Operating System</p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <SignupForm />
    </Suspense>
  )
}
