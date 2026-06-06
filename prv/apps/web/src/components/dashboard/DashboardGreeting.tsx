"use client"

import { useEffect, useState } from "react"

// Placeholder weather — real data wiring (geolocation + provider) comes later.
const PLACEHOLDER_WEATHER = {
  temp: 23,
  location: "Cluj",
  condition: "Sunny",
}

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export interface DashboardGreetingProps {
  /** Display name; falls back to a generic greeting when omitted. */
  name?: string
  /** Optional count of tasks due today (placeholder-driven for now). */
  tasksToday?: number
}

/**
 * Time-of-day greeting + weather widget. Rendered client-side so the greeting
 * and date match the viewer's local timezone.
 */
export function DashboardGreeting({ name, tasksToday }: DashboardGreetingProps) {
  // Avoid SSR/client mismatch: compute time-based strings after mount.
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => setNow(new Date()), [])

  const greeting = now ? greetingFor(now.getHours()) : "Welcome back"
  const dateLabel = now
    ? now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : ""

  return (
    <div className="flex gap-3 mb-3.5">
      {/* Greeting */}
      <div
        className="flex-1 rounded-[18px] p-4 flex flex-col justify-center"
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
        }}
      >
        <div className="text-[13px]" style={{ color: "var(--prv-text-3)" }}>{greeting},</div>
        <div className="text-[20px] font-bold tracking-tight mt-0.5" style={{ color: "var(--prv-text-1)" }}>{name ?? "there"} 👋</div>
        <div className="text-[12px] mt-1" style={{ color: "var(--prv-text-3)" }}>
          {dateLabel}
          {tasksToday !== undefined ? ` · ${tasksToday} tasks today` : ""}
        </div>
      </div>

      {/* Weather widget (placeholder data) */}
      <div
        className="w-[128px] rounded-[18px] p-4 flex flex-col items-center justify-center gap-1"
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
        }}
      >
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,159,10,0.95)"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
        <div className="text-[20px] font-bold" style={{ color: "var(--prv-text-1)" }}>{PLACEHOLDER_WEATHER.temp}°</div>
        <div className="text-[11px]" style={{ color: "var(--prv-text-3)" }}>
          {PLACEHOLDER_WEATHER.location} · {PLACEHOLDER_WEATHER.condition}
        </div>
      </div>
    </div>
  )
}
