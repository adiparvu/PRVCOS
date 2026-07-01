"use client"

import { useMemo, useState } from "react"
import { useCalendar, type CalendarModule } from "@/lib/api-hooks"

const g1 = "var(--prv-g1)"
const g2 = "var(--prv-g2)"
const t1 = "var(--prv-text-1)"
const t2 = "var(--prv-text-2)"
const t3 = "var(--prv-text-3)"
const bds = "var(--prv-border-subtle)"

const MONTHS = [
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

// Monochrome white-at-opacity per module (no colour, per the design system).
const MODULE_DOT: Record<CalendarModule, string> = {
  projects: "rgba(255,255,255,0.95)",
  shifts: "rgba(255,255,255,0.6)",
  finance: "rgba(255,255,255,0.38)",
  leave: "rgba(255,255,255,0.22)",
}
const MODULES: { id: CalendarModule; label: string }[] = [
  { id: "projects", label: "Projects" },
  { id: "shifts", label: "Shifts" },
  { id: "finance", label: "Finance" },
  { id: "leave", label: "Leave" },
]

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function todayIso(): string {
  return iso(new Date())
}
// 6-week grid (Mon-start) covering the given month; returns cell dates + range.
function monthGrid(year: number, monthIdx: number) {
  const first = new Date(Date.UTC(year, monthIdx, 1))
  const dow = (first.getUTCDay() + 6) % 7 // 0 = Monday
  const start = new Date(first.getTime() - dow * 86_400_000)
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getTime() + i * 86_400_000)
    return { date: iso(d), day: d.getUTCDate(), inMonth: d.getUTCMonth() === monthIdx }
  })
  return { cells, from: cells[0]!.date, to: cells[41]!.date }
}
function fmtDayHeader(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z")
  const wd = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    d.getUTCDay()
  ]
  return `${wd} · ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]!.slice(0, 3)}`
}

