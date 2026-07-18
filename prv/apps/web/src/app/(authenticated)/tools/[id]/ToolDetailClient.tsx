"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useToolDetail } from "@/lib/api-hooks"
import Link from "next/link"
import { useSheetStack } from "@prv/ui"
import type { ToolDetail, MaintenanceStatus } from "@/app/api/tools/[id]/route"

interface ToolDetailClientProps {
  id: string
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconChevronLeft() {
  return (
    <svg
      width="9"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function Skeleton({ w, h, radius = 6 }: { w: number | string; h: number; radius?: number }) {
  return (
    <div
      style={{ width: w, height: h, borderRadius: radius, background: "rgba(255,255,255,0.07)" }}
    />
  )
}

// ── Config ────────────────────────────────────────────────────────────────────

const MAINTENANCE_STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; dot: string; label: string }
> = {
  Done: {
    color: "rgba(48,209,88,.95)",
    bg: "rgba(48,209,88,.13)",
    dot: "rgba(48,209,88,.85)",
    label: "Efectuat",
  },
  "Due Soon": {
    color: "rgba(255,159,10,.95)",
    bg: "rgba(255,159,10,.13)",
    dot: "rgba(255,159,10,.85)",
    label: "Scadent",
  },
  Overdue: {
    color: "rgba(255,69,58,.95)",
    bg: "rgba(255,69,58,.12)",
    dot: "rgba(255,69,58,.85)",
    label: "Restant",
  },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Available: { label: "Available", color: "rgba(48,209,88,.95)", bg: "rgba(48,209,88,.13)" },
  "In Use": { label: "Occupied", color: "rgba(10,132,255,.9)", bg: "rgba(10,132,255,.13)" },
  Maintenance: { label: "Service", color: "rgba(255,159,10,.95)", bg: "rgba(255,159,10,.13)" },
  Missing: { label: "Missing", color: "rgba(255,69,58,.95)", bg: "rgba(255,69,58,.12)" },
}

const RECORD_STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: "Programat", color: "rgba(255,159,10,.95)", bg: "rgba(255,159,10,.13)" },
  in_progress: { label: "În curs", color: "rgba(10,132,255,.9)", bg: "rgba(10,132,255,.13)" },
  completed: { label: "Efectuat", color: "rgba(48,209,88,.95)", bg: "rgba(48,209,88,.13)" },
  cancelled: { label: "Anulat", color: "rgba(255,255,255,.55)", bg: "rgba(255,255,255,.08)" },
}

// ── Sheet button helper ───────────────────────────────────────────────────────

type SheetColor = "amber" | "blue" | "green" | "red" | "white"

function SheetBtn({
  color,
  icon,
  label,
  sub,
  onClick,
}: {
  color: SheetColor
  icon: React.ReactNode
  label: string
  sub: string
  onClick: () => void
}) {
  const styles: Record<SheetColor, React.CSSProperties> = {
    amber: { background: "rgba(255,159,10,.10)", border: "1px solid rgba(255,159,10,.2)" },
    blue: { background: "rgba(10,132,255,.15)", border: "1px solid rgba(10,132,255,.25)" },
    green: { background: "rgba(48,209,88,.10)", border: "1px solid rgba(48,209,88,.2)" },
    red: { background: "rgba(255,69,58,.10)", border: "1px solid rgba(255,69,58,.2)" },
    white: { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.09)" },
  }
  const labelColor: Record<SheetColor, string> = {
    amber: "rgba(255,159,10,.95)",
    blue: "rgba(10,132,255,.9)",
    green: "rgba(48,209,88,.95)",
    red: "rgba(255,69,58,.95)",
    white: "var(--prv-text-1)",
  }
  const iconBg: Record<SheetColor, string> = {
    amber: "rgba(255,159,10,.18)",
    blue: "rgba(10,132,255,.2)",
    green: "rgba(48,209,88,.18)",
    red: "rgba(255,69,58,.15)",
    white: "rgba(255,255,255,.08)",
  }
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        borderRadius: 14,
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        ...styles[color],
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: iconBg[color],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, color: labelColor[color], margin: 0 }}>
          {label}
        </p>
        <p style={{ fontSize: 12, color: "var(--prv-text-3)", margin: "2px 0 0" }}>{sub}</p>
      </div>
    </button>
  )
}

