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
  type: string
  title: string
  ref: string
  description: string
  value: string
  deadline: string
}

const EMPTY_FORM: FormState = {
  type: "purchase",
  title: "",
  ref: "",
  description: "",
  value: "",
  deadline: "",
}

export function ApprovalBuilderClient() {
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
        type: form.type,
        title: form.title,
        ref: form.ref,
        description: form.description || undefined,
        value: form.value ? Number(form.value) : undefined,
        deadline: form.deadline,
      }
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      void queryClient.invalidateQueries({ queryKey: ["approvals"] })
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
            Request submitted
          </h2>
          <p style={{ color: "rgba(255,255,255,0.45)", marginBottom: 28, fontSize: 14 }}>
            The approval request is pending review.
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
              onClick={() => router.push("/approvals")}
            >
              View approvals
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
              + New request
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
          Approvals
        </button>

        <div style={{ marginBottom: 28 }}>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, marginBottom: 4 }}>
            Approvals
          </p>
          <h1
            style={{
              color: "rgba(255,255,255,0.95)",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.5px",
            }}
          >
            New Approval Request
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
            {/* Section: Request */}
            <div style={GLASS_CARD}>
              <p style={SECTION_LABEL}>Request</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={LABEL}>Title *</label>
                  <input
                    style={FIELD}
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    type="text"
                    placeholder="Brief description of what needs approval"
                    required
                  />
                </div>
                <div style={ROW_2}>
                  <div>
                    <label style={LABEL}>Type *</label>
                    <select
                      style={SELECT}
                      value={form.type}
                      onChange={(e) => set("type", e.target.value)}
                    >
                      <option value="">— Select —</option>
                      <option value="purchase">Purchase</option>
                      <option value="leave">Leave</option>
                      <option value="expense">Expense</option>
                      <option value="contract">Contract</option>
                      <option value="overtime">Overtime</option>
                    </select>
                  </div>
                  <div>
                    <label style={LABEL}>Reference *</label>
                    <input
                      style={FIELD}
                      value={form.ref}
                      onChange={(e) => set("ref", e.target.value)}
                      type="text"
                      placeholder="APR-2026-001"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Details */}
            <div style={GLASS_CARD}>
              <p style={SECTION_LABEL}>Details</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={LABEL}>Description</label>
                  <textarea
                    style={{ ...FIELD, minHeight: 100, resize: "vertical" }}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="Context, justification, supporting details…"
                  />
                </div>
                <div style={ROW_2}>
                  <div>
                    <label style={LABEL}>Value (RON)</label>
                    <input
                      style={FIELD}
                      value={form.value}
                      onChange={(e) => set("value", e.target.value)}
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label style={LABEL}>Deadline *</label>
                    <input
                      style={FIELD}
                      value={form.deadline}
                      onChange={(e) => set("deadline", e.target.value)}
                      type="datetime-local"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              type="submit"
              disabled={loading || !form.title.trim() || !form.ref.trim()}
              style={{
                background:
                  loading || !form.title.trim() || !form.ref.trim()
                    ? "rgba(255,255,255,0.30)"
                    : "rgba(255,255,255,0.92)",
                color: "#000",
                border: "none",
                borderRadius: 12,
                padding: "13px 28px",
                fontSize: 14,
                fontWeight: 700,
                cursor:
                  loading || !form.title.trim() || !form.ref.trim() ? "not-allowed" : "pointer",
                transition: "opacity 0.15s",
              }}
            >
              {loading ? "Submitting…" : "Submit Request"}
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
