"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useSheetStack, useToast } from "@prv/ui"
import { usePurchaseRequests } from "@/lib/api-hooks"
import type { PurchaseRequest } from "@/lib/api-hooks"

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconPlus() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg
      width="7"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function Skeleton({ w, h, radius = 6 }: { w: number | string; h: number; radius?: number }) {
  return (
    <div
      style={{ width: w, height: h, borderRadius: radius, background: "rgba(255,255,255,0.07)" }}
    />
  )
}

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PurchaseRequest["status"],
  { label: string; color: string; bg: string; border: string }
> = {
  draft: {
    label: "Draft",
    color: "rgba(255,255,255,.55)",
    bg: "rgba(255,255,255,.06)",
    border: "rgba(255,255,255,.10)",
  },
  submitted: {
    label: "Submitted",
    color: "rgba(255,255,255,.90)",
    bg: "transparent",
    border: "rgba(255,255,255,.35)",
  },
  approved: {
    label: "Approved",
    color: "#000",
    bg: "rgba(255,255,255,.95)",
    border: "transparent",
  },
  rejected: {
    label: "Rejected",
    color: "rgba(255,255,255,.30)",
    bg: "rgba(255,255,255,.04)",
    border: "rgba(255,255,255,.08)",
  },
  converted: {
    label: "Converted",
    color: "rgba(255,255,255,.55)",
    bg: "rgba(255,255,255,.06)",
    border: "rgba(255,255,255,.10)",
  },
}

const URGENCY_CONFIG: Record<
  PurchaseRequest["urgency"],
  { label: string; color: string; bg: string }
> = {
  standard: { label: "Standard", color: "rgba(255,255,255,.55)", bg: "rgba(255,255,255,.06)" },
  urgent: { label: "Urgent", color: "rgba(255,159,10,.90)", bg: "rgba(255,159,10,.10)" },
  emergency: { label: "Emergency", color: "rgba(255,69,58,.90)", bg: "rgba(255,69,58,.10)" },
}

const FILTER_TABS = ["All", "Draft", "Submitted", "Approved", "Rejected"] as const
type FilterTab = (typeof FILTER_TABS)[number]

const CATEGORIES = [
  "IT Equipment",
  "Office Supplies",
  "Services",
  "Raw Materials",
  "Maintenance",
  "Marketing",
  "Other",
]
const UNITS = ["pcs", "kg", "L", "m", "m²", "box", "set", "hr"]
const DEPARTMENTS = ["IT", "HR", "Finance", "Marketing", "Operations", "Procurement", "Management"]
const CURRENCIES = ["RON", "EUR", "USD"]

// ── New PR form ───────────────────────────────────────────────────────────────

interface NewPRFormState {
  itemDescription: string
  category: string
  quantity: string
  unit: string
  estimatedCost: string
  currency: string
  urgency: "standard" | "urgent" | "emergency"
  department: string
  justification: string
}

