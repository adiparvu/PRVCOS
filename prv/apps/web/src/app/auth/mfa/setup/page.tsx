"use client"

import { useState, useTransition, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "intro" | "scan" | "verify" | "backup" | "done"

interface EnrollData {
  factorId: string
  qrCodeUrl: string
  secret: string
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const LockIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="rgba(255,255,255,0.70)"
    strokeWidth="1.5"
  >
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 018 0v4" />
    <circle cx="12" cy="16" r="1" fill="rgba(255,255,255,0.70)" stroke="none" />
  </svg>
)

const QrIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="rgba(255,255,255,0.70)"
    strokeWidth="1.5"
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3M17 17h3v3M14 20h3" />
  </svg>
)

const ShieldCheckIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="rgba(255,255,255,0.70)"
    strokeWidth="1.5"
  >
    <path d="M9 12l2 2 4-4" />
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const FileIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="rgba(255,255,255,0.70)"
    strokeWidth="1.5"
  >
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)

const CopyIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
)

const DownloadIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
)

const InfoIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="rgba(255,255,255,0.40)"
    strokeWidth="1.5"
    style={{ flexShrink: 0, marginTop: 1 }}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: Step }) {
  const order: Step[] = ["intro", "scan", "verify", "backup"]
  const idx = order.indexOf(step)
  return (
    <div style={{ display: "flex", gap: 4, padding: "20px 24px 0" }}>
      {order.map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 2,
            borderRadius: 2,
            background:
              i < idx
                ? "rgba(255,255,255,0.80)"
                : i === idx
                  ? "rgba(255,255,255,0.40)"
                  : "rgba(255,255,255,0.10)",
            transition: "background 0.4s",
          }}
        />
      ))}
    </div>
  )
}

function StepIcon({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 16,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16)",
      }}
    >
      {children}
    </div>
  )
}

function BtnPrimary({
  onClick,
  disabled,
  loading,
  children,
}: {
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: "100%",
        height: 44,
        background: disabled || loading ? "rgba(255,255,255,0.22)" : "#ffffff",
        color: disabled || loading ? "rgba(0,0,0,0.40)" : "#000000",
        border: "none",
        borderRadius: 12,
        fontSize: 15,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        boxShadow: disabled || loading ? "none" : "0 1px 3px rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        transition: "background 0.12s",
      }}
    >
      {loading ? (
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            border: "2px solid rgba(0,0,0,0.20)",
            borderTopColor: "rgba(0,0,0,0.70)",
            display: "inline-block",
            animation: "spin 0.7s linear infinite",
          }}
        />
      ) : (
        children
      )}
    </button>
  )
}

function BtnSecondary({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        height: 44,
        marginTop: 10,
        background: "transparent",
        color: "rgba(255,255,255,0.38)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 12,
        fontSize: 14,
        cursor: "pointer",
        transition: "all 0.12s",
      }}
    >
      {children}
    </button>
  )
}

const divider = (
  <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "20px 0" }} />
)

// ─── Steps ────────────────────────────────────────────────────────────────────

function StepIntro({ onStart, loading }: { onStart: () => void; loading: boolean }) {
  const router = useRouter()
  return (
    <>
      <StepIcon>
        <LockIcon />
      </StepIcon>
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "rgba(255,255,255,0.95)",
        }}
      >
        Two-factor authentication
      </div>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4, lineHeight: 1.5 }}>
        Add a second layer of security to your account.
      </p>

      {divider}

      <ul
        style={{
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          "Opens your authenticator app each time you sign in",
          "Works offline — no phone signal needed",
          "Required for admin and financial operations",
          "10 one-time backup codes generated on setup",
        ].map((text) => (
          <li
            key={text}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              fontSize: 13,
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.4,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.35)",
                flexShrink: 0,
                marginTop: 5,
              }}
            />
            {text}
          </li>
        ))}
      </ul>

      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.30)", marginBottom: 12 }}>
        Use any TOTP-compatible app:
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { name: "Authenticator", desc: "Google · Microsoft" },
          { name: "1Password", desc: "Bitwarden · Authy" },
        ].map((app) => (
          <div
            key={app.name}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.09)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "rgba(255,255,255,0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="1.5"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.70)" }}>
                {app.name}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.33)" }}>{app.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <BtnPrimary onClick={onStart} loading={loading}>
        Set up authenticator <ArrowIcon />
      </BtnPrimary>
      <BtnSecondary onClick={() => router.back()}>Maybe later</BtnSecondary>
    </>
  )
}

