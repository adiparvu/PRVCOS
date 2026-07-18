"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"

interface TripRow {
  id: string
  status: string
  purpose: string | null
  driver: string | null
  project: string | null
  distanceKm: number | null
  fuelCost: number | null
  startedAt: string
  endedAt: string | null
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  in_progress: { label: "În curs", color: "rgba(10,132,255,.9)", bg: "rgba(10,132,255,.13)" },
  completed: { label: "Finalizat", color: "rgba(48,209,88,.95)", bg: "rgba(48,209,88,.13)" },
  cancelled: { label: "Anulat", color: "rgba(255,255,255,.55)", bg: "rgba(255,255,255,.08)" },
}

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Toate" },
  { key: "in_progress", label: "În curs" },
  { key: "completed", label: "Finalizate" },
  { key: "cancelled", label: "Anulate" },
]

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ro-RO", { day: "numeric", month: "short" })
}

export function VehicleTripsClient({ id }: { id: string }) {
  const [filter, setFilter] = useState("all")
  const { data, isLoading } = useQuery<{ trips: TripRow[] }>({
    queryKey: ["vehicle-trips-page", id],
    queryFn: () => fetch(`/api/fleet/${id}/trips?limit=100`).then((r) => r.json()),
  })

  const all = data?.trips ?? []
  const trips = filter === "all" ? all : all.filter((t) => t.status === filter)
  const totalDistance = all
    .filter((t) => t.status !== "cancelled")
    .reduce((s, t) => s + (t.distanceKm ?? 0), 0)

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px 100px" }}>
      <Link
        href={`/fleet/${id}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--prv-text-2)",
          fontSize: 14,
          fontWeight: 500,
          textDecoration: "none",
          marginBottom: 18,
        }}
      >
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
        Vehicul
      </Link>

      <h1 style={{ fontSize: 26, fontWeight: 640, letterSpacing: "-0.02em", margin: 0 }}>Curse</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        {all.length} curse · {Math.round(totalDistance).toLocaleString("ro-RO")} km parcurși
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, margin: "20px 0 16px", flexWrap: "wrap" }}>
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              style={{
                padding: "6px 14px",
                borderRadius: 100,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                background: active ? "rgba(255,255,255,0.9)" : "var(--prv-g1)",
                color: active ? "#000" : "var(--prv-text-2)",
                border: active ? "none" : "1px solid var(--prv-border-subtle)",
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Se încarcă…</div>}
      {!isLoading && trips.length === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>
          Nicio cursă în această categorie.
        </div>
      )}

      {trips.length > 0 && (
        <div
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 18,
            overflow: "hidden",
          }}
        >
          {trips.map((t, i) => {
            const st = STATUS_STYLE[t.status] ?? {
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
                  gap: 12,
                  padding: "13px 16px",
                  borderBottom:
                    i < trips.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "var(--prv-text-1)",
                      margin: 0,
                    }}
                  >
                    {t.purpose || "Cursă"}
                    {t.driver ? ` · ${t.driver}` : ""}
                  </p>
                  <p style={{ fontSize: 11.5, color: "var(--prv-text-3)", margin: "3px 0 0" }}>
                    {fmtDate(t.startedAt)}
                    {t.endedAt ? ` → ${fmtDate(t.endedAt)}` : ""}
                    {t.distanceKm != null ? ` · ${t.distanceKm.toLocaleString("ro-RO")} km` : ""}
                    {t.fuelCost != null ? ` · ${t.fuelCost.toLocaleString("ro-RO")} RON` : ""}
                    {t.project ? ` · ${t.project}` : ""}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 600,
                    padding: "3px 8px",
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
      )}
    </div>
  )
}