// ── Utilisation bar ───────────────────────────────────────────────────────────

function UtilBar({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? "rgba(10,132,255,.7)" : pct >= 50 ? "rgba(48,209,88,.6)" : "rgba(255,255,255,.3)"
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--prv-text-2)",
          marginBottom: 6,
        }}
      >
        <span>Utilizare</span>
        <span
          style={{
            color: color.replace(".7)", ".95)").replace(".6)", ".95)").replace(".3)", ".7)"),
            fontWeight: 700,
          }}
        >
          {pct}%
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: "var(--prv-border)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 3,
            background: color,
            transition: "width .4s ease",
          }}
        />
      </div>
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "var(--prv-text-3)",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        margin: "0 2px 10px",
      }}
    >
      {children}
    </p>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

function EditToolForm({
  initial,
  onSubmit,
  onCancel,
  pending,
}: {
  initial: { storeId: string | null; notes: string | null }
  onSubmit: (patch: { storeId: string | null; notes: string }) => void
  onCancel: () => void
  pending: boolean
}) {
  const [storeId, setStoreId] = useState(initial.storeId ?? "")
  const [notes, setNotes] = useState(initial.notes ?? "")
  const { data: storesData } = useQuery<{ stores: { id: string; name: string }[] }>({
    queryKey: ["stores", "picker"],
    queryFn: () => fetch("/api/stores?limit=200").then((r) => r.json()),
  })
  const stores = storesData?.stores ?? []

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--prv-text-3)",
    fontWeight: 600,
    display: "block",
    marginBottom: 6,
  }
  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 12,
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    fontFamily: "inherit",
  }

  return (
    <div style={{ padding: "12px 18px 40px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <span style={labelStyle}>Store / location</span>
        <select value={storeId} onChange={(e) => setStoreId(e.target.value)} style={inputStyle}>
          <option value="">Unassigned</option>
          {stores.map((st) => (
            <option key={st.id} value={st.id}>
              {st.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <span style={labelStyle}>Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Condition, accessories, remarks…"
          style={{ ...inputStyle, minHeight: 80, resize: "vertical", lineHeight: 1.5 }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
        <button
          type="button"
          disabled={pending}
          onClick={() => onSubmit({ storeId: storeId || null, notes: notes.trim() })}
          style={{
            flex: 1,
            background: "#fff",
            color: "#000",
            border: "none",
            borderRadius: 11,
            padding: 12,
            fontSize: 13.5,
            fontWeight: 700,
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.75)",
            borderRadius: 11,
            padding: "12px 20px",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function CheckoutForm({
  onSubmit,
  onCancel,
  pending,
}: {
  onSubmit: (payload: { custodianId: string; expectedReturnAt?: string; notes?: string }) => void
  onCancel: () => void
  pending: boolean
}) {
  const [userId, setUserId] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [checkoutNotes, setCheckoutNotes] = useState("")
  const { data: peopleData } = useQuery<{
    members: { id: string; firstName: string; lastName: string; role: string }[]
  }>({
    queryKey: ["people", "picker"],
    queryFn: () => fetch("/api/people?limit=200").then((r) => r.json()),
  })
  const people = peopleData?.members ?? []
  return (
    <div style={{ padding: "12px 16px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, color: "var(--prv-text-3)", lineHeight: 1.5, padding: "0 2px" }}>
        Check this tool out to an employee — it moves to In Use and is recorded in the custody
        ledger.
      </div>
      <select
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          padding: 12,
          color: "rgba(255,255,255,0.92)",
          fontSize: 13.5,
          fontFamily: "inherit",
        }}
      >
        <option value="">Select an employee…</option>
        {people.map((m) => (
          <option key={m.id} value={m.id}>
            {m.firstName} {m.lastName} · {m.role}
          </option>
        ))}
      </select>
      <div>
        <span
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--prv-text-3)",
            fontWeight: 600,
            display: "block",
            marginBottom: 6,
          }}
        >
          Expected return (optional)
        </span>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: 12,
            color: "rgba(255,255,255,0.92)",
            fontSize: 13.5,
            fontFamily: "inherit",
          }}
        />
      </div>
      <textarea
        value={checkoutNotes}
        onChange={(e) => setCheckoutNotes(e.target.value)}
        placeholder="Checkout notes (optional)…"
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          padding: 12,
          color: "rgba(255,255,255,0.92)",
          fontSize: 13.5,
          fontFamily: "inherit",
          minHeight: 60,
          resize: "vertical",
          lineHeight: 1.5,
        }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          disabled={pending || !userId}
          onClick={() =>
            onSubmit({
              custodianId: userId,
              expectedReturnAt: dueDate ? new Date(dueDate).toISOString() : undefined,
              notes: checkoutNotes.trim() || undefined,
            })
          }
          style={{
            padding: "10px 18px",
            background: userId ? "rgba(10,132,255,0.9)" : "rgba(255,255,255,0.07)",
            border: 0,
            borderRadius: 10,
            color: userId ? "#fff" : "rgba(255,255,255,0.4)",
            fontSize: 13,
            fontWeight: 600,
            cursor: pending || !userId ? "default" : "pointer",
          }}
        >
          Check out
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "10px 18px",
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            color: "rgba(255,255,255,0.75)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function ReturnForm({
  onSubmit,
  onCancel,
  pending,
  custodianName,
}: {
  onSubmit: (payload: {
    conditionNotes?: string
    damageReported: boolean
    damageNotes?: string
  }) => void
  onCancel: () => void
  pending: boolean
  custodianName: string | null
}) {
  const [conditionNotes, setConditionNotes] = useState("")
  const [damage, setDamage] = useState(false)
  const [damageNotes, setDamageNotes] = useState("")

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 12,
    color: "rgba(255,255,255,0.92)",
    fontSize: 13.5,
    fontFamily: "inherit",
  }

  return (
    <div style={{ padding: "12px 16px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, color: "var(--prv-text-3)", lineHeight: 1.5, padding: "0 2px" }}>
        Return this tool{custodianName ? ` from ${custodianName}` : ""}. Reporting damage sends it
        to maintenance instead of back into the pool.
      </div>
      <textarea
        value={conditionNotes}
        onChange={(e) => setConditionNotes(e.target.value)}
        placeholder="Condition on return (optional)…"
        style={{ ...inputStyle, minHeight: 60, resize: "vertical", lineHeight: 1.5 }}
      />
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 13.5,
          color: "var(--prv-text-1)",
          cursor: "pointer",
        }}
      >
        <input type="checkbox" checked={damage} onChange={(e) => setDamage(e.target.checked)} />
        Report damage (tool → maintenance)
      </label>
      {damage && (
        <textarea
          value={damageNotes}
          onChange={(e) => setDamageNotes(e.target.value)}
          placeholder="Describe the damage…"
          style={{ ...inputStyle, minHeight: 60, resize: "vertical", lineHeight: 1.5 }}
        />
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            onSubmit({
              conditionNotes: conditionNotes.trim() || undefined,
              damageReported: damage,
              damageNotes: damage ? damageNotes.trim() || undefined : undefined,
            })
          }
          style={{
            padding: "10px 18px",
            background: damage ? "rgba(255,159,10,0.9)" : "rgba(48,209,88,0.9)",
            border: 0,
            borderRadius: 10,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {damage ? "Return as damaged" : "Confirm return"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "10px 18px",
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            color: "rgba(255,255,255,0.75)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function ToolMaintenanceForm({
  onSubmit,
  onCancel,
  pending,
}: {
  onSubmit: (p: {
    type: string
    status: "scheduled" | "in_progress"
    description?: string
    provider?: string
    cost?: number
    scheduledDate?: string
    notes?: string
  }) => void
  onCancel: () => void
  pending: boolean
}) {
  const [type, setType] = useState("Service")
  const [inProgress, setInProgress] = useState(false)
  const [provider, setProvider] = useState("")
  const [cost, setCost] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [notes, setNotes] = useState("")
  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 12,
    color: "rgba(255,255,255,0.92)",
    fontSize: 13.5,
    fontFamily: "inherit",
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--prv-text-3)",
    fontWeight: 600,
    display: "block",
    marginBottom: 6,
  }
  return (
    <div style={{ padding: "12px 16px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, color: "var(--prv-text-3)", lineHeight: 1.5, padding: "0 2px" }}>
        Open a maintenance record. The tool goes out of service until the record is closed.
      </div>
      <div>
        <span style={labelStyle}>Type</span>
        <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
          {["Service", "Reparație", "Calibrare", "Inspecție", "Altele"].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 13.5,
          color: "var(--prv-text-1)",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={inProgress}
          onChange={(e) => setInProgress(e.target.checked)}
        />
        Start now (in progress)
      </label>
      <div>
        <span style={labelStyle}>Provider (optional)</span>
        <input
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          placeholder="Service / workshop"
          style={inputStyle}
        />
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <span style={labelStyle}>Cost (optional)</span>
          <input
            inputMode="decimal"
            value={cost}
            onChange={(e) => setCost(e.target.value.replace(/[^0-9.]/g, ""))}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <span style={labelStyle}>Scheduled date</span>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>
      <div>
        <span style={labelStyle}>Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ ...inputStyle, minHeight: 56, resize: "vertical", lineHeight: 1.5 }}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            onSubmit({
              type,
              status: inProgress ? "in_progress" : "scheduled",
              provider: provider.trim() || undefined,
              cost: cost.trim() !== "" ? Number(cost) : undefined,
              scheduledDate: scheduledDate || undefined,
              notes: notes.trim() || undefined,
            })
          }
          style={{
            flex: 1,
            padding: "10px 18px",
            background: "rgba(255,159,10,0.9)",
            border: 0,
            borderRadius: 10,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          Log maintenance
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "10px 18px",
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            color: "rgba(255,255,255,0.75)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export function ToolDetailClient({ id }: ToolDetailClientProps) {
  const { data: toolData, isError } = useToolDetail(id)
  const tool = toolData?.tool ?? null
  const error = isError
  const { openSheet } = useSheetStack()
  const queryClient = useQueryClient()

  const { data: maintData } = useQuery<{
    records: {
      id: string
      type: string
      status: string
      provider: string | null
      cost: number | null
      scheduledDate: string | null
    }[]
  }>({
    queryKey: ["tool-maintenance", id],
    queryFn: () => fetch(`/api/tools/${id}/maintenance`).then((r) => r.json()),
  })

  const toolMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetch(`/api/tools/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Action failed")
        return r.json()
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tool-detail", id] })
      void queryClient.invalidateQueries({ queryKey: ["tools"] })
      void queryClient.invalidateQueries({ queryKey: ["tool-inventory"] })
      void queryClient.invalidateQueries({ queryKey: ["tool-checkouts", id] })
    },
  })

  const invalidateTool = () => {
    void queryClient.invalidateQueries({ queryKey: ["tool-detail", id] })
    void queryClient.invalidateQueries({ queryKey: ["tools"] })
    void queryClient.invalidateQueries({ queryKey: ["tool-inventory"] })
    void queryClient.invalidateQueries({ queryKey: ["tool-checkouts", id] })
    void queryClient.invalidateQueries({ queryKey: ["tool-maintenance", id] })
  }

  const checkoutMutation = useMutation({
    mutationFn: (payload: { custodianId: string; expectedReturnAt?: string; notes?: string }) =>
      fetch(`/api/tools/${id}/checkout`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Checkout failed")
        return r.json()
      }),
    onSuccess: invalidateTool,
  })

  const returnMutation = useMutation({
    mutationFn: (payload: {
      conditionNotes?: string
      damageReported: boolean
      damageNotes?: string
    }) =>
      fetch(`/api/tools/${id}/return`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Return failed")
        return r.json()
      }),
    onSuccess: invalidateTool,
  })

  const maintenanceMutation = useMutation({
    mutationFn: (p: {
      type: string
      status: "scheduled" | "in_progress"
      description?: string
      provider?: string
      cost?: number
      scheduledDate?: string
      notes?: string
    }) =>
      fetch(`/api/tools/${id}/maintenance`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(p),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Could not log maintenance")
        return r.json()
      }),
    onSuccess: invalidateTool,
  })

  const openLogMaintenance = () => {
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Log Maintenance",
      render: (onClose) => (
        <ToolMaintenanceForm
          pending={maintenanceMutation.isPending}
          onCancel={onClose}
          onSubmit={(p) => {
            maintenanceMutation.mutate(p)
            onClose()
          }}
        />
      ),
    })
  }

  const openCheckout = () => {
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Check Out Tool",
      render: (onClose) => (
        <CheckoutForm
          pending={checkoutMutation.isPending}
          onCancel={onClose}
          onSubmit={(payload) => {
            checkoutMutation.mutate(payload)
            onClose()
          }}
        />
      ),
    })
  }

  const openReturn = () => {
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Return Tool",
      render: (onClose) => (
        <ReturnForm
          pending={returnMutation.isPending}
          custodianName={tool?.assignedTo ?? null}
          onCancel={onClose}
          onSubmit={(payload) => {
            returnMutation.mutate(payload)
            onClose()
          }}
        />
      ),
    })
  }

  const openConfirmMissing = () => {
    openSheet({
      snapPoints: ["mid"],
      defaultSnap: "mid",
      title: "Mark Missing",
      render: (onClose) => (
        <div
          style={{ padding: "8px 16px 40px", display: "flex", flexDirection: "column", gap: 14 }}
        >
          <p style={{ fontSize: 13.5, color: "var(--prv-text-2)", lineHeight: 1.5, margin: 0 }}>
            Mark this tool as lost or stolen? It is removed from availability and any current holder
            is unassigned.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                toolMutation.mutate({ status: "lost", assignedUserId: null })
                onClose()
              }}
              style={{
                flex: 1,
                background: "rgba(255,69,58,0.92)",
                color: "#fff",
                border: "none",
                borderRadius: 11,
                padding: 12,
                fontSize: 13.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Mark missing
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.75)",
                borderRadius: 11,
                padding: "12px 20px",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Keep
            </button>
          </div>
        </div>
      ),
    })
  }

  const openEditTool = () => {
    if (!tool) return
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Edit Tool",
      render: (onClose) => (
        <EditToolForm
          pending={toolMutation.isPending}
          initial={{ storeId: tool.storeId, notes: tool.notes }}
          onCancel={onClose}
          onSubmit={(patch) => {
            toolMutation.mutate(patch)
            onClose()
          }}
        />
      ),
    })
  }

  const handleFAB = () => {
    if (!tool) return
    const isInUse = tool.status === "In Use"
    const hasOverdue = tool.maintenance.some((m) => m.status === "Overdue")

    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Tool Actions",
      render: (onClose) => (
        <div
          style={{ padding: "8px 16px 40px", display: "flex", flexDirection: "column", gap: 10 }}
        >
          <SheetBtn
            color="blue"
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(10,132,255,.9)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="23" y1="11" x2="23" y2="17" />
                <line x1="20" y1="14" x2="26" y2="14" />
              </svg>
            }
            label="Check Out"
            sub={isInUse ? `Assigned: ${tool.assignedTo ?? "—"}` : "Assign to an employee"}
            onClick={() => {
              onClose()
              openCheckout()
            }}
          />
          <SheetBtn
            color="amber"
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,159,10,.9)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            }
            label="Trimite la Service"
            sub={hasOverdue ? "Overdue maintenance detected" : "Schedule service"}
            onClick={() => {
              toolMutation.mutate({ status: "maintenance", assignedUserId: null })
              onClose()
            }}
          />
          <SheetBtn
            color="amber"
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,159,10,.9)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            }
            label="Log Maintenance"
            sub="Record a service with cost & provider"
            onClick={() => {
              onClose()
              openLogMaintenance()
            }}
          />
          {isInUse && (
            <SheetBtn
              color="green"
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(48,209,88,.9)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              }
              label="Mark Returned"
              sub={`Retur de la ${tool.assignedTo ?? "—"}`}
              onClick={() => {
                onClose()
                openReturn()
              }}
            />
          )}
          <SheetBtn
            color="white"
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,.7)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            }
            label="Edit Tool"
            sub="Store & notes"
            onClick={() => {
              onClose()
              openEditTool()
            }}
          />
          <SheetBtn
            color="red"
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,69,58,.9)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            }
            label="Mark Missing"
            sub="Lost or stolen tool"
            onClick={() => {
              onClose()
              openConfirmMissing()
            }}
          />
        </div>
      ),
    })
  }

  if (error)
    return (
      <div style={{ padding: "80px 16px", textAlign: "center" }}>
        <p style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Tool not found.</p>
        <Link
          href="/tools"
          style={{ fontSize: 14, color: "#7eb8ff", marginTop: 12, display: "block" }}
        >
          ← Back la Scule
        </Link>
      </div>
    )

  if (!tool)
    return (
      <div
        style={{
          padding: "32px 16px 120px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 24,
            color: "var(--prv-text-2)",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <IconChevronLeft />
          Scule
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              padding: 16,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Skeleton w={80} h={11} radius={3} />
              <Skeleton w="70%" h={20} />
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <Skeleton w={60} h={24} radius={8} />
                <Skeleton w={55} h={24} radius={8} />
              </div>
              <Skeleton w="100%" h={6} radius={3} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: "var(--prv-g1)",
                  border: "1px solid var(--prv-border-subtle)",
                  borderRadius: 14,
                  padding: "11px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <Skeleton w="60%" h={14} />
                <Skeleton w="80%" h={10} radius={3} />
              </div>
            ))}
          </div>
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              height: 100,
            }}
          />
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              height: 140,
            }}
          />
        </div>
      </div>
    )

  const serviceRecords = maintData?.records ?? []
  const sc = STATUS_CONFIG[tool.status] ?? {
    label: tool.status,
    color: "var(--prv-text-3)",
    bg: "var(--prv-border-subtle)",
  }
  const isInUse = tool.status === "In Use"

  return (
    <div
      style={{
        padding: "32px 16px 140px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Back */}
      <Link
        href="/tools"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--prv-text-2)",
          fontSize: 14,
          fontWeight: 500,
          textDecoration: "none",
          marginBottom: 20,
        }}
      >
        <IconChevronLeft />
        Scule
      </Link>

      {/* Hero card */}
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 20,
          position: "relative",
          overflow: "hidden",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "0 0 auto",
            height: 1,
            background: "linear-gradient(90deg,transparent,var(--prv-border),transparent)",
          }}
        />
        <div style={{ padding: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "var(--prv-text-3)",
                  margin: "0 0 4px",
                }}
              >
                {tool.category}
              </p>
              <p style={{ fontSize: 20, fontWeight: 700, color: "var(--prv-text-1)", margin: 0 }}>
                {tool.name}
              </p>
              <p style={{ fontSize: 13, color: "var(--prv-text-2)", margin: "2px 0 0" }}>
                {tool.model}
              </p>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: 6,
                background: sc.bg,
                color: sc.color,
                flexShrink: 0,
              }}
            >
              {sc.label}
            </span>
          </div>

          {/* Stat tiles */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[
              {
                val: `${tool.utilisationPct}%`,
                label: "Utilizare",
                color:
                  tool.utilisationPct >= 80
                    ? "rgba(10,132,255,.9)"
                    : tool.utilisationPct >= 50
                      ? "rgba(48,209,88,.9)"
                      : "var(--prv-text-2)",
              },
              { val: String(tool.usesThisMonth), label: "Monthly Use", color: undefined },
              { val: `€${tool.valueEur.toLocaleString()}`, label: "Valoare", color: undefined },
            ].map((tile) => (
              <div
                key={tile.label}
                style={{
                  flex: 1,
                  padding: "9px 10px",
                  borderRadius: 12,
                  background: "var(--prv-g2)",
                  border: "1px solid var(--prv-border-subtle)",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: tile.color ?? "var(--prv-text-1)",
                    margin: 0,
                  }}
                >
                  {tile.val}
                </p>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--prv-text-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    margin: "3px 0 0",
                  }}
                >
                  {tile.label}
                </p>
              </div>
            ))}
          </div>

          {/* Utilisation bar */}
          <UtilBar pct={tool.utilisationPct} />
        </div>
      </div>

      {/* Assignment card — only when In Use */}
      {isInUse && (
        <div
          style={{
            background: "rgba(10,132,255,.05)",
            border: "1px solid rgba(10,132,255,.18)",
            borderRadius: 16,
            padding: "13px 14px",
            marginBottom: 14,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "0 0 auto",
              height: 1,
              background: "linear-gradient(90deg,transparent,rgba(10,132,255,.2),transparent)",
            }}
          />
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(10,132,255,.7)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              margin: "0 0 8px",
            }}
          >
            Asignat
          </p>
          <p
            style={{ fontSize: 14, fontWeight: 700, color: "var(--prv-text-1)", margin: "0 0 3px" }}
          >
            {tool.assignedTo ?? "—"}
          </p>
          <p style={{ fontSize: 13, color: "var(--prv-text-2)", margin: 0 }}>
            {tool.site ?? "—"} · Retur {tool.dueBack ?? "—"}
          </p>
        </div>
      )}

      {/* Service overdue alert */}
      {tool.serviceOverdueDays !== null && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            borderRadius: 14,
            background: "rgba(255,69,58,.06)",
            border: "1px solid rgba(255,69,58,.18)",
            marginBottom: 14,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,69,58,.9)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,69,58,.95)", margin: 0 }}>
            Service overdue {tool.serviceOverdueDays} days · Requires urgent attention
          </p>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        {[
          { val: `${tool.ageYears}yr`, label: "Age" },
          { val: tool.lastService, label: "Ultim Service" },
          { val: tool.nextService, label: "Next Service" },
        ].map((tile) => (
          <div
            key={tile.label}
            style={{
              flex: 1,
              padding: "11px 12px",
              borderRadius: 14,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--prv-text-1)", margin: 0 }}>
              {tile.val}
            </p>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--prv-text-3)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: "3px 0 0",
              }}
            >
              {tile.label}
            </p>
          </div>
        ))}
      </div>

      {/* Specifications */}
      <SectionLabel>Specifications</SectionLabel>
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 18,
          position: "relative",
          overflow: "hidden",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "0 0 auto",
            height: 1,
            background: "linear-gradient(90deg,transparent,var(--prv-border),transparent)",
          }}
        />
        {tool.specs.map((spec, i) => (
          <div
            key={spec.key}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "11px 16px",
              borderBottom:
                i < tool.specs.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
            }}
          >
            <p style={{ fontSize: 13, color: "var(--prv-text-3)", margin: 0 }}>{spec.key}</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--prv-text-1)", margin: 0 }}>
              {spec.val}
            </p>
          </div>
        ))}
      </div>

      {/* Maintenance */}
      <SectionLabel>Maintenance</SectionLabel>
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 18,
          position: "relative",
          overflow: "hidden",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "0 0 auto",
            height: 1,
            background: "linear-gradient(90deg,transparent,var(--prv-border),transparent)",
          }}
        />
        {tool.maintenance.map((rec, i) => {
          const msc = MAINTENANCE_STATUS_CONFIG[rec.status as MaintenanceStatus] ?? {
            color: "var(--prv-text-3)",
            bg: "var(--prv-border-subtle)",
            dot: "rgba(255,255,255,.35)",
            label: rec.status,
          }
          return (
            <div
              key={rec.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 16px",
                borderBottom:
                  i < tool.maintenance.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: msc.dot,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--prv-text-1)", margin: 0 }}>
                  {rec.label}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color:
                      rec.status === "Done"
                        ? "var(--prv-text-3)"
                        : msc.color.replace(".95)", ".7)").replace(".9)", ".7)"),
                    margin: "2px 0 0",
                  }}
                >
                  {rec.detail}
                </p>
              </div>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  padding: "3px 7px",
                  borderRadius: 5,
                  background: msc.bg,
                  color: msc.color,
                  flexShrink: 0,
                }}
              >
                {msc.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Service records */}
      {serviceRecords.length > 0 && (
        <>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--prv-text-3)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              margin: "0 2px 10px",
            }}
          >
            Service Records
          </p>
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              overflow: "hidden",
              marginBottom: 14,
            }}
          >
            {serviceRecords.slice(0, 6).map((r, i) => {
              const st = RECORD_STATUS_STYLE[r.status] ?? {
                label: r.status,
                color: "var(--prv-text-3)",
                bg: "var(--prv-border-subtle)",
              }
              return (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "11px 16px",
                    borderBottom:
                      i < Math.min(serviceRecords.length, 6) - 1
                        ? "1px solid var(--prv-border-subtle)"
                        : "none",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--prv-text-1)",
                        margin: 0,
                      }}
                    >
                      {r.type}
                      {r.provider ? ` · ${r.provider}` : ""}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--prv-text-3)", margin: "2px 0 0" }}>
                      {r.cost != null ? `${r.cost.toLocaleString()} RON` : "—"}
                      {r.scheduledDate ? ` · ${r.scheduledDate}` : ""}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      padding: "3px 7px",
                      borderRadius: 5,
                      background: st.bg,
                      color: st.color,
                      flexShrink: 0,
                    }}
                  >
                    {st.label}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* FAB */}
      <button
        onClick={handleFAB}
        style={{
          position: "fixed",
          bottom: 100,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: 26,
          background: "rgba(255,255,255,.12)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(0,0,0,.5)",
          color: "rgba(255,255,255,.9)",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
      </button>
    </div>
  )
}