function StepScan({ data, onNext }: { data: EnrollData; onNext: () => void }) {
  const [copied, setCopied] = useState(false)

  const formattedSecret = data.secret
    .toUpperCase()
    .replace(/(.{4})/g, "$1 ")
    .trim()

  const handleCopy = () => {
    void navigator.clipboard.writeText(data.secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <StepIcon>
        <QrIcon />
      </StepIcon>
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "rgba(255,255,255,0.95)",
        }}
      >
        Scan QR code
      </div>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4, lineHeight: 1.5 }}>
        Open your authenticator app and scan the code below.
      </p>

      {divider}

      {/* QR code — Supabase returns a data URI (SVG) */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
        <div
          style={{
            width: 176,
            height: 176,
            borderRadius: 16,
            background: "#fff",
            padding: 12,
            boxShadow: "0 4px 24px rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.qrCodeUrl} alt="TOTP QR code" style={{ width: "100%", height: "100%" }} />
        </div>
      </div>

      {/* Manual secret */}
      <button
        onClick={handleCopy}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(255,255,255,0.055)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 12,
          padding: "10px 14px",
          cursor: "pointer",
          marginBottom: 20,
          transition: "background 0.12s",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.40)"
          strokeWidth="1.5"
          style={{ flexShrink: 0 }}
        >
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
        <span
          style={{
            flex: 1,
            textAlign: "left",
            fontSize: 13,
            color: "rgba(255,255,255,0.60)",
            fontFamily: "ui-monospace,monospace",
            letterSpacing: "0.05em",
          }}
        >
          {formattedSecret}
        </span>
        <span
          style={{
            fontSize: 12,
            color: copied ? "rgba(255,255,255,0.70)" : "rgba(255,255,255,0.28)",
            flexShrink: 0,
          }}
        >
          {copied ? "Copied" : <CopyIcon />}
        </span>
      </button>

      <BtnPrimary onClick={onNext}>
        I&apos;ve scanned the code <ArrowIcon />
      </BtnPrimary>
    </>
  )
}

