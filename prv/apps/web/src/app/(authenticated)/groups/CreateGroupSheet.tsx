"use client"

import { useState } from "react"

const g1 = "var(--prv-g1)"
const g2 = "var(--prv-g2)"
const t1 = "var(--prv-text-1)"
const t2 = "var(--prv-text-2)"
const t3 = "var(--prv-text-3)"
const border = "var(--prv-border)"
const bds = "var(--prv-border-subtle)"

// Lowercase, hyphenate, strip to the slug charset the API accepts (a-z 0-9 - _).
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function CreateGroupSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (groupId: string) => void
}) {
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugEdited, setSlugEdited] = useState(false)
  const [description, setDescription] = useState("")
  const [step, setStep] = useState<"form" | "reauth">("form")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const effectiveSlug = slugEdited ? slug : slugify(name)
  const canSubmit = name.trim().length >= 2 && effectiveSlug.length >= 2

  const submitCreate = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: effectiveSlug,
          ...(description.trim() ? { description: description.trim() } : {}),
        }),
      })
      if (res.status === 201) {
        const body = (await res.json()) as { groupId: string }
        onCreated(body.groupId)
        return
      }
      const body = (await res.json().catch(() => ({}))) as { code?: string; error?: string }
      if (res.status === 403 && String(body.code).toUpperCase() === "REAUTH_REQUIRED") {
        setStep("reauth")
        return
      }
      setError(body.error ?? "Couldn't create the group.")
    } finally {
      setBusy(false)
    }
  }

  const confirmReauth = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/reauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        setError("Re-authentication failed. Check your password and try again.")
        return
      }
      setStep("form")
      setPassword("")
      await submitCreate()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.55)" }}
      />
      <div
        className="relative w-full max-w-[460px] px-5 pt-2.5 pb-7"
        style={{
          background: "var(--prv-g3)",
          backdropFilter: "blur(64px) saturate(200%)",
          WebkitBackdropFilter: "blur(64px) saturate(200%)",
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          border: `1px solid ${border}`,
          borderBottom: 0,
          boxShadow: "0 -24px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.25)",
        }}
      >
        <div
          className="mx-auto mt-1 mb-3.5"
          style={{ width: 38, height: 5, borderRadius: 100, background: "rgba(255,255,255,0.25)" }}
        />

        {step === "form" ? (
          <>
            <h2 className="text-[21px] font-bold tracking-tight" style={{ color: t1 }}>
              New Group
            </h2>
            <p className="text-[13px] mt-1 leading-snug" style={{ color: t2 }}>
              Group multiple companies under one holding for consolidated CEO reporting.
            </p>

            <Field label="Group name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. PRV Group"
                className="w-full bg-transparent border-0 outline-none text-[15px]"
                style={{ color: t1 }}
              />
            </Field>

            <Field label="URL slug">
              <span className="text-[14px] whitespace-nowrap" style={{ color: t3 }}>
                prv.app/groups/
              </span>
              <input
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugEdited(true)
                  setSlug(slugify(e.target.value))
                }}
                placeholder="slug"
                className="flex-1 bg-transparent border-0 outline-none text-[15px]"
                style={{ color: t1 }}
              />
            </Field>

            <Field label="Description · optional">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="What does this group represent?"
                className="w-full bg-transparent border-0 outline-none resize-none text-[15px]"
                style={{ color: t1 }}
              />
            </Field>

            <div
              className="flex items-center gap-2.5 mt-4 px-3.5 py-3 rounded-[14px]"
              style={{ background: g1, border: `1px solid ${bds}` }}
            >
              <span
                className="w-[30px] h-[30px] rounded-[9px] grid place-items-center flex-shrink-0"
                style={{ background: g2 }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={t2}
                  strokeWidth="2"
                  className="w-4 h-4"
                >
                  <rect x="4" y="11" width="16" height="10" rx="2" strokeLinejoin="round" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
                </svg>
              </span>
              <span className="text-[11.5px] leading-snug" style={{ color: t2 }}>
                Creating a group is a platform-level action — you&apos;ll re-authenticate before
                it&apos;s saved.
              </span>
            </div>

            {error && (
              <p className="text-[12px] mt-3" style={{ color: "rgba(255,69,58,0.95)" }}>
                {error}
              </p>
            )}

            <div className="flex gap-2.5 mt-5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 rounded-[16px] text-[14.5px] font-bold"
                style={{ background: g1, border: `1px solid ${border}`, color: t2 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitCreate}
                disabled={!canSubmit || busy}
                className="flex-1 py-3.5 rounded-[16px] text-[14.5px] font-bold disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.92)", color: "#000" }}
              >
                {busy ? "Creating…" : "Create Group"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-[21px] font-bold tracking-tight" style={{ color: t1 }}>
              Confirm it&apos;s you
            </h2>
            <p className="text-[13px] mt-1 leading-snug" style={{ color: t2 }}>
              Re-enter your password to create <span style={{ color: t1 }}>{name.trim()}</span>.
            </p>

            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                className="w-full bg-transparent border-0 outline-none text-[15px]"
                style={{ color: t1 }}
              />
            </Field>

            {error && (
              <p className="text-[12px] mt-3" style={{ color: "rgba(255,69,58,0.95)" }}>
                {error}
              </p>
            )}

            <div className="flex gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => {
                  setStep("form")
                  setError(null)
                }}
                className="flex-1 py-3.5 rounded-[16px] text-[14.5px] font-bold"
                style={{ background: g1, border: `1px solid ${border}`, color: t2 }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={confirmReauth}
                disabled={password.length < 1 || busy}
                className="flex-1 py-3.5 rounded-[16px] text-[14.5px] font-bold disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.92)", color: "#000" }}
              >
                {busy ? "Confirming…" : "Confirm & Create"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <label
        className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ml-0.5"
        style={{ color: t3 }}
      >
        {label}
      </label>
      <div
        className="flex items-center gap-1.5 px-3.5 py-3 rounded-[14px]"
        style={{
          background: g1,
          border: `1px solid ${bds}`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
        }}
      >
        {children}
      </div>
    </div>
  )
}