export function CalendarWorkspace() {
  const now = new Date()
  const [year, setYear] = useState(now.getUTCFullYear())
  const [monthIdx, setMonthIdx] = useState(now.getUTCMonth())
  const [selected, setSelected] = useState(todayIso())
  const [enabled, setEnabled] = useState<Set<CalendarModule>>(
    new Set<CalendarModule>(["projects", "shifts", "finance", "leave"])
  )

  const { cells, from, to } = useMemo(() => monthGrid(year, monthIdx), [year, monthIdx])
  const { data, isLoading } = useCalendar(from, to)

  const allEvents = data?.events ?? []
  const events = allEvents.filter((e) => enabled.has(e.module))

  // Dots per day (deduped module set), and the selected day's agenda.
  const dotsByDay = useMemo(() => {
    const map = new Map<string, Set<CalendarModule>>()
    for (const e of events) {
      const set = map.get(e.date) ?? new Set<CalendarModule>()
      set.add(e.module)
      map.set(e.date, set)
    }
    return map
  }, [events])
  const dayAgenda = events.filter((e) => e.date === selected)

  const shift = (delta: number) => {
    const m = monthIdx + delta
    setYear(year + Math.floor(m / 12))
    setMonthIdx(((m % 12) + 12) % 12)
  }
  const toggle = (m: CalendarModule) =>
    setEnabled((prev) => {
      const next = new Set(prev)
      if (next.has(m)) next.delete(m)
      else next.add(m)
      return next
    })

  const DOW = ["M", "T", "W", "T", "F", "S", "S"]

  return (
    <div className="px-4 pb-32">
      <div className="pt-6 pb-1">
        <p className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: t3 }}>
          Command · Universal Calendar
        </p>
        <h1 className="text-[30px] font-semibold tracking-tight mt-0.5" style={{ color: t1 }}>
          Calendar
        </h1>
        {/* Module toggles */}
        <div className="flex flex-wrap gap-2 mt-3.5">
          {MODULES.map((m) => {
            const on = enabled.has(m.id)
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(m.id)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-semibold transition-opacity"
                style={{
                  background: g1,
                  border: `1px solid ${bds}`,
                  color: on ? t2 : "var(--prv-text-4)",
                  opacity: on ? 1 : 0.5,
                }}
              >
                <span
                  className="w-[7px] h-[7px] rounded-full"
                  style={{ background: MODULE_DOT[m.id] }}
                />
                {m.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Month grid */}
      <div
        className="rounded-[24px] p-4 mt-4"
        style={{ background: g1, border: `1px solid ${bds}` }}
      >
        <div className="flex items-center justify-between px-1 pb-3">
          <div className="text-[16px] font-bold tracking-tight" style={{ color: t1 }}>
            {MONTHS[monthIdx]} {year}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => shift(-1)}
              aria-label="Previous month"
              className="w-[30px] h-[30px] rounded-[9px] grid place-items-center"
              style={{ background: g2, color: t2 }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                className="w-3.5 h-3.5"
              >
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => shift(1)}
              aria-label="Next month"
              className="w-[30px] h-[30px] rounded-[9px] grid place-items-center"
              style={{ background: g2, color: t2 }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                className="w-3.5 h-3.5"
              >
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {DOW.map((d, i) => (
            <span
              key={i}
              className="text-center text-[10.5px] font-bold tracking-wider py-1"
              style={{ color: t3 }}
            >
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((c) => {
            const isSel = c.date === selected
            const isToday = c.date === todayIso()
            const dots = Array.from(dotsByDay.get(c.date) ?? [])
            return (
              <button
                key={c.date}
                type="button"
                onClick={() => setSelected(c.date)}
                className="aspect-square rounded-[12px] flex flex-col items-center pt-[7px]"
                style={{
                  background: isSel
                    ? "rgba(255,255,255,0.92)"
                    : isToday
                      ? "rgba(255,255,255,0.1)"
                      : "transparent",
                }}
              >
                <span
                  className="text-[12.5px] font-semibold"
                  style={{
                    color: isSel ? "#000" : c.inMonth ? t2 : "var(--prv-text-4)",
                    fontWeight: isSel || isToday ? 800 : 600,
                  }}
                >
                  {c.day}
                </span>
                <span className="flex gap-[3px] mt-[5px] h-[6px]">
                  {dots.slice(0, 4).map((m) => (
                    <span
                      key={m}
                      className="w-[5px] h-[5px] rounded-full"
                      style={{ background: isSel ? "rgba(0,0,0,0.55)" : MODULE_DOT[m] }}
                    />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Day agenda */}
      <p
        className="text-[11px] font-semibold uppercase tracking-widest mx-1 mt-6 mb-3"
        style={{ color: t3 }}
      >
        {fmtDayHeader(selected)}
      </p>
      {dayAgenda.length > 0 ? (
        <div
          className="rounded-[22px] overflow-hidden"
          style={{ background: g1, border: `1px solid ${bds}` }}
        >
          {dayAgenda.map((e, i) => (
            <div
              key={e.id}
              className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: i < dayAgenda.length - 1 ? `1px solid ${bds}` : "none" }}
            >
              <span
                className="w-1 self-stretch rounded-full flex-shrink-0"
                style={{ background: MODULE_DOT[e.module] }}
              />
              <span
                className="text-[11.5px] font-bold w-[52px] flex-shrink-0"
                style={{ color: t3 }}
              >
                {e.time}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold truncate" style={{ color: t1 }}>
                  {e.title}
                </div>
                <div className="text-[11.5px] mt-0.5 truncate" style={{ color: t3 }}>
                  {e.subtitle}
                </div>
              </div>
              <span
                className="text-[9.5px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 flex-shrink-0"
                style={{ color: t3, border: "1px solid var(--prv-border)" }}
              >
                {e.module}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="rounded-[22px] p-6 text-center text-[13px]"
          style={{ background: g1, border: `1px solid ${bds}`, color: t3 }}
        >
          {isLoading ? "Loading…" : "Nothing scheduled for this day."}
        </div>
      )}
    </div>
  )
}
