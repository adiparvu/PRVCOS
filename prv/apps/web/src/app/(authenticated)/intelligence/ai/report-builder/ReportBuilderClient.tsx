"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

// ── Types ──────────────────────────────────────────────────────────────────────

interface ReportPreview {
  title: string
  type: string
  columns: string[]
  preview: Record<string, string | number>[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function GlassCard({
  children,
  className = "",
  style,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
}) {
  return (
    <div
      className={`rounded-[18px] relative overflow-hidden ${className}`}
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
      onClick={onClick}
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)",
        }}
      />
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[.1em] text-white/30 mx-1 mt-5 mb-2">
      {children}
    </p>
  )
}

const TEMPLATES = [
  { label: "Monthly Revenue Summary", description: "Revenue by store, month over month" },
  { label: "Attendance Overview", description: "Staff attendance and leave patterns" },
  { label: "Project Status Report", description: "Active projects, milestones & risks" },
  { label: "Inventory Report", description: "Stock levels, reorder points & value" },
  { label: "Payroll Summary", description: "Payroll costs, hours & breakdowns" },
  { label: "Client Activity Report", description: "Top clients by revenue and activity" },
]

// ── Root Client ────────────────────────────────────────────────────────────────

export function ReportBuilderClient({ role: _role }: { role: string }) {
  const router = useRouter()
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<ReportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function generate(desc: string) {
    const text = desc.trim()
    if (!text || loading) return
    setLoading(true)
    setError(null)
    setReport(null)

    try {
      const res = await fetch("/api/intelligence/report-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: text }),
      })
      if (!res.ok) throw new Error("Generation failed")
      const data = await res.json()
      setReport(data)
    } catch {
      setError("Unable to generate report. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function useTemplate(label: string) {
    setDescription(label)
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white/60"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-white/35 text-[13px] font-medium">AI</p>
          <h1 className="text-white/92 text-[22px] font-bold tracking-tight leading-tight">
            Report Builder
          </h1>
        </div>

        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] flex-shrink-0"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "rgba(48,209,88,0.9)",
              animation: "pulse 1.8s ease-in-out infinite",
            }}
          />
          <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wide">
            AI-powered
          </span>
        </div>
      </div>

      {/* Description input */}
      <GlassCard className="mb-3 p-4">
        <p className="text-[11px] font-semibold text-white/40 mb-2 uppercase tracking-wide">
          Describe your report
        </p>
        <textarea
          ref={textareaRef}
          className="w-full bg-transparent text-[14px] text-white/80 placeholder-white/25 outline-none resize-none leading-relaxed"
          placeholder="e.g. Revenue by store for Q1 2026"
          value={description}
          rows={3}
          style={{ minHeight: "72px", maxHeight: "200px" }}
          onChange={(e) => {
            setDescription(e.target.value)
            e.target.style.height = "auto"
            e.target.style.height = `${e.target.scrollHeight}px`
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              void generate(description)
            }
          }}
          disabled={loading}
        />
        <div className="mt-3">
          <button
            onClick={() => void generate(description)}
            disabled={loading || !description.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-[12px] text-[13px] font-bold transition-all"
            style={{
              background:
                loading || !description.trim()
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(255,255,255,0.92)",
              color: loading || !description.trim() ? "rgba(255,255,255,0.3)" : "#000",
            }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black/70 rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Generate Report
              </>
            )}
          </button>
        </div>
      </GlassCard>

      {/* Error */}
      {error && (
        <div
          className="rounded-[13px] px-3.5 py-3 mb-3 text-[12px]"
          style={{
            background: "rgba(255,69,58,0.07)",
            border: "1px solid rgba(255,69,58,0.14)",
            color: "rgba(255,69,58,0.9)",
          }}
        >
          {error}
        </div>
      )}

      {/* Report Preview */}
      {report && (
        <>
          <SectionLabel>Report Preview</SectionLabel>
          <GlassCard className="mb-3 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[16px] font-bold text-white/92 leading-tight">{report.title}</p>
                <p className="text-[11px] text-white/40 mt-0.5 uppercase tracking-wide">
                  {report.type}
                </p>
              </div>
              <div
                className="px-2 py-0.5 rounded-[6px] text-[9px] font-bold uppercase tracking-[.08em] text-white/50"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                Preview
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto -mx-1">
              <table
                className="w-full text-left"
                style={{ borderCollapse: "separate", borderSpacing: 0 }}
              >
                <thead>
                  <tr>
                    {report.columns.map((col) => (
                      <th
                        key={col}
                        className="text-[9px] font-bold uppercase tracking-[.08em] text-white/30 pb-2 pr-4"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.preview.map((row, i) => (
                    <tr key={i}>
                      {report.columns.map((col) => (
                        <td
                          key={col}
                          className="text-[12px] text-white/65 py-2 pr-4"
                          style={{
                            borderBottom:
                              i < report.preview.length - 1
                                ? "1px solid rgba(255,255,255,0.05)"
                                : "none",
                          }}
                        >
                          {String(row[col] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 mt-4">
              <button
                onClick={() => {
                  const params = new URLSearchParams({ description: description.trim() })
                  window.open(`/api/intelligence/report-builder/pdf?${params}`, "_blank")
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[11px] text-[12px] font-semibold"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download PDF
              </button>
              <button
                onClick={async () => {
                  try {
                    await fetch("/api/intelligence/reports", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ ...report, description }),
                    })
                  } catch {
                    // silent
                  }
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[11px] text-[12px] font-semibold"
                style={{
                  background: "rgba(255,255,255,0.92)",
                  color: "#000",
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Save to Reports
              </button>
            </div>
          </GlassCard>
        </>
      )}

      {/* Templates */}
      <SectionLabel>Templates</SectionLabel>
      <div className="grid grid-cols-2 gap-2.5">
        {TEMPLATES.map((t) => (
          <button
            key={t.label}
            onClick={() => useTemplate(t.label)}
            className="flex flex-col items-start gap-1.5 p-3.5 rounded-[16px] text-left relative overflow-hidden"
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)",
              }}
            />
            <p className="text-[12px] font-semibold text-white/80 leading-tight">{t.label}</p>
            <p className="text-[10px] text-white/35 leading-snug">{t.description}</p>
          </button>
        ))}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.65)} }
      `}</style>
    </div>
  )
}
