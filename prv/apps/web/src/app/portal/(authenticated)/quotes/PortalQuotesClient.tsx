"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export interface PortalQuote {
  id: string
  ref: string
  status: string
  decision: "accepted" | "rejected" | null
  total: number
  currency: string
  issueDate: string
  dueDate: string
  project: string | null
  pending: boolean
}

function state(q: PortalQuote): { label: string; color: string; bg: string; border: string } {
  if (q.pending)
    return {
      label: "Awaiting your decision",
      color: "rgba(255,220,100,0.85)",
      bg: "rgba(255,220,100,0.10)",
      border: "rgba(255,220,100,0.20)",
    }
  if (q.decision === "accepted")
    return {
      label: "Accepted",
      color: "rgba(140,255,140,0.75)",
      bg: "rgba(140,255,140,0.10)",
      border: "rgba(140,255,140,0.18)",
    }
  return {
    label: "Declined",
    color: "rgba(255,255,255,0.30)",
    bg: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.09)",
  }
}

export function PortalQuotesClient({ quotes }: { quotes: PortalQuote[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function decide(id: string, decision: "accepted" | "rejected") {
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/portal/quotes/${id}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      })
      if (!res.ok) throw new Error("Could not save your decision")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1
        className="mb-6 text-2xl font-semibold text-white/95"
        style={{ letterSpacing: "-0.03em" }}
      >
        Quotes
      </h1>

      {error && (
        <div
          className="mb-4 rounded-2xl px-4 py-3 text-sm"
          style={{
            background: "rgba(255,100,100,0.10)",
            border: "1px solid rgba(255,100,100,0.22)",
            color: "rgba(255,150,150,0.95)",
          }}
        >
          {error}
        </div>
      )}

      {quotes.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points="14 2 14 8 20 8"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-sm text-white/45">No quotes to review.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {quotes.map((q) => {
            const st = state(q)
            return (
              <div
                key={q.id}
                className="rounded-[20px] p-5"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-medium text-white/90">{q.ref}</span>
                    <span className="text-xs text-white/35">
                      Issued {new Date(q.issueDate).toLocaleDateString("ro-RO")} · Valid until{" "}
                      {new Date(q.dueDate).toLocaleDateString("ro-RO")}
                      {q.project ? ` · ${q.project}` : ""}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-sm font-semibold text-white/90">
                      {q.total.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} {q.currency}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        color: st.color,
                        background: st.bg,
                        border: `1px solid ${st.border}`,
                      }}
                    >
                      {st.label}
                    </span>
                  </div>
                </div>

                {q.pending && (
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === q.id}
                      onClick={() => decide(q.id, "accepted")}
                      className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all"
                      style={{
                        background: "rgba(140,255,140,0.14)",
                        border: "1px solid rgba(140,255,140,0.25)",
                        color: "rgba(180,255,180,0.95)",
                        cursor: busyId === q.id ? "default" : "pointer",
                        opacity: busyId === q.id ? 0.6 : 1,
                      }}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={busyId === q.id}
                      onClick={() => decide(q.id, "rejected")}
                      className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "rgba(255,255,255,0.75)",
                        cursor: busyId === q.id ? "default" : "pointer",
                        opacity: busyId === q.id ? 0.6 : 1,
                      }}
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
