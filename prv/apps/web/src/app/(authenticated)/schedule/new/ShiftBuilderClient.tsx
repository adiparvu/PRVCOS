"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"

const GLASS_CARD: React.CSSProperties = {
  background: "var(--prv-g1, rgba(255,255,255,0.06))",
  backdropFilter: "blur(32px)",
  WebkitBackdropFilter: "blur(32px)",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 24px 64px rgba(0,0,0,0.6)",
  borderRadius: 20,
  padding: 24,
}

const FIELD: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  color: "rgba(255,255,255,0.92)",
  padding: "11px 14px",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
}

const SELECT: React.CSSProperties = {
  ...FIELD,
  appearance: "none",
  WebkitAppearance: "none",
} as React.CSSProperties

const LABEL: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "rgba(255,255,255,0.45)",
  marginBottom: 7,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
}

const ROW_2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
}

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "rgba(255,255,255,0.30)",
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  marginBottom: 18,
}

interface FormState {
  title: string
  date: string
  startTime: string
  endTime: string
  role: string
  roleLabel: string
  location: string
  totalSlots: string
  recurrenceFreq: string
  recurrenceUntil: string
}

const EMPTY_FORM: FormState = {
  title: "",
  date: "",
  startTime: "08:00",
  endTime: "17:00",
  role: "general",
  roleLabel: "",
  location: "",
  totalSlots: "1",
  recurrenceFreq: "",
  recurrenceUntil: "",
}

export function ShiftBuilderClient() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function set(key: keyof FormState, value: string) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        title: form.title,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        role: form.role || undefined,
        roleLabel: form.roleLabel || undefined,
        location: form.location || undefined,
        totalSlots: form.totalSlots ? Number(form.totalSlots) : undefined,
        recurrence:
          form.recurrenceFreq && form.recurrenceUntil
            ? { freq: form.recurrenceFreq, until: form.recurrenceUntil }
            : undefined,
      }
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      void queryClient.invalidateQueries({ queryKey: ["schedule"] })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ ...GLASS_CARD, textAlign: "center", maxWidth: 420 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(48,209,88,0.14)",
              border: "1px solid rgba(48,209,88,0.30)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(48,209,88,0.95)"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2
            style={{
              color: "rgba(255,255,255,0.95)",
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 8,
              letterSpacing: "-0.4px",
            }}
          >
            Shift created
          </h2>
          <p style={{ color: "rgba(255,255,255,0.45)", marginBottom: 28, fontSize: 14 }}>
            The shift has been added to the schedule.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              style={{
                background: "rgba(255,255,255,0.92)",
                color: "#000",
                border: "none",
                borderRadius: 12,
                padding: "11px 24px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
              onClick={() => router.push("/schedule")}
            >
              View schedule
            </button>
            <button
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.80)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 12,
                padding: "11px 24px",
                fontSize: 14,
                cursor: "pointer",
              }}
              onClick={() => {
                setDone(false)
                setForm(EMPTY_FORM)
              }}
            >
              + New shift
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000", padding: "72px 16px 120px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.40)",
            fontSize: 13,
            cursor: "pointer",
            marginBottom: 28,
            padding: 0,
          }}
          onClick={() => router.back()}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Schedule
        </button>

        <div style={{ marginBottom: 28 }}>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, marginBottom: 4 }}>Schedule</p>
          <h1
            style={{
              color: "rgba(255,255,255,0.95)",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.5px",
            }}
          >
            New Shift
          </h1>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(255,69,58,0.12)",
              border: "1px solid rgba(255,69,58,0.30)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 20,
              color: "rgba(255,100,90,0.95)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Section: Shift */}
            <div style={GLASS_CARD}>
              <p style={SECTION_LABEL}>Shift</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={LABEL}>Shift title *</label>
                  <input
                    style={FIELD}
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    type="text"
                    placeholder="e.g. Morning crew — Site A"
                    required
                  />
                </div>
                <div>
                  <label style={LABEL}>Date *</label>
                  <input
                    style={FIELD}
                    value={form.date}
                    onChange={(e) => set("date", e.target.value)}
                    type="date"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section: Schedule */}
            <div style={GLASS_CARD}>
              <p style={SECTION_LABEL}>Schedule</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={ROW_2}>
                  <div>
                    <label style={LABEL}>Start time *</label>
                    <input
                      style={FIELD}
                      value={form.startTime}
                      onChange={(e) => set("startTime", e.target.value)}
                      type="time"
                    />
                  </div>
                  <div>
                    <label style={LABEL}>End time *</label>
                    <input
                      style={FIELD}
                      value={form.endTime}
                      onChange={(e) => set("endTime", e.target.value)}
                      type="time"
                    />
                  </div>
                </div>
                <div>
                  <label style={LABEL}>Slots available</label>
                  <input
                    style={FIELD}
                    value={form.totalSlots}
                    onChange={(e) => set("totalSlots", e.target.value)}
                    type="number"
                    min="1"
                    step="1"
                    placeholder="1"
                  />
                </div>
                <div style={ROW_2}>
                  <div>
                    <label style={LABEL}>Repeat</label>
                    <select
                      style={SELECT}
                      value={form.recurrenceFreq}
                      onChange={(e) => set("recurrenceFreq", e.target.value)}
                    >
                      <option value="">Does not repeat</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Every 2 weeks</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  {form.recurrenceFreq && (
                    <div>
                      <label style={LABEL}>Repeat until</label>
                      <input
                        style={FIELD}
                        type="date"
                        value={form.recurrenceUntil}
                        onChange={(e) => set("recurrenceUntil", e.target.value)}
                        min={form.date || undefined}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section: Assignment */}
            <div style={GLASS_CARD}>
              <p style={SECTION_LABEL}>Assignment</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={ROW_2}>
                  <div>
                    <label style={LABEL}>Role</label>
                    <select
                      style={SELECT}
                      value={form.role}
                      onChange={(e) => set("role", e.target.value)}
                    >
                      <option value="">— Any role —</option>
                      <option value="foreman">Foreman</option>
                      <option value="bricklayer">Bricklayer</option>
                      <option value="electrician">Electrician</option>
                      <option value="finisher">Finisher</option>
                      <option value="welder">Welder</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                  <div>
                    <label style={LABEL}>Role label</label>
                    <input
                      style={FIELD}
                      value={form.roleLabel}
                      onChange={(e) => set("roleLabel", e.target.value)}
                      type="text"
                      placeholder="Custom label"
                    />
                  </div>
                </div>
                <div>
                  <label style={LABEL}>Location</label>
                  <input
                    style={FIELD}
                    value={form.location}
                    onChange={(e) => set("location", e.target.value)}
                    type="text"
                    placeholder="Site address or name"
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              type="submit"
              disabled={loading || !form.title.trim() || !form.date}
              style={{
                background:
                  loading || !form.title.trim() || !form.date
                    ? "rgba(255,255,255,0.30)"
                    : "rgba(255,255,255,0.92)",
                color: "#000",
                border: "none",
                borderRadius: 12,
                padding: "13px 28px",
                fontSize: 14,
                fontWeight: 700,
                cursor: loading || !form.title.trim() || !form.date ? "not-allowed" : "pointer",
                transition: "opacity 0.15s",
              }}
            >
              {loading ? "Saving…" : "Create Shift"}
            </button>
            <button
              type="button"
              style={{
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.75)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: "13px 24px",
                fontSize: 14,
                cursor: "pointer",
              }}
              onClick={() => router.back()}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
