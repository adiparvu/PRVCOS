"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useSheetStack } from "@prv/ui"
import { useVehicleDetail } from "@/lib/api-hooks"
import type { VehicleDetail, MaintenanceStatus } from "@/app/api/fleet/[id]/route"

interface VehicleDetailClientProps {
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

function Skeleton({
  w,
  h,
  radius = 6,
  style,
}: {
  w: number | string
  h: number
  radius?: number
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        background: "rgba(255,255,255,0.07)",
        ...style,
      }}
    />
  )
}

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
  Active: { label: "Active", color: "rgba(48,209,88,.95)", bg: "rgba(48,209,88,.13)" },
  Service: { label: "Service", color: "rgba(255,159,10,.95)", bg: "rgba(255,159,10,.13)" },
  Idle: { label: "Idle", color: "rgba(255,255,255,.55)", bg: "rgba(255,255,255,.08)" },
  Unavailable: { label: "Indisponibil", color: "rgba(255,69,58,.95)", bg: "rgba(255,69,58,.12)" },
}

const TRIP_STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  in_progress: { label: "În curs", color: "rgba(10,132,255,.9)", bg: "rgba(10,132,255,.13)" },
  completed: { label: "Finalizat", color: "rgba(48,209,88,.95)", bg: "rgba(48,209,88,.13)" },
  cancelled: { label: "Anulat", color: "rgba(255,255,255,.55)", bg: "rgba(255,255,255,.08)" },
}

const RECORD_STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: "Programat", color: "rgba(255,159,10,.95)", bg: "rgba(255,159,10,.13)" },
  in_progress: { label: "În curs", color: "rgba(10,132,255,.9)", bg: "rgba(10,132,255,.13)" },
  completed: { label: "Efectuat", color: "rgba(48,209,88,.95)", bg: "rgba(48,209,88,.13)" },
  cancelled: { label: "Anulat", color: "rgba(255,255,255,.55)", bg: "rgba(255,255,255,.08)" },
}

// ── Sheet button helper ───────────────────────────────────────────────────────