function NewPRForm({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const [form, setForm] = useState<NewPRFormState>({
    itemDescription: "",
    category: CATEGORIES[0] ?? "",
    quantity: "1",
    unit: "pcs",
    estimatedCost: "",
    currency: "RON",
    urgency: "standard",
    department: "",
    justification: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cost = parseFloat(form.estimatedCost) || 0
  const autoApproved = cost > 0 && cost < 500 && form.currency === "RON"

  const set = <K extends keyof NewPRFormState>(key: K, val: NewPRFormState[K]) =>
    setForm((p) => ({ ...p, [key]: val }))

  async function handleSubmit() {
    if (!form.itemDescription.trim() || !form.estimatedCost) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/procurement/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemDescription: form.itemDescription,
          category: form.category,
          quantity: parseFloat(form.quantity) || 1,
          unit: form.unit,
          estimatedCost: cost,
          currency: form.currency,
          urgency: form.urgency,
          department: form.department || null,
          justification: form.justification || null,
        }),
      })
      if (!res.ok) throw new Error("Failed to create request")
      onSuccess()
      onClose()
    } catch {
      setError("Could not submit request. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const inp: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    padding: "10px 12px",
    color: "var(--prv-text-1)",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  }

  const sel: React.CSSProperties = { ...inp, appearance: "none", WebkitAppearance: "none" }

  const label: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--prv-text-3)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.07em",
    marginBottom: 6,
    display: "block",
  }

  return (
    <div style={{ padding: "8px 16px 48px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Item Description */}
      <div>
        <span style={label}>Item Description *</span>
        <input
          style={inp}
          placeholder="e.g. 15-inch Laptop Dell XPS"
          value={form.itemDescription}
          onChange={(e) => set("itemDescription", e.target.value)}
        />
      </div>

      {/* Category */}
      <div>
        <span style={label}>Category</span>
        <select style={sel} value={form.category} onChange={(e) => set("category", e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Quantity + Unit */}
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 2 }}>
          <span style={label}>Quantity</span>
          <input
            style={inp}
            type="number"
            min="0.01"
            step="any"
            placeholder="1"
            value={form.quantity}
            onChange={(e) => set("quantity", e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <span style={label}>Unit</span>
          <select style={sel} value={form.unit} onChange={(e) => set("unit", e.target.value)}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cost + Currency */}
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 3 }}>
          <span style={label}>Estimated Cost *</span>
          <input
            style={inp}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.estimatedCost}
            onChange={(e) => set("estimatedCost", e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <span style={label}>Currency</span>
          <select
            style={sel}
            value={form.currency}
            onChange={(e) => set("currency", e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Approval hint */}
      {cost > 0 && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: autoApproved ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.04)",
            border: `1px solid ${autoApproved ? "rgba(255,255,255,.10)" : "rgba(255,255,255,.10)"}`,
            fontSize: 12,
            color: autoApproved ? "rgba(255,255,255,.65)" : "rgba(255,255,255,.65)",
          }}
        >
          {autoApproved
            ? "Auto-approved — under 500 RON threshold"
            : "Manager approval required for this amount"}
        </div>
      )}

      {/* Urgency */}
      <div>
        <span style={label}>Urgency</span>
        <div style={{ display: "flex", gap: 6 }}>
          {(["standard", "urgent", "emergency"] as const).map((u) => {
            const cfg = URGENCY_CONFIG[u]
            const active = form.urgency === u
            return (
              <button
                key={u}
                onClick={() => set("urgency", u)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 8,
                  border: active ? `1px solid ${cfg.color}` : "1px solid rgba(255,255,255,.10)",
                  background: active ? cfg.bg : "rgba(255,255,255,.04)",
                  color: active ? cfg.color : "rgba(255,255,255,.45)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Department */}
      <div>
        <span style={label}>Department</span>
        <select
          style={sel}
          value={form.department}
          onChange={(e) => set("department", e.target.value)}
        >
          <option value="">— Select —</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Justification */}
      <div>
        <span style={label}>Justification</span>
        <textarea
          style={{ ...inp, height: 72, resize: "vertical" }}
          placeholder="Reason for this purchase request..."
          value={form.justification}
          onChange={(e) => set("justification", e.target.value)}
        />
      </div>

      {error && <p style={{ fontSize: 12, color: "rgba(255,69,58,.9)", margin: 0 }}>{error}</p>}

      {/* CTA */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !form.itemDescription.trim() || !form.estimatedCost}
        style={{
          padding: "14px 0",
          borderRadius: 100,
          background: "rgba(255,255,255,.95)",
          border: "none",
          color: "#000",
          fontSize: 15,
          fontWeight: 700,
          cursor: submitting ? "default" : "pointer",
          opacity: submitting || !form.itemDescription.trim() || !form.estimatedCost ? 0.5 : 1,
        }}
      >
        {submitting ? "Submitting..." : "Submit Request"}
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function PurchaseRequestListClient() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { openSheet } = useSheetStack()
  const { toast } = useToast()
  const [filter, setFilter] = useState<FilterTab>("All")
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  const statusParam = filter === "All" ? null : filter.toLowerCase()
  const { data, isLoading, fetchNextPage, hasNextPage } = usePurchaseRequests(statusParam)

  const requests = data?.requests ?? []
  const meta = data?.meta
  const hasSubmitted = requests.some((r) => r.status === "submitted")

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const exitSelect = () => {
    setSelectMode(false)
    setSelected(new Set())
  }

  const bulkApprove = () => {
    const ids = [...selected]
    if (ids.length === 0) return
    setBulkBusy(true)
    Promise.all(
      ids.map((rid) =>
        fetch(`/api/procurement/requests/${rid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
        })
          .then((r) => ({ rid, ok: r.ok }))
          .catch(() => ({ rid, ok: false }))
      )
    )
      .then((outcomes) => {
        const failed = outcomes.filter((o) => !o.ok).length
        const ok = outcomes.length - failed
        void queryClient.invalidateQueries({ queryKey: ["purchase-requests"] })
        if (failed === 0) toast.success(`${ok} approved`)
        else if (ok === 0) toast.error("Couldn't approve requests", "Please try again.")
        else toast.warning(`${ok} approved`, `${failed} could not be processed.`)
        exitSelect()
      })
      .finally(() => setBulkBusy(false))
  }

  function handleNewPR() {
    openSheet({
      snapPoints: ["full"],
      defaultSnap: "full",
      title: "New Purchase Request",
      render: (onClose) => (
        <NewPRForm
          onClose={onClose}
          onSuccess={() => {
            void queryClient.invalidateQueries({ queryKey: ["purchase-requests"] })
          }}
        />
      ),
    })
  }

  return (
    <div
      style={{
        padding: "32px 16px 140px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        WebkitFontSmoothing: "antialiased",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <h1
            style={{ fontSize: 28, fontWeight: 700, color: "var(--prv-text-1)", margin: "0 0 4px" }}
          >
            Purchase Requests
          </h1>
          <p style={{ fontSize: 14, color: "var(--prv-text-3)", margin: 0 }}>
            Procurement approval workflow
          </p>
        </div>
        {hasSubmitted && (
          <button
            type="button"
            onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
            style={{
              fontSize: 13,
              fontWeight: 600,
              padding: "7px 14px",
              borderRadius: 100,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.14)",
              color: "rgba(255,255,255,0.8)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {selectMode ? "Cancel" : "Select"}
          </button>
        )}
      </div>

      {/* Meta strip */}
      {meta && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            marginBottom: 20,
          }}
        >
          {[
            { label: "Total", val: meta.totalCount },
            { label: "Submitted", val: meta.submittedCount },
            { label: "Approved", val: meta.approvedCount },
            {
              label: "Pending Value",
              val: `${meta.pendingValue.toLocaleString("ro-RO")} RON`,
              small: true,
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              style={{
                background: "var(--prv-g1)",
                border: "1px solid var(--prv-border-subtle)",
                borderRadius: 14,
                padding: "10px 12px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "0 0 auto",
                  height: 1,
                  background: "linear-gradient(90deg,transparent,var(--prv-border),transparent)",
                }}
              />
              <p
                style={{
                  fontSize: kpi.small ? 12 : 18,
                  fontWeight: 700,
                  color: "var(--prv-text-1)",
                  margin: "0 0 2px",
                  lineHeight: 1.1,
                }}
              >
                {kpi.val}
              </p>
              <p style={{ fontSize: 10, color: "var(--prv-text-3)", margin: 0, fontWeight: 500 }}>
                {kpi.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 4,
          marginBottom: 16,
          scrollbarWidth: "none",
        }}
      >
        {FILTER_TABS.map((tab) => {
          const active = filter === tab
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                flex: "0 0 auto",
                padding: "7px 14px",
                borderRadius: 100,
                border: active
                  ? "1px solid rgba(255,255,255,.35)"
                  : "1px solid rgba(255,255,255,.10)",
                background: active ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.04)",
                color: active ? "var(--prv-text-1)" : "var(--prv-text-3)",
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {tab}
            </button>
          )
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                background: "var(--prv-g1)",
                border: "1px solid var(--prv-border-subtle)",
                borderRadius: 18,
                padding: 16,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Skeleton w="40%" h={14} />
                  <Skeleton w={60} h={20} radius={8} />
                </div>
                <Skeleton w="65%" h={18} />
                <div style={{ display: "flex", gap: 6 }}>
                  <Skeleton w={70} h={20} radius={8} />
                  <Skeleton w={80} h={20} radius={8} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <p style={{ color: "var(--prv-text-3)", fontSize: 14 }}>No purchase requests found.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {requests.map((pr) => {
            const sc = STATUS_CONFIG[pr.status]
            const urg = URGENCY_CONFIG[pr.urgency]
            const selectable = selectMode && pr.status === "submitted"
            const isSelected = selected.has(pr.id)
            return (
              <button
                key={pr.id}
                onClick={
                  selectMode
                    ? () => selectable && toggleSelect(pr.id)
                    : () => router.push(`/procurement/requests/${pr.id}`)
                }
                disabled={selectMode && !selectable}
                style={{
                  background: "var(--prv-g1)",
                  border: `1px solid ${isSelected ? "rgba(255,255,255,0.5)" : "var(--prv-border-subtle)"}`,
                  borderRadius: 18,
                  padding: 16,
                  textAlign: "left",
                  cursor: selectMode ? (selectable ? "pointer" : "default") : "pointer",
                  opacity: selectMode && !selectable ? 0.4 : 1,
                  position: "relative",
                  overflow: "hidden",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: "0 0 auto",
                    height: 1,
                    background: "linear-gradient(90deg,transparent,var(--prv-border),transparent)",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  {selectMode && (
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 7,
                        flexShrink: 0,
                        marginRight: 10,
                        marginTop: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: isSelected
                          ? "2px solid transparent"
                          : "2px solid rgba(255,255,255,0.3)",
                        background: isSelected ? "rgba(255,255,255,0.95)" : "transparent",
                        color: "#000",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      {isSelected ? "\u2713" : ""}
                    </span>
                  )}
                  <div style={{ flex: 1, marginRight: 10 }}>
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--prv-text-3)",
                        margin: "0 0 3px",
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {pr.ref}
                    </p>
                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "var(--prv-text-1)",
                        margin: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      {pr.itemDescription}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: sc.bg,
                        color: sc.color,
                        border: `1px solid ${sc.border}`,
                        letterSpacing: "0.03em",
                      }}
                    >
                      {sc.label}
                    </span>
                    <div style={{ color: "var(--prv-text-3)" }}>
                      <IconChevronRight />
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: "rgba(255,255,255,.06)",
                      color: "var(--prv-text-2)",
                    }}
                  >
                    {pr.category}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: urg.bg,
                      color: urg.color,
                    }}
                  >
                    {urg.label}
                  </span>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <p style={{ fontSize: 12, color: "var(--prv-text-3)", margin: 0 }}>
                    {pr.requestedByName} ·{" "}
                    {new Date(pr.createdAt).toLocaleDateString("ro-RO", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  <p
                    style={{ fontSize: 14, fontWeight: 700, color: "var(--prv-text-1)", margin: 0 }}
                  >
                    {pr.estimatedCost.toLocaleString("ro-RO")} {pr.currency}
                  </p>
                </div>
              </button>
            )
          })}

          {hasNextPage && (
            <button
              onClick={() => void fetchNextPage()}
              style={{
                padding: "12px 0",
                background: "transparent",
                border: "1px solid rgba(255,255,255,.10)",
                borderRadius: 14,
                color: "var(--prv-text-2)",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Load more
            </button>
          )}
        </div>
      )}

      {selectMode && selected.size > 0 && (
        <div
          style={{
            position: "fixed",
            left: 16,
            right: 16,
            bottom: 24,
            zIndex: 70,
            display: "flex",
            gap: 10,
            padding: 12,
            borderRadius: 18,
            background: "rgba(28,28,30,0.82)",
            backdropFilter: "blur(32px) saturate(180%)",
            WebkitBackdropFilter: "blur(32px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
            maxWidth: 620,
            margin: "0 auto",
          }}
        >
          <span
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              paddingLeft: 8,
              fontSize: 14,
              fontWeight: 600,
              color: "rgba(255,255,255,0.75)",
            }}
          >
            {selected.size} selected
          </span>
          <button
            type="button"
            disabled={bulkBusy}
            onClick={bulkApprove}
            style={{
              padding: "12px 22px",
              borderRadius: 12,
              background: "#fff",
              border: "none",
              color: "#000",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: bulkBusy ? "default" : "pointer",
              opacity: bulkBusy ? 0.6 : 1,
            }}
          >
            {bulkBusy ? "Working\u2026" : "Approve"}
          </button>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={handleNewPR}
        style={{
          position: "fixed",
          bottom: 100,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "rgba(255,255,255,.95)",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 8px 32px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.3)",
          color: "#000",
          zIndex: 40,
        }}
      >
        <IconPlus />
      </button>
    </div>
  )
}