function StepVerify({
  factorId,
  onSuccess,
  onBack,
}: {
  factorId: string
  onSuccess: (codes: string[]) => void
  onBack: () => void
}) {
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleVerify = useCallback(
    (digits: string) => {
      if (digits.length !== 6) return
      setError(null)
      startTransition(async () => {
        const res = await fetch("/api/auth/totp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ factorId, code: digits }),
        })
        const data = (await res.json()) as { error?: string; backupCodes?: string[] }
        if (!res.ok) {
          setError(data.error ?? "Invalid code. Please try again.")
          setCode("")
          inputRef.current?.focus()
          return
        }
        onSuccess(data.backupCodes ?? [])
      })
    },
    [factorId, onSuccess]
  )

  const handleChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 6)
    setCode(digits)
    setError(null)
    if (digits.length === 6) handleVerify(digits)
  }

  return (
    <>
      <StepIcon>
        <ShieldCheckIcon />
      </StepIcon>
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "rgba(255,255,255,0.95)",
        }}
      >
        Enter verification code
      </div>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4, lineHeight: 1.5 }}>
        Enter the 6-digit code shown in your authenticator app.
      </p>

      {divider}

      {/* Single segmented input rendered as styled boxes */}
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "center",
          marginBottom: 8,
          position: "relative",
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            onClick={() => inputRef.current?.focus()}
            style={{
              width: 44,
              height: 52,
              borderRadius: 12,
              background: code[i] ? "rgba(255,255,255,0.11)" : "rgba(255,255,255,0.07)",
              border: `1px solid ${error ? "rgba(239,68,68,0.50)" : code[i] ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.10)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 600,
              color: "#fff",
              cursor: "text",
              transition: "border-color 0.12s, background 0.12s",
            }}
          >
            {code[i] ?? ""}
          </div>
        ))}
        {/* Hidden real input drives all state */}
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => handleChange(e.target.value)}
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0,
            cursor: "text",
            fontSize: 0,
            border: "none",
            background: "transparent",
          }}
          autoFocus
        />
      </div>

      <p
        style={{
          textAlign: "center",
          fontSize: 12,
          color: "rgba(255,255,255,0.28)",
          marginBottom: 20,
        }}
      >
        Code refreshes every 30 seconds
      </p>

      {error && (
        <p
          style={{
            fontSize: 13,
            marginBottom: 16,
            borderRadius: 10,
            padding: "10px 14px",
            color: "rgba(255,255,255,0.80)",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.14)",
          }}
        >
          {error}
        </p>
      )}

      <BtnPrimary onClick={() => handleVerify(code)} disabled={code.length < 6} loading={isPending}>
        Verify <ArrowIcon />
      </BtnPrimary>
      <BtnSecondary onClick={onBack}>Back</BtnSecondary>
    </>
  )
}

function StepBackup({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [copied, setCopied] = useState(false)

  const handleDownload = () => {
    const text = `PRV — Backup Codes\nGenerated: ${new Date().toISOString()}\n\n${codes.join("\n")}\n\nEach code can only be used once. Store these in a safe place.`
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "prv-backup-codes.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyAll = () => {
    void navigator.clipboard.writeText(codes.join("\n"))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <StepIcon>
        <FileIcon />
      </StepIcon>
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "rgba(255,255,255,0.95)",
        }}
      >
        Save your backup codes
      </div>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4, lineHeight: 1.5 }}>
        Use these if you lose access to your authenticator. Each code can only be used once.
      </p>

      {divider}

      {/* Backup codes grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
        {codes.map((code) => (
          <div
            key={code}
            style={{
              background: "rgba(255,255,255,0.055)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 10,
              padding: "9px 12px",
              fontFamily: "ui-monospace,monospace",
              fontSize: 13,
              letterSpacing: "0.08em",
              color: "rgba(255,255,255,0.75)",
              textAlign: "center",
            }}
          >
            {code}
          </div>
        ))}
      </div>

      {/* Warning */}
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          padding: "12px 14px",
          marginBottom: 20,
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <InfoIcon />
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", lineHeight: 1.5 }}>
          Store these in a safe place. They will not be shown again after you leave this screen.
        </p>
      </div>

      {/* Download / Copy */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { label: "Download", icon: <DownloadIcon />, action: handleDownload },
          { label: copied ? "Copied!" : "Copy all", icon: <CopyIcon />, action: handleCopyAll },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={btn.action}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 10,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.10)",
              fontSize: 13,
              color: "rgba(255,255,255,0.55)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "background 0.12s",
            }}
          >
            {btn.icon}
            {btn.label}
          </button>
        ))}
      </div>

      <BtnPrimary onClick={onDone}>
        I&apos;ve saved my codes <ArrowIcon />
      </BtnPrimary>
    </>
  )
}

function StepDone() {
  const router = useRouter()
  return (
    <div style={{ textAlign: "center", paddingTop: 12 }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.14)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 24px rgba(0,0,0,0.5)",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.80)"
          strokeWidth="1.5"
        >
          <path d="M9 12l2 2 4-4" />
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "rgba(255,255,255,0.95)",
          marginBottom: 8,
        }}
      >
        Two-factor authentication enabled
      </div>
      <p
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.42)",
          lineHeight: 1.55,
          marginBottom: 32,
        }}
      >
        Your account is now protected with an additional layer of security. You&apos;ll be asked for
        a code each time you sign in from a new device.
      </p>
      <div style={{ maxWidth: 240, margin: "0 auto" }}>
        <BtnPrimary onClick={() => router.push("/dashboard")}>Go to dashboard</BtnPrimary>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MfaSetupPage() {
  const [step, setStep] = useState<Step>("intro")
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [startLoading, startTransition] = useTransition()
  const [enrollError, setEnrollError] = useState<string | null>(null)

  const handleStart = () => {
    setEnrollError(null)
    startTransition(async () => {
      const res = await fetch("/api/auth/totp", { method: "POST" })
      const data = (await res.json()) as {
        factorId?: string
        qrCodeUrl?: string
        secret?: string
        error?: string
      }
      if (!res.ok || !data.factorId) {
        setEnrollError(data.error ?? "Failed to start enrollment. Please try again.")
        return
      }
      setEnrollData({
        factorId: data.factorId,
        qrCodeUrl: data.qrCodeUrl ?? "",
        secret: data.secret ?? "",
      })
      setStep("scan")
    })
  }

  const handleVerifySuccess = (codes: string[]) => {
    setBackupCodes(codes)
    setStep("backup")
  }

  return (
    <div
      style={{
        background: "#000",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      {/* Ambient */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255,255,255,0.045) 0%, transparent 100%)",
        }}
      />

      <div style={{ width: "100%", maxWidth: 360, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), 0 12px 32px rgba(0,0,0,0.6)",
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>
              P
            </span>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "rgba(255,255,255,0.95)",
              }}
            >
              PRV
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", marginTop: 2 }}>
              Company Operating System
            </div>
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.11)",
            borderRadius: 28,
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.18), 0 32px 80px rgba(0,0,0,0.72), 0 8px 24px rgba(0,0,0,0.4)",
            backdropFilter: "blur(48px) saturate(180%)",
            WebkitBackdropFilter: "blur(48px) saturate(180%)",
            overflow: "hidden",
          }}
        >
          {step !== "done" && <ProgressBar step={step} />}

          <div style={{ padding: step === "done" ? "32px 24px 28px" : "24px 24px 28px" }}>
            {enrollError && (
              <p
                style={{
                  fontSize: 13,
                  marginBottom: 16,
                  borderRadius: 10,
                  padding: "10px 14px",
                  color: "rgba(255,255,255,0.80)",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              >
                {enrollError}
              </p>
            )}

            {step === "intro" && <StepIntro onStart={handleStart} loading={startLoading} />}
            {step === "scan" && enrollData && (
              <StepScan data={enrollData} onNext={() => setStep("verify")} />
            )}
            {step === "verify" && enrollData && (
              <StepVerify
                factorId={enrollData.factorId}
                onSuccess={handleVerifySuccess}
                onBack={() => setStep("scan")}
              />
            )}
            {step === "backup" && <StepBackup codes={backupCodes} onDone={() => setStep("done")} />}
            {step === "done" && <StepDone />}
          </div>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "rgba(255,255,255,0.16)",
            marginTop: 24,
          }}
        >
          PRV — Company Operating System
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
