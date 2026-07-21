"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

interface Swap {
  id: string
  status: string
  requesterId: string
  requester: string | null
  target: string | null
  note: string | null
}

export function ShiftSwaps({ shiftId, currentUserId }: { shiftId: string; currentUserId: string }) {
  const qc = useQueryClient()
  const { data } = useQuery<{ swaps: Swap[] }>({
    queryKey: ["shift-swaps", shiftId],
    queryFn: () => fetch(`/api/schedule/swaps?shiftId=${shiftId}`).then((r) => r.json()),
  })
  const swaps = data?.swaps ?? []
  const pending = swaps.filter((s) => s.status === "pending")

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["shift-swaps", shiftId] })
    void qc.invalidateQueries({ queryKey: ["shift-detail", shiftId] })
  }

  const request = useMutation({
    mutationFn: () =>
      fetch("/api/schedule/swaps", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shiftId }),
      }).then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}))
          throw new Error((d as { error?: string }).error ?? "Request failed")
        }
        return r.json()
      }),
    onSuccess: invalidate,
  })

  const decide = useMutation({
    mutationFn: (v: { id: string; decision: "approve" | "reject" }) =>
      fetch(`/api/schedule/swaps/${v.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision: v.decision }),
      }).then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}))
          throw new Error((d as { error?: string }).error ?? "Failed")
        }
        return r.json()
      }),
    onSuccess: invalidate,
  })

  const cancel = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/schedule/swaps/${id}`, { method: "DELETE" }).then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}))
          throw new Error((d as { error?: string }).error ?? "Failed")
        }
        return r.json()
      }),
    onSuccess: invalidate,
  })

  const busy = request.isPending || decide.isPending || cancel.isPending

  return (
    <div style={{ marginTop: 14 }}>
      <p
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--prv-text-3)",
          fontWeight: 600,
          margin: "0 2px 8px",
        }}
      >
        Swaps
      </p>

      {pending.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
          {pending.map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 11px",
                borderRadius: 11,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12.5, color: "var(--prv-text-1)", margin: 0 }}>
                  {s.requester ?? "Someone"} → {s.target ?? "open cover"}
                </p>
                {s.note && (
                  <p style={{ fontSize: 11, color: "var(--prv-text-3)", margin: "2px 0 0" }}>
                    {s.note}
                  </p>
                )}
              </div>
              {s.requesterId === currentUserId && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => cancel.mutate(s.id)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.05)",
                    color: "var(--prv-text-2)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: busy ? "default" : "pointer",
                  }}
                >
                  Retrage
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => decide.mutate({ id: s.id, decision: "approve" })}
                style={{
                  padding: "5px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(48,209,88,0.3)",
                  background: "rgba(48,209,88,0.14)",
                  color: "rgba(120,240,150,0.95)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: busy ? "default" : "pointer",
                }}
              >
                Approve
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => decide.mutate({ id: s.id, decision: "reject" })}
                style={{
                  padding: "5px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.05)",
                  color: "var(--prv-text-2)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: busy ? "default" : "pointer",
                }}
              >
                Reject
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => request.mutate()}
        style={{
          width: "100%",
          padding: "9px 12px",
          borderRadius: 11,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.05)",
          color: "var(--prv-text-2)",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: busy ? "default" : "pointer",
          opacity: busy ? 0.6 : 1,
        }}
      >
        Request swap for my shift
      </button>
    </div>
  )
}
