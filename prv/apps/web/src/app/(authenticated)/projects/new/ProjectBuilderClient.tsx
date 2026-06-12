"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useClients } from "@/lib/api-hooks"

// ── Shared styles using Liquid Glass design variables ─────────────────────────

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

interface FormState {
  name: string
  code: string
  description: string
  status: string
  clientId: string
  budget: string
  currency: string
  startDate: string
  dueDate: string
}

const EMPTY_FORM: FormState = {
  name: "",
  code: "",
  description: "",
  status: "draft",
  clientId: "",
  budget: "",
  currency: "RON",
  startDate: "",
  dueDate: "",
}

export function ProjectBuilderClient() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const { data: clientsData } = useClients()
  const clients = clientsData?.clients ?? []

  function set(key: keyof FormState, value: string) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        code: form.code || undefined,
        description: form.description || undefined,
        status: form.status || "draft",
        clientId: form.clientId || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        currency: form.currency || "RON",
        startDate: form.startDate || undefined,
        dueDate: form.dueDate || undefined,
      }
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      void queryClient.invalidateQueries({ queryKey: ["projects"] })
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
            Project created
          </h2>
          <p style={{ color: "rgba(255,255,255,0.45)", marginBottom: 28, fontSize: 14 }}>
            The project has been saved successfully.
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
              onClick={() => router.push("/projects")}
            >
              View projects
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
              + New project
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000", padding: "72px 16px 120px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* Back */}
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
          Projects
        </button>

        <div style={{ marginBottom: 28 }}>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, marginBottom: 4 }}>PRV</p>
          <h1
            style={{
              color: "rgba(255,255,255,0.95)",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.5px",
            }}
          >
            New Project
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
            {/* Section: Identity */}
            <div style={GLASS_CARD}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.30)",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  marginBottom: 18,
                }}
              >
                Identity
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={LABEL}>Project name *</label>
                  <input
                    style={FIELD}
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    type="text"
                    placeholder="e.g. Apartment Renovation — Popescu"
                    required
                  />
                </div>

                <div style={ROW_2}>
                  <div>
                    <label style={LABEL}>Project code</label>
                    <input
                      style={FIELD}
                      value={form.code}
                      onChange={(e) => set("code", e.target.value)}
                      type="text"
                      placeholder="e.g. PRV-2026-042"
                    />
                  </div>
                  <div>
                    <label style={LABEL}>Status</label>
                    <select
                      style={SELECT}
                      value={form.status}
                      onChange={(e) => set("status", e.target.value)}
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="on_hold">On Hold</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={LABEL}>Client</label>
                  <select
                    style={SELECT}
                    value={form.clientId}
                    onChange={(e) => set("clientId", e.target.value)}
                  >
                    <option value="">— No client —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={LABEL}>Description</label>
                  <textarea
                    style={{ ...FIELD, minHeight: 100, resize: "vertical" }}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="Scope, goals, notes…"
                  />
                </div>
              </div>
            </div>

            {/* Section: Financials */}
            <div style={GLASS_CARD}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.30)",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  marginBottom: 18,
                }}
              >
                Financials
              </p>

              <div style={ROW_2}>
                <div>
                  <label style={LABEL}>Budget</label>
                  <input
                    style={FIELD}
                    value={form.budget}
                    onChange={(e) => set("budget", e.target.value)}
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label style={LABEL}>Currency</label>
                  <select
                    style={SELECT}
                    value={form.currency}
                    onChange={(e) => set("currency", e.target.value)}
                  >
                    <option value="RON">RON</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section: Timeline */}
            <div style={GLASS_CARD}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.30)",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  marginBottom: 18,
                }}
              >
                Timeline
              </p>

              <div style={ROW_2}>
                <div>
                  <label style={LABEL}>Start date</label>
                  <input
                    style={FIELD}
                    value={form.startDate}
                    onChange={(e) => set("startDate", e.target.value)}
                    type="date"
                  />
                </div>
                <div>
                  <label style={LABEL}>Due date</label>
                  <input
                    style={FIELD}
                    value={form.dueDate}
                    onChange={(e) => set("dueDate", e.target.value)}
                    type="date"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              type="submit"
              disabled={loading || !form.name.trim()}
              style={{
                background:
                  loading || !form.name.trim()
                    ? "rgba(255,255,255,0.30)"
                    : "rgba(255,255,255,0.92)",
                color: "#000",
                border: "none",
                borderRadius: 12,
                padding: "13px 28px",
                fontSize: 14,
                fontWeight: 700,
                cursor: loading || !form.name.trim() ? "not-allowed" : "pointer",
                transition: "opacity 0.15s",
              }}
            >
              {loading ? "Saving…" : "Create Project"}
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
