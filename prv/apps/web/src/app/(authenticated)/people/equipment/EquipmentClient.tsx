"use client"

import { useState } from "react"
import {
  useEquipmentAssignments,
  useAssignEquipment,
  useUpdateEquipment,
  usePeople,
  type EquipmentAssignment,
} from "@/lib/api-hooks"

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: "14px 16px",
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--prv-text-3)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          marginTop: 6,
          color: warn ? "rgba(255,159,10,0.95)" : "var(--prv-text-1)",
        }}
      >
        {value}
      </div>
    </div>
  )
}

function Badge({ item }: { item: EquipmentAssignment }) {
  const [color, bg, border, text] = item.overdue
    ? ["rgba(255,159,10,0.95)", "rgba(255,159,10,0.14)", "rgba(255,159,10,0.28)", "Overdue"]
    : item.status === "returned"
      ? ["rgba(48,209,88,0.9)", "rgba(48,209,88,0.12)", "rgba(48,209,88,0.26)", "Returned"]
      : item.status === "lost"
        ? ["rgba(255,69,58,0.9)", "rgba(255,69,58,0.14)", "rgba(255,69,58,0.3)", "Lost"]
        : ["var(--prv-text-2)", "transparent", "var(--prv-border)", "Assigned"]
  return (
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        borderRadius: 100,
        padding: "3px 9px",
        color,
        background: bg,
        border: `1px solid ${border}`,
      }}
    >
      {text}
    </span>
  )
}

function Row({ item, onReturn }: { item: EquipmentAssignment; onReturn: (id: string) => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "14px 16px",
        borderBottom: "1px solid var(--prv-border-subtle)",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: "var(--prv-g2)",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
          color: "var(--prv-text-2)",
        }}
      >
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 640, letterSpacing: "-0.01em" }}>
          {item.label || item.equipmentType}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--prv-text-3)",
            marginTop: 3,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span>{item.userName ?? "—"}</span>
          {item.serialNumber && (
            <span style={{ fontFamily: "'SF Mono', monospace" }}>SN · {item.serialNumber}</span>
          )}
          <span style={{ textTransform: "capitalize" }}>{item.condition}</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--prv-text-3)", marginTop: 5 }}>
          Assigned {item.assignedDate}
          {item.returnedDate
            ? ` → returned ${item.returnedDate}`
            : item.expectedReturnDate
              ? ` → due ${item.expectedReturnDate}`
              : " → no return date"}
        </div>
      </div>
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
        }}
      >
        <Badge item={item} />
        {item.status === "assigned" && (
          <button
            onClick={() => onReturn(item.id)}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--prv-text-2)",
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border)",
              borderRadius: 100,
              padding: "4px 12px",
              cursor: "pointer",
            }}
          >
            Mark returned
          </button>
        )}
      </div>
    </div>
  )
}

export function EquipmentClient() {
  const { data, isLoading } = useEquipmentAssignments()
  const { data: peopleData } = usePeople()
  const assign = useAssignEquipment()
  const update = useUpdateEquipment()

  const items = data?.items ?? []
  const meta = data?.meta
  const people = peopleData?.members ?? []

  const [showForm, setShowForm] = useState(false)
  const [userId, setUserId] = useState("")
  const [type, setType] = useState("")
  const [serial, setSerial] = useState("")
  const [expected, setExpected] = useState("")

  const today = new Date().toISOString().slice(0, 10)

  function submit() {
    if (!userId || !type.trim()) return
    assign.mutate(
      {
        userId,
        equipmentType: type.trim(),
        label: type.trim(),
        serialNumber: serial.trim() || null,
        assignedDate: today,
        expectedReturnDate: expected.trim() || null,
      },
      {
        onSuccess: () => {
          setType("")
          setSerial("")
          setExpected("")
          setShowForm(false)
        },
      }
    )
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "8px 4px 60px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--prv-text-3)",
            }}
          >
            People · Equipment
          </div>
          <h1
            style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-0.02em", margin: "3px 0 0" }}
          >
            Equipment Assignments
          </h1>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            padding: "9px 16px",
            borderRadius: 100,
            background: showForm ? "var(--prv-g2)" : "rgba(255,255,255,0.92)",
            color: showForm ? "var(--prv-text-1)" : "#000",
            border: showForm ? "1px solid var(--prv-border)" : "none",
            fontSize: 13,
            fontWeight: 640,
            cursor: "pointer",
          }}
        >
          {showForm ? "Cancel" : "＋ Assign"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          margin: "20px 0 22px",
        }}
      >
        <Stat label="Total" value={meta?.total ?? 0} />
        <Stat label="Out now" value={meta?.assigned ?? 0} />
        <Stat label="Overdue" value={meta?.overdue ?? 0} warn={!!meta?.overdue} />
        <Stat label="Returned" value={meta?.returned ?? 0} />
      </div>

      {showForm && (
        <div
          style={{
            borderRadius: 20,
            padding: 16,
            marginBottom: 22,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <Field label="Employee">
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              style={{ ...inp, minWidth: 150 }}
            >
              <option value="">Select…</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Equipment">
            <input
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g. Hammer drill"
              style={{ ...inp, minWidth: 160 }}
            />
          </Field>
          <Field label="Serial">
            <input
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              placeholder="optional"
              style={{ ...inp, width: 120 }}
            />
          </Field>
          <Field label="Due back">
            <input
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              placeholder="YYYY-MM-DD"
              style={{ ...inp, width: 130 }}
            />
          </Field>
          <button
            onClick={submit}
            disabled={!userId || !type.trim() || assign.isPending}
            style={{
              padding: "9px 18px",
              borderRadius: 100,
              background: "rgba(255,255,255,0.92)",
              color: "#000",
              border: "none",
              fontSize: 13,
              fontWeight: 640,
              cursor: "pointer",
              opacity: userId && type.trim() && !assign.isPending ? 1 : 0.5,
            }}
          >
            Assign
          </button>
        </div>
      )}

      <div
        style={{
          borderRadius: 22,
          overflow: "hidden",
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
        }}
      >
        {isLoading ? (
          <p style={{ padding: "40px 20px", textAlign: "center", color: "var(--prv-text-4)" }}>
            Loading equipment…
          </p>
        ) : items.length === 0 ? (
          <p
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--prv-text-4)",
              fontSize: 14,
            }}
          >
            No equipment assigned yet. Use “Assign” to issue an item to an employee.
          </p>
        ) : (
          items.map((it) => (
            <Row
              key={it.id}
              item={it}
              onReturn={(id) => update.mutate({ id, patch: { status: "returned" } })}
            />
          ))
        )}
      </div>
    </div>
  )
}

const inp: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  color: "var(--prv-text-1)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--prv-text-3)",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}
