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
  type: string
  fileUrl: string
  fileName: string
  description: string
  isPublic: boolean
}

const EMPTY_FORM: FormState = {
  title: "",
  type: "other",
  fileUrl: "",
  fileName: "",
  description: "",
  isPublic: false,
}

export function DocumentBuilderClient() {
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
        type: form.type || undefined,
        description: form.description || undefined,
        fileUrl: form.fileUrl,
        fileName: form.fileName,
        isPublic: form.isPublic,
      }
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      void queryClient.invalidateQueries({ queryKey: ["documents"] })
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
            Document saved
          </h2>
          <p style={{ color: "rgba(255,255,255,0.45)", marginBottom: 28, fontSize: 14 }}>
            The document has been added to your library.
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
              onClick={() => router.push("/documents")}
            >
              View documents
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
              + New document
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
          Documents
        </button>

        <div style={{ marginBottom: 28 }}>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, marginBottom: 4 }}>
            Documents
          </p>
          <h1
            style={{
              color: "rgba(255,255,255,0.95)",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.5px",
            }}
          >
            New Document
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
              <p style={SECTION_LABEL}>Identity</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={LABEL}>Document title *</label>
                  <input
                    style={FIELD}
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    type="text"
                    placeholder="e.g. Site Safety Certificate — Lot 3"
                    required
                  />
                </div>
                <div>
                  <label style={LABEL}>Type</label>
                  <select
                    style={SELECT}
                    value={form.type}
                    onChange={(e) => set("type", e.target.value)}
                  >
                    <option value="">— Select —</option>
                    <option value="contract">Contract</option>
                    <option value="report">Report</option>
                    <option value="photo">Photo</option>
                    <option value="certificate">Certificate</option>
                    <option value="permit">Permit</option>
                    <option value="specification">Specification</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={LABEL}>Description</label>
                  <textarea
                    style={{ ...FIELD, minHeight: 72, resize: "vertical" }}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="Purpose, contents, relevant context…"
                  />
                </div>
              </div>
            </div>

            {/* Section: File */}
            <div style={GLASS_CARD}>
              <p style={SECTION_LABEL}>File</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={LABEL}>File URL *</label>
                  <input
                    style={FIELD}
                    value={form.fileUrl}
                    onChange={(e) => set("fileUrl", e.target.value)}
                    type="text"
                    placeholder="https://storage.example.com/doc.pdf"
                    required
                  />
                </div>
                <div>
                  <label style={LABEL}>File name *</label>
                  <input
                    style={FIELD}
                    value={form.fileName}
                    onChange={(e) => set("fileName", e.target.value)}
                    type="text"
                    placeholder="document.pdf"
                    required
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.isPublic}
                      onChange={(e) => setForm((p) => ({ ...p, isPublic: e.target.checked }))}
                      style={{ accentColor: "#fff", width: 16, height: 16 }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        color: "rgba(255,255,255,0.75)",
                        userSelect: "none",
                      }}
                    >
                      Visible to clients in portal
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              type="submit"
              disabled={loading || !form.title.trim() || !form.fileUrl.trim()}
              style={{
                background:
                  loading || !form.title.trim() || !form.fileUrl.trim()
                    ? "rgba(255,255,255,0.30)"
                    : "rgba(255,255,255,0.92)",
                color: "#000",
                border: "none",
                borderRadius: 12,
                padding: "13px 28px",
                fontSize: 14,
                fontWeight: 700,
                cursor:
                  loading || !form.title.trim() || !form.fileUrl.trim() ? "not-allowed" : "pointer",
                transition: "opacity 0.15s",
              }}
            >
              {loading ? "Saving…" : "Save Document"}
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
