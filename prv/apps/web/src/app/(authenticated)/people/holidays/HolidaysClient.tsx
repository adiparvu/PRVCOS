"use client"

import { useState } from "react"
import { usePublicHolidays, useAddHoliday, useDeleteHoliday, type Holiday } from "@/lib/api-hooks"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const MONTH_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

// Group holidays (already sorted) by month index.
function groupByMonth(holidays: Holiday[]): { month: number; items: Holiday[] }[] {
  const map = new Map<number, Holiday[]>()
  for (const h of holidays) {
    const m = Number(h.date.slice(5, 7)) - 1
    const arr = map.get(m) ?? []
    arr.push(h)
    map.set(m, arr)
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([month, items]) => ({ month, items }))
}

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function HolidaysClient() {
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(thisYear)
  const { data, isLoading } = usePublicHolidays(year)
  const add = useAddHoliday()
  const del = useDeleteHoliday()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [date, setDate] = useState("")
  const [recurring, setRecurring] = useState(true)

  const holidays = data?.holidays ?? []
  const groups = groupByMonth(holidays)

  function submit() {
    if (!name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return
    add.mutate(
      { name: name.trim(), date, isRecurring: recurring },
      {
        onSuccess: () => {
          setName("")
          setDate("")
          setShowForm(false)
        },
      }
    )
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "8px 4px 60px" }}>
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
            People · Calendar
          </div>
          <h1
            style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-0.02em", margin: "3px 0 0" }}
          >
            Public Holidays
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
          {showForm ? "Cancel" : "＋ Add"}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0 8px" }}>
        <button onClick={() => setYear((y) => y - 1)} style={navBtn} aria-label="Previous year">
          ‹
        </button>
        <span
          style={{
            fontSize: 15,
            fontWeight: 680,
            minWidth: 96,
            textAlign: "center",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {year} · {data?.count ?? 0} days
        </span>
        <button onClick={() => setYear((y) => y + 1)} style={navBtn} aria-label="Next year">
          ›
        </button>
      </div>

      {showForm && (
        <div
          style={{
            borderRadius: 20,
            padding: 16,
            margin: "12px 0",
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <label style={fieldWrap}>
            <span style={fieldLbl}>Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Labour Day"
              style={{ ...inp, minWidth: 170 }}
            />
          </label>
          <label style={fieldWrap}>
            <span style={fieldLbl}>Date</span>
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="YYYY-MM-DD"
              style={{ ...inp, width: 130 }}
            />
          </label>
          <label style={{ ...fieldWrap, flexDirection: "row", alignItems: "center", gap: 7 }}>
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
            />
            <span style={{ fontSize: 12, color: "var(--prv-text-2)" }}>Recurring</span>
          </label>
          <button
            onClick={submit}
            disabled={add.isPending}
            style={{
              padding: "9px 18px",
              borderRadius: 100,
              background: "rgba(255,255,255,0.92)",
              color: "#000",
              border: "none",
              fontSize: 13,
              fontWeight: 640,
              cursor: "pointer",
              opacity: add.isPending ? 0.5 : 1,
            }}
          >
            Add
          </button>
        </div>
      )}

      {isLoading ? (
        <p style={{ padding: "40px 20px", color: "var(--prv-text-4)" }}>Loading holidays…</p>
      ) : holidays.length === 0 ? (
        <p
          style={{
            padding: "40px 20px",
            textAlign: "center",
            color: "var(--prv-text-4)",
            fontSize: 14,
            borderRadius: 20,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            marginTop: 12,
          }}
        >
          No holidays for {year}. Use “Add” to build the calendar.
        </p>
      ) : (
        groups.map((g) => (
          <div key={g.month}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--prv-text-3)",
                margin: "18px 4px 10px",
              }}
            >
              {MONTH_FULL[g.month]}
            </div>
            <div
              style={{
                borderRadius: 20,
                overflow: "hidden",
                background: "var(--prv-g1)",
                border: "1px solid var(--prv-border-subtle)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
              }}
            >
              {g.items.map((h) => (
                <HolidayRow key={h.id} h={h} onDelete={() => del.mutate(h.id)} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function HolidayRow({ h, onDelete }: { h: Holiday; onDelete: () => void }) {
  const day = Number(h.date.slice(8, 10))
  const monthIdx = Number(h.date.slice(5, 7)) - 1
  const weekday = WEEKDAY[new Date(h.date + "T00:00:00Z").getUTCDay()]
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "13px 16px",
        borderBottom: "1px solid var(--prv-border-subtle)",
      }}
    >
      <div
        style={{
          width: 44,
          height: 46,
          borderRadius: 12,
          background: "var(--prv-g2)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 720, lineHeight: 1 }}>{day}</span>
        <span
          style={{
            fontSize: 8.5,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--prv-text-3)",
            marginTop: 2,
          }}
        >
          {MONTHS[monthIdx]}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 640, letterSpacing: "-0.01em" }}>{h.name}</div>
        <div
          style={{
            fontSize: 11,
            color: "var(--prv-text-3)",
            marginTop: 3,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span
            style={{
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 100,
              padding: "1px 8px",
            }}
          >
            {h.isRecurring ? "Recurring" : `One-off · ${h.date.slice(0, 4)}`}
          </span>
          {h.weekend && <span style={{ color: "var(--prv-text-4)" }}>· {weekday}</span>}
        </div>
      </div>
      <button
        onClick={onDelete}
        aria-label="Remove holiday"
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          border: "1px solid var(--prv-border-subtle)",
          background: "transparent",
          color: "var(--prv-text-3)",
          cursor: "pointer",
          flexShrink: 0,
          fontSize: 15,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  )
}

const navBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  color: "var(--prv-text-1)",
  fontSize: 16,
  cursor: "pointer",
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
const fieldWrap: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5 }
const fieldLbl: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--prv-text-3)",
}