type SheetColor = "amber" | "blue" | "red" | "white" | "green"

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
    red: { background: "rgba(255,69,58,.10)", border: "1px solid rgba(255,69,58,.2)" },
    white: { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.09)" },
    green: { background: "rgba(48,209,88,.12)", border: "1px solid rgba(48,209,88,.2)" },
  }
  const labelColor: Record<SheetColor, string> = {
    amber: "rgba(255,159,10,.95)",
    blue: "rgba(10,132,255,.9)",
    red: "rgba(255,69,58,.95)",
    white: "var(--prv-text-1)",
    green: "rgba(48,209,88,.95)",
  }
  const iconBg: Record<SheetColor, string> = {
    amber: "rgba(255,159,10,.18)",
    blue: "rgba(10,132,255,.2)",
    red: "rgba(255,69,58,.15)",
    white: "rgba(255,255,255,.08)",
    green: "rgba(48,209,88,.15)",
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

// ── Main component ────────────────────────────────────────────────────────────

function EditVehicleForm({
  initial,
  onSubmit,
  onCancel,
  pending,
}: {
  initial: { odometer: number; fuelPct: number; notes: string | null }
  onSubmit: (patch: { mileageKm: number; fuelLevelPct: number; notes: string }) => void
  onCancel: () => void
  pending: boolean
}) {
  const [odometer, setOdometer] = useState(String(initial.odometer))
  const [fuel, setFuel] = useState(String(initial.fuelPct))
  const [notes, setNotes] = useState(initial.notes ?? "")

  const odoNum = Math.max(0, Math.round(Number(odometer) || 0))
  const fuelNum = Math.min(100, Math.max(0, Math.round(Number(fuel) || 0)))
  const valid =
    odometer.trim() !== "" &&
    fuel.trim() !== "" &&
    !Number.isNaN(Number(odometer)) &&
    !Number.isNaN(Number(fuel))

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
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <span style={labelStyle}>Odometer (km)</span>
          <input
            inputMode="numeric"
            value={odometer}
            onChange={(e) => setOdometer(e.target.value.replace(/[^0-9]/g, ""))}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <span style={labelStyle}>Fuel level (%)</span>
          <input
            inputMode="numeric"
            value={fuel}
            onChange={(e) => setFuel(e.target.value.replace(/[^0-9]/g, ""))}
            style={inputStyle}
          />
        </div>
      </div>
      <div>
        <span style={labelStyle}>Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Service notes, condition, remarks…"
          style={{ ...inputStyle, minHeight: 70, resize: "vertical", lineHeight: 1.5 }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
        <button
          type="button"
          disabled={pending || !valid}
          onClick={() =>
            onSubmit({ mileageKm: odoNum, fuelLevelPct: fuelNum, notes: notes.trim() })
          }
          style={{
            flex: 1,
            background: valid ? "#fff" : "rgba(255,255,255,0.07)",
            color: valid ? "#000" : "rgba(255,255,255,0.4)",
            border: "none",
            borderRadius: 11,
            padding: 12,
            fontSize: 13.5,
            fontWeight: 700,
            cursor: pending || !valid ? "default" : "pointer",
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

function AssignDriverForm({
  onSubmit,
  onCancel,
  pending,
}: {
  onSubmit: (userId: string) => void
  onCancel: () => void
  pending: boolean
}) {
  const [userId, setUserId] = useState("")
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
        Assign a driver to this vehicle. With a driver and active status it shows as Active.
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
        <option value="">Select a driver…</option>
        {people.map((m) => (
          <option key={m.id} value={m.id}>
            {m.firstName} {m.lastName} · {m.role}
          </option>
        ))}
      </select>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          disabled={pending || !userId}
          onClick={() => onSubmit(userId)}
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
          Assign driver
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

function StartTripForm({
  onSubmit,
  onCancel,
  pending,
  defaultOdometer,
}: {
  onSubmit: (p: {
    driverId?: string
    purpose?: string
    startOdometerKm?: number
    notes?: string
  }) => void
  onCancel: () => void
  pending: boolean
  defaultOdometer: number
}) {
  const [userId, setUserId] = useState("")
  const [purpose, setPurpose] = useState("")
  const [odo, setOdo] = useState(String(defaultOdometer))
  const [notes, setNotes] = useState("")
  const { data: peopleData } = useQuery<{
    members: { id: string; firstName: string; lastName: string; role: string }[]
  }>({
    queryKey: ["people", "picker"],
    queryFn: () => fetch("/api/people?limit=200").then((r) => r.json()),
  })
  const people = peopleData?.members ?? []
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
        Start a journey. The vehicle stays in use until the trip is completed.
      </div>
      <div>
        <span style={labelStyle}>Driver</span>
        <select value={userId} onChange={(e) => setUserId(e.target.value)} style={inputStyle}>
          <option value="">Unassigned</option>
          {people.map((m) => (
            <option key={m.id} value={m.id}>
              {m.firstName} {m.lastName} · {m.role}
            </option>
          ))}
        </select>
      </div>
      <div>
        <span style={labelStyle}>Purpose</span>
        <input
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Delivery, site visit…"
          style={inputStyle}
        />
      </div>
      <div>
        <span style={labelStyle}>Start odometer (km)</span>
        <input
          inputMode="numeric"
          value={odo}
          onChange={(e) => setOdo(e.target.value.replace(/[^0-9]/g, ""))}
          style={inputStyle}
        />
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
              driverId: userId || undefined,
              purpose: purpose.trim() || undefined,
              startOdometerKm: odo.trim() !== "" ? Number(odo) : undefined,
              notes: notes.trim() || undefined,
            })
          }
          style={{
            flex: 1,
            padding: "10px 18px",
            background: "rgba(10,132,255,0.9)",
            border: 0,
            borderRadius: 10,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          Start trip
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

function CompleteTripForm({
  onSubmit,
  onCancel,
  pending,
  startOdometer,
}: {
  onSubmit: (p: { endOdometerKm: number; fuelCost?: number; notes?: string }) => void
  onCancel: () => void
  pending: boolean
  startOdometer: number
}) {
  const [odo, setOdo] = useState("")
  const [fuelCost, setFuelCost] = useState("")
  const [notes, setNotes] = useState("")
  const endNum = Number(odo)
  const valid = odo.trim() !== "" && !Number.isNaN(endNum) && endNum >= startOdometer
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
        Close the trip. Distance is derived from the odometer; start was{" "}
        {startOdometer.toLocaleString()} km.
      </div>
      <div>
        <span style={labelStyle}>End odometer (km)</span>
        <input
          inputMode="numeric"
          value={odo}
          onChange={(e) => setOdo(e.target.value.replace(/[^0-9]/g, ""))}
          style={inputStyle}
        />
        {odo.trim() !== "" && !valid && (
          <p style={{ fontSize: 11, color: "rgba(255,69,58,.9)", margin: "6px 2px 0" }}>
            Must be at or above the start reading.
          </p>
        )}
      </div>
      <div>
        <span style={labelStyle}>Fuel cost (optional)</span>
        <input
          inputMode="decimal"
          value={fuelCost}
          onChange={(e) => setFuelCost(e.target.value.replace(/[^0-9.]/g, ""))}
          style={inputStyle}
        />
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
          disabled={pending || !valid}
          onClick={() =>
            onSubmit({
              endOdometerKm: endNum,
              fuelCost: fuelCost.trim() !== "" ? Number(fuelCost) : undefined,
              notes: notes.trim() || undefined,
            })
          }
          style={{
            flex: 1,
            padding: "10px 18px",
            background: valid ? "rgba(48,209,88,0.9)" : "rgba(255,255,255,0.07)",
            border: 0,
            borderRadius: 10,
            color: valid ? "#fff" : "rgba(255,255,255,0.4)",
            fontSize: 13,
            fontWeight: 600,
            cursor: pending || !valid ? "default" : "pointer",
          }}
        >
          Complete trip
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

function LogMaintenanceForm({
  onSubmit,
  onCancel,
  pending,
}: {
  onSubmit: (p: {
    type: string
    status: "scheduled" | "in_progress"
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
        Open a maintenance record. The vehicle goes out of service until the record is closed.
      </div>
      <div>
        <span style={labelStyle}>Type</span>
        <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
          {["Service", "Reparație", "ITP", "Anvelope", "Altele"].map((t) => (
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
          placeholder="Garage / service"
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

export function VehicleDetailClient({ id }: VehicleDetailClientProps) {
  const { data, isError } = useVehicleDetail(id)
  const vehicle = data?.vehicle ?? null
  const error = isError
  const { openSheet } = useSheetStack()
  const queryClient = useQueryClient()

  const fleetMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetch(`/api/fleet/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Action failed")
        return r.json()
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicle-detail", id] })
      void queryClient.invalidateQueries({ queryKey: ["fleet"] })
      void queryClient.invalidateQueries({ queryKey: ["fleet-readiness"] })
    },
  })

  const { data: tripsData } = useQuery<{
    active: { id: string; startOdometerKm: number } | null
    trips: {
      id: string
      status: string
      purpose: string | null
      driver: string | null
      project: string | null
      distanceKm: number | null
    }[]
  }>({
    queryKey: ["vehicle-trips", id],
    queryFn: () => fetch(`/api/fleet/${id}/trips`).then((r) => r.json()),
    enabled: !!vehicle,
  })
  const activeTrip = tripsData?.active ?? null

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
    queryKey: ["vehicle-maintenance", id],
    queryFn: () => fetch(`/api/fleet/${id}/maintenance`).then((r) => r.json()),
    enabled: !!vehicle,
  })

  const invalidateVehicle = () => {
    void queryClient.invalidateQueries({ queryKey: ["vehicle-detail", id] })
    void queryClient.invalidateQueries({ queryKey: ["fleet"] })
    void queryClient.invalidateQueries({ queryKey: ["fleet-readiness"] })
    void queryClient.invalidateQueries({ queryKey: ["vehicle-trips", id] })
    void queryClient.invalidateQueries({ queryKey: ["vehicle-maintenance", id] })
  }

  const startTripMutation = useMutation({
    mutationFn: (p: {
      driverId?: string
      purpose?: string
      startOdometerKm?: number
      notes?: string
    }) =>
      fetch(`/api/fleet/${id}/trips`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(p),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Could not start trip")
        return r.json()
      }),
    onSuccess: invalidateVehicle,
  })

  const completeTripMutation = useMutation({
    mutationFn: (vars: {
      tripId: string
      endOdometerKm: number
      fuelCost?: number
      notes?: string
    }) =>
      fetch(`/api/fleet/${id}/trips/${vars.tripId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          endOdometerKm: vars.endOdometerKm,
          fuelCost: vars.fuelCost,
          notes: vars.notes,
        }),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Could not complete trip")
        return r.json()
      }),
    onSuccess: invalidateVehicle,
  })

  const maintenanceMutation = useMutation({
    mutationFn: (p: {
      type: string
      status: "scheduled" | "in_progress"
      provider?: string
      cost?: number
      scheduledDate?: string
      notes?: string
    }) =>
      fetch(`/api/fleet/${id}/maintenance`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(p),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Could not log maintenance")
        return r.json()
      }),
    onSuccess: invalidateVehicle,
  })

  const openStartTrip = () => {
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Start Trip",
      render: (onClose) => (
        <StartTripForm
          pending={startTripMutation.isPending}
          defaultOdometer={vehicle?.odometer ?? 0}
          onCancel={onClose}
          onSubmit={(p) => {
            startTripMutation.mutate(p)
            onClose()
          }}
        />
      ),
    })
  }

  const openCompleteTrip = (tripId: string, startOdometer: number) => {
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Complete Trip",
      render: (onClose) => (
        <CompleteTripForm
          pending={completeTripMutation.isPending}
          startOdometer={startOdometer}
          onCancel={onClose}
          onSubmit={(p) => {
            completeTripMutation.mutate({ tripId, ...p })
            onClose()
          }}
        />
      ),
    })
  }

  const openLogMaintenance = () => {
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Log Maintenance",
      render: (onClose) => (
        <LogMaintenanceForm
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

  const openAssignDriver = () => {
    openSheet({
      snapPoints: ["mid"],
      defaultSnap: "mid",
      title: "Assign Driver",
      render: (onClose) => (
        <AssignDriverForm
          pending={fleetMutation.isPending}
          onCancel={onClose}
          onSubmit={(userId) => {
            fleetMutation.mutate({ assignedUserId: userId })
            onClose()
          }}
        />
      ),
    })
  }

  const openEditVehicle = () => {
    if (!vehicle) return
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Edit Vehicle",
      render: (onClose) => (
        <EditVehicleForm
          pending={fleetMutation.isPending}
          initial={{ odometer: vehicle.odometer, fuelPct: vehicle.fuelPct, notes: vehicle.notes }}
          onCancel={onClose}
          onSubmit={(patch) => {
            fleetMutation.mutate(patch)
            onClose()
          }}
        />
      ),
    })
  }

  const handleFAB = () => {
    if (!vehicle) return
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: "Vehicle Actions",
      render: (onClose) => {
        const hasDueSoon = vehicle.maintenance.some(
          (m) => m.status === "Due Soon" || m.status === "Overdue"
        )
        const canReactivate = vehicle.status === "Service" || vehicle.status === "Unavailable"
        const hasDriver = !!vehicle.driver
        return (
          <div
            style={{ padding: "8px 16px 40px", display: "flex", flexDirection: "column", gap: 10 }}
          >
            {activeTrip ? (
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
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                }
                label="Complete Trip"
                sub="Close the trip in progress"
                onClick={() => {
                  onClose()
                  openCompleteTrip(activeTrip.id, activeTrip.startOdometerKm)
                }}
              />
            ) : (
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
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                }
                label="Start Trip"
                sub="Log a new journey"
                onClick={() => {
                  onClose()
                  openStartTrip()
                }}
              />
            )}
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
              label="Schedule Service"
              sub={hasDueSoon ? "Overdue maintenance detected" : "Schedule service"}
              onClick={() => {
                fleetMutation.mutate({ status: "maintenance" })
                onClose()
              }}
            />
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
              label="Assign Driver"
              sub={vehicle.driver ? `Current driver: ${vehicle.driver}` : "No driver assigned"}
              onClick={() => {
                onClose()
                openAssignDriver()
              }}
            />
            {hasDriver && (
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
                    <polyline points="9 14 4 9 9 4" />
                    <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                  </svg>
                }
                label="Release Driver"
                sub={`Unassign ${vehicle.driver}`}
                onClick={() => {
                  fleetMutation.mutate({ assignedUserId: null })
                  onClose()
                }}
              />
            )}
            {canReactivate && (
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
                label="Return to Active"
                sub="Put the vehicle back on the road"
                onClick={() => {
                  fleetMutation.mutate({ status: "active" })
                  onClose()
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
              label="Edit Vehicle"
              sub="Odometer, fuel, notes"
              onClick={() => {
                onClose()
                openEditVehicle()
              }}
            />
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
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              }
              label="Raport Vehicul"
              sub="Export km, consum, costuri"
              onClick={onClose}
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
              label="Mark Unavailable"
              sub="Avarie, blocat sau retras"
              onClick={() => {
                fleetMutation.mutate({ status: "retired" })
                onClose()
              }}
            />
          </div>
        )
      },
    })
  }

  if (error)
    return (
      <div style={{ padding: "80px 16px", textAlign: "center" }}>
        <p style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Vehicle not found.</p>
        <Link
          href="/fleet"
          style={{ fontSize: 14, color: "#7eb8ff", marginTop: 12, display: "block" }}
        >
          ← Back la Fleet
        </Link>
      </div>
    )

  if (!vehicle)
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
          Fleet
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
              <Skeleton w={100} h={22} radius={5} />
              <Skeleton w="60%" h={20} />
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <Skeleton w={50} h={24} radius={8} />
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
                }}
              >
                <Skeleton w="60%" h={14} />
                <Skeleton w="80%" h={10} radius={3} style={{ marginTop: 6 }} />
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

  const trips = tripsData?.trips ?? []
  const serviceRecords = maintData?.records ?? []
  const sc = STATUS_CONFIG[vehicle.status] ?? {
    label: vehicle.status,
    color: "var(--prv-text-3)",
    bg: "var(--prv-border-subtle)",
  }
  const kmToService = vehicle.nextServiceKm - vehicle.odometer
  const kmToServiceColor =
    kmToService < 2000
      ? "rgba(255,69,58,.9)"
      : kmToService < 5000
        ? "rgba(255,159,10,.9)"
        : "var(--prv-text-1)"
  const isActive = vehicle.status === "Active"
  const fuelColor =
    vehicle.fuelPct > 60
      ? "rgba(48,209,88,.6)"
      : vehicle.fuelPct > 30
        ? "rgba(255,159,10,.7)"
        : "rgba(255,69,58,.7)"

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
        href="/fleet"
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
        Fleet
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
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  fontFamily: "monospace",
                  color: "var(--prv-text-1)",
                  background: "var(--prv-g2)",
                  border: "1px solid var(--prv-border-subtle)",
                  padding: "4px 10px",
                  borderRadius: 6,
                  display: "inline-block",
                  marginBottom: 6,
                }}
              >
                {vehicle.plate}
              </span>
              <p style={{ fontSize: 20, fontWeight: 700, color: "var(--prv-text-1)", margin: 0 }}>
                {vehicle.model} {vehicle.year}
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

          {/* Meta pills */}
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
            {[vehicle.type, vehicle.fuel, vehicle.base].map((tag) => (
              <div
                key={tag}
                style={{
                  padding: "4px 9px",
                  borderRadius: 8,
                  background: "var(--prv-g1)",
                  border: "1px solid var(--prv-border-subtle)",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--prv-text-2)",
                }}
              >
                {tag}
              </div>
            ))}
          </div>

          {/* Fuel bar */}
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
              <span>Combustibil</span>
              <span
                style={{
                  color: fuelColor.replace(".6)", ".95)").replace(".7)", ".95)"),
                  fontWeight: 700,
                }}
              >
                {vehicle.fuelPct}%
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
                  width: `${vehicle.fuelPct}%`,
                  height: "100%",
                  borderRadius: 3,
                  background: fuelColor,
                  transition: "width .4s ease",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Live dispatch card — only when Active */}
      {isActive && vehicle.driver && vehicle.assignment && (
        <div
          style={{
            background: "rgba(48,209,88,.05)",
            border: "1px solid rgba(48,209,88,.18)",
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
              background: "linear-gradient(90deg,transparent,rgba(48,209,88,.2),transparent)",
            }}
          />
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(48,209,88,.7)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              margin: "0 0 8px",
            }}
          >
            Active Mission
          </p>
          <p
            style={{ fontSize: 14, fontWeight: 700, color: "var(--prv-text-1)", margin: "0 0 3px" }}
          >
            {vehicle.assignment}
          </p>
          <p style={{ fontSize: 13, color: "var(--prv-text-2)", margin: 0 }}>
            {vehicle.driver} · {vehicle.kmToday} km azi
          </p>
        </div>
      )}

      {/* Odometer tiles */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        {[
          { val: vehicle.odometer.toLocaleString(), label: "Km Total" },
          {
            val: `~${kmToService.toLocaleString()}`,
            label: "Km to Service",
            color: kmToServiceColor,
          },
          { val: String(vehicle.kmToday), label: "Km Azi" },
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

      {/* Documents */}
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
        Documente
      </p>
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
        {[
          { label: "Asigurare RCA", detail: vehicle.insurance },
          { label: "ITP", detail: vehicle.itp },
        ].map((doc, i) => (
          <div
            key={doc.label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: i === 0 ? "1px solid var(--prv-border-subtle)" : "none",
            }}
          >
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--prv-text-1)", margin: 0 }}>
                {doc.label}
              </p>
              <p style={{ fontSize: 11, color: "var(--prv-text-3)", margin: "2px 0 0" }}>
                {doc.detail}
              </p>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: 6,
                background: "rgba(48,209,88,.13)",
                color: "rgba(48,209,88,.95)",
              }}
            >
              Valid
            </span>
          </div>
        ))}
      </div>

      {/* Maintenance */}
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
        Maintenance
      </p>
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
        {vehicle.maintenance.map((rec, i) => {
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
                  i < vehicle.maintenance.length - 1
                    ? "1px solid var(--prv-border-subtle)"
                    : "none",
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

      {/* Trips */}
      {trips.length > 0 && (
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
            Curse Recente
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
            {trips.slice(0, 6).map((t, i) => {
              const st = TRIP_STATUS_STYLE[t.status] ?? {
                label: t.status,
                color: "var(--prv-text-3)",
                bg: "var(--prv-border-subtle)",
              }
              return (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "11px 16px",
                    borderBottom:
                      i < Math.min(trips.length, 6) - 1
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
                      {t.purpose || "Cursă"}
                      {t.driver ? ` · ${t.driver}` : ""}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--prv-text-3)", margin: "2px 0 0" }}>
                      {t.distanceKm != null
                        ? `${t.distanceKm.toLocaleString()} km`
                        : "în desfășurare"}
                      {t.project ? ` · ${t.project}` : ""}
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

      {/* Activity */}
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
        Activitate Azi
      </p>
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
        {vehicle.activity.map((evt, i) => (
          <div
            key={evt.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 16px",
              borderBottom:
                i < vehicle.activity.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontFamily: "monospace",
                color: "var(--prv-text-3)",
                width: 36,
                flexShrink: 0,
                paddingTop: 2,
              }}
            >
              {evt.time}
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: evt.color, margin: 0 }}>
                {evt.label}
              </p>
              <p style={{ fontSize: 11, color: "var(--prv-text-3)", margin: "2px 0 0" }}>
                {evt.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

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
