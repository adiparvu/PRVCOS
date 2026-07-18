"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export interface PortalContract {
  id: string
  contractNumber: string
  status: string
  value: number
  currency: string
  startDate: string | null
  endDate: string | null
  signedByClient: boolean
  signedByCompany: boolean
  project: string
  signable: boolean
}

function state(c: PortalContract): { label: string; color: string; bg: string; border: string } {
  if (c.signable)
    return {
      label: "Awaiting your signature",
      color: "rgba(255,220,100,0.85)",
      bg: "rgba(255,220,100,0.10)",
      border: "rgba(255,220,100,0.20)",
    }
  if (c.status === "signed" || c.status === "active" || c.status === "completed")
    return {
      label: c.status === "signed" ? "Signed" : c.status === "active" ? "Active" : "Completed",
      color: "rgba(140,255,140,0.75)",
      bg: "rgba(140,255,140,0.10)",
      border: "rgba(140,255,140,0.18)",
    }
  if (c.status === "terminated")
    return {
      label: "Terminated",
      color: "rgba(255,100,100,0.85)",
      bg: "rgba(255,100,100,0.10)",
      border: "rgba(255,100,100,0.20)",
    }
  if (c.signedByClient)
    return {
      label: "Signed by you",
      color: "rgba(140,255,140,0.70)",
      bg: "rgba(140,255,140,0.08)",
      border: "rgba(140,255,140,0.15)",
    }
  return {
    label: "Sent",
    color: "rgba(255,255,255,0.40)",
    bg: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.09)",
  }
}

export function PortalContractsClient({ contracts }: { contracts: PortalContract[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function sign(id: string) {
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/portal/contracts/${id}/sign`, { method: "POST" })
      if (!res.ok) throw new Error("Could not record your signature")
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
        Contracts
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

      {contracts.length === 0 ? (
        <p className="mt-16 text-center text-sm text-white/45">No contracts yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {contracts.map((c) => {
            const st = state(c)
            return (
              <div
                key={c.id}
                className="rounded-[20px] p-5"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-medium text-white/90">{c.contractNumber}</span>
                    <span className="text-xs text-white/35">
                      {c.project}
                      {c.startDate
                        ? ` · from ${new Date(c.startDate).toLocaleDateString("ro-RO")}`
                        : ""}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-sm font-semibold text-white/90">
                      {c.value.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} {c.currency}
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

                {c.signable && (
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() => sign(c.id)}
                    className="mt-4 w-full rounded-xl py-2.5 text-sm font-semibold transition-all"
                    style={{
                      background: "rgba(140,255,140,0.14)",
                      border: "1px solid rgba(140,255,140,0.25)",
                      color: "rgba(180,255,180,0.95)",
                      cursor: busyId === c.id ? "default" : "pointer",
                      opacity: busyId === c.id ? 0.6 : 1,
                    }}
                  >
                    Sign contract
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
