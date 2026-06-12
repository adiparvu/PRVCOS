"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { GlassInput, GlassSelect, GlassButton, type SelectItem } from "@prv/ui"
import { useClients, useProjects } from "@/lib/api-hooks"

// ── Types ─────────────────────────────────────────────────────────────────────

interface LineItem {
  id: string
  description: string
  qty: number
  unitPrice: number
  taxRate: number
}

const TAX_OPTIONS: SelectItem[] = [
  { value: "0", label: "0% (Exempt)" },
  { value: "5", label: "5%" },
  { value: "9", label: "9%" },
  { value: "19", label: "19% VAT" },
]

const PAYMENT_TERMS: SelectItem[] = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

let _nextId = 1
function newId() {
  return String(_nextId++)
}

function fmtMoney(n: number) {
  return `€${n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ── Line item row ─────────────────────────────────────────────────────────────

function LineItemRow({
  item,
  onChange,
  onRemove,
  canRemove,
}: {
  item: LineItem
  onChange: (updated: LineItem) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const lineTotal = item.qty * item.unitPrice
  const lineTax = lineTotal * (item.taxRate / 100)

  return (
    <div
      className="p-3 rounded-[14px] mb-2"
      style={{ background: "var(--prv-g2)", border: "1px solid var(--prv-border-subtle)" }}
    >
      <div className="flex items-start gap-2 mb-2">
        <GlassInput
          value={item.description}
          onChange={(e) => onChange({ ...item, description: e.target.value })}
          placeholder="Service / material description"
          className="flex-1 text-[13px]"
        />
        {canRemove && (
          <button
            onClick={onRemove}
            className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: "rgba(255,69,58,0.12)", color: "rgba(255,69,58,0.8)" }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] text-white/35 mb-1 font-semibold uppercase tracking-wider">
            Quantity
          </p>
          <GlassInput
            type="number"
            value={String(item.qty)}
            onChange={(e) => onChange({ ...item, qty: Math.max(1, Number(e.target.value)) })}
            className="text-[13px]"
          />
        </div>
        <div>
          <p className="text-[10px] text-white/35 mb-1 font-semibold uppercase tracking-wider">
            Unit price (€)
          </p>
          <GlassInput
            type="number"
            value={String(item.unitPrice)}
            onChange={(e) => onChange({ ...item, unitPrice: Math.max(0, Number(e.target.value)) })}
            className="text-[13px]"
          />
        </div>
        <div>
          <p className="text-[10px] text-white/35 mb-1 font-semibold uppercase tracking-wider">
            TVA
          </p>
          <GlassSelect
            value={String(item.taxRate)}
            items={TAX_OPTIONS}
            onChange={(v) => onChange({ ...item, taxRate: Number(v) })}
          />
        </div>
      </div>
      <div
        className="flex items-center justify-between mt-2 pt-2"
        style={{ borderTop: "1px solid var(--prv-border-subtle)" }}
      >
        <span className="text-[11px] text-white/35">
          Net: {fmtMoney(lineTotal)} + VAT {fmtMoney(lineTax)}
        </span>
        <span className="text-[13px] font-bold text-white/90">{fmtMoney(lineTotal + lineTax)}</span>
      </div>
    </div>
  )
}

// ── Invoice preview ───────────────────────────────────────────────────────────

function InvoicePreview({
  clientName,
  projectName,
  issueDate,
  paymentTerms,
  items,
  notes,
}: {
  clientName: string
  projectName: string
  issueDate: string
  paymentTerms: string
  items: LineItem[]
  notes: string
}) {
  const client = clientName || "—"
  const project = projectName || "—"
  const dueDate = addDays(issueDate, parseInt(paymentTerms, 10))
  const subtotal = items.reduce((s, it) => s + it.qty * it.unitPrice, 0)
  const tax = items.reduce((s, it) => s + it.qty * it.unitPrice * (it.taxRate / 100), 0)
  const total = subtotal + tax

  const refNum = `INV-${String(Date.now()).slice(-4)}`

  return (
    <div
      className="rounded-[18px] overflow-hidden"
      style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
    >
      {/* Preview header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ borderBottom: "1px solid var(--prv-border-subtle)", background: "var(--prv-g2)" }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--prv-text-3)"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span className="text-[12px] text-white/45 font-semibold">Invoice preview</span>
      </div>

      <div className="p-4">
        {/* Invoice header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[18px] font-bold text-white/90">PRV Renovations</p>
            <p className="text-[11px] text-white/35 mt-0.5">VAT ID: RO44123456</p>
            <p className="text-[11px] text-white/35">Cluj-Napoca, Romania</p>
          </div>
          <div className="text-right">
            <p className="text-[16px] font-bold text-white/90">{refNum}</p>
            <p className="text-[11px] text-white/35 mt-0.5">Issued: {issueDate}</p>
            <p className="text-[11px] text-white/35">Due: {dueDate}</p>
          </div>
        </div>

        {/* Client */}
        <div className="p-3 rounded-[12px] mb-4" style={{ background: "var(--prv-g2)" }}>
          <p className="text-[10px] text-white/35 font-semibold uppercase tracking-wider mb-1">
            Bill to
          </p>
          <p className="text-[14px] font-semibold text-white/90">{client}</p>
          {project !== "—" && <p className="text-[12px] text-white/45 mt-0.5">{project}</p>}
        </div>

        {/* Line items */}
        <table className="w-full mb-4" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--prv-border-subtle)" }}>
              {["Description", "Qty.", "Price", "VAT", "Total"].map((h) => (
                <th
                  key={h}
                  className={`text-[10px] font-semibold text-white/35 uppercase tracking-wider pb-2 ${h === "Descriere" ? "text-left" : "text-right"}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const lt = it.qty * it.unitPrice
              const lTax = lt * (it.taxRate / 100)
              return (
                <tr key={it.id} style={{ borderBottom: "1px solid var(--prv-border-subtle)" }}>
                  <td className="text-[12px] text-white/75 py-2 pr-2">{it.description || "—"}</td>
                  <td className="text-[12px] text-white/55 py-2 text-right">{it.qty}</td>
                  <td className="text-[12px] text-white/55 py-2 text-right">
                    {fmtMoney(it.unitPrice)}
                  </td>
                  <td className="text-[12px] text-white/45 py-2 text-right">{it.taxRate}%</td>
                  <td className="text-[12px] font-semibold text-white/90 py-2 text-right">
                    {fmtMoney(lt + lTax)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div className="space-y-1.5 mb-4">
          {[
            { label: "Subtotal", value: fmtMoney(subtotal), muted: true },
            { label: "VAT", value: fmtMoney(tax), muted: true },
          ].map(({ label, value, muted }) => (
            <div key={label} className="flex justify-between">
              <span className="text-[12px] text-white/45">{label}</span>
              <span
                className={`text-[12px] ${muted ? "text-white/55" : "text-white/90 font-bold"}`}
              >
                {value}
              </span>
            </div>
          ))}
          <div
            className="flex justify-between pt-2"
            style={{ borderTop: "1px solid var(--prv-border-subtle)" }}
          >
            <span className="text-[14px] font-bold text-white/90">Total</span>
            <span className="text-[16px] font-bold" style={{ color: "rgba(48,209,88,0.95)" }}>
              {fmtMoney(total)}
            </span>
          </div>
        </div>

        {notes && (
          <div className="p-3 rounded-[10px]" style={{ background: "var(--prv-g2)" }}>
            <p className="text-[10px] text-white/35 font-semibold uppercase tracking-wider mb-1">
              Note
            </p>
            <p className="text-[12px] text-white/55 leading-relaxed">{notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function InvoiceBuilderClient() {
  const today = new Date().toISOString().slice(0, 10)

  const { data: clientsData } = useClients()
  const { data: projectsData } = useProjects()

  const clientOptions = useMemo<SelectItem[]>(
    () => (clientsData?.clients ?? []).map((c) => ({ value: c.id, label: c.name })),
    [clientsData]
  )
  const projectOptions = useMemo<SelectItem[]>(
    () => (projectsData?.projects ?? []).map((p) => ({ value: p.id, label: p.name })),
    [projectsData]
  )

  const [clientId, setClientId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [issueDate, setIssueDate] = useState(today)
  const [paymentTerms, setPaymentTerms] = useState("30")
  const [notes, setNotes] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [saved, setSaved] = useState<null | "draft" | "final">(null)

  const [items, setItems] = useState<LineItem[]>([
    { id: newId(), description: "", qty: 1, unitPrice: 0, taxRate: 19 },
  ])

  function updateItem(id: string, updated: LineItem) {
    setItems((prev) => prev.map((it) => (it.id === id ? updated : it)))
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: newId(), description: "", qty: 1, unitPrice: 0, taxRate: 19 },
    ])
  }

  const subtotal = items.reduce((s, it) => s + it.qty * it.unitPrice, 0)
  const tax = items.reduce((s, it) => s + it.qty * it.unitPrice * (it.taxRate / 100), 0)
  const total = subtotal + tax

  if (saved) {
    return (
      <div
        className="px-4 pt-14 pb-28 max-w-2xl mx-auto flex flex-col items-center justify-center"
        style={{ minHeight: "50vh" }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: "rgba(48,209,88,0.15)", border: "1px solid rgba(48,209,88,0.3)" }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(48,209,88,0.95)"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <p className="text-[20px] font-bold text-white/90 mb-1">
          {saved === "draft" ? "Invoice saved as draft" : "Invoice finalized"}
        </p>
        <p className="text-[13px] text-white/40 mb-6">
          {saved === "draft" ? "You can finalize it anytime." : "Added to the system."}
        </p>
        <div className="flex gap-3">
          <Link
            href="/finance/invoices"
            className="px-5 py-2.5 rounded-[12px] text-[13px] font-semibold"
            style={{
              background: "var(--prv-g2)",
              border: "1px solid var(--prv-border-subtle)",
              color: "var(--prv-text-1)",
              textDecoration: "none",
            }}
          >
            View invoices
          </Link>
          <button
            onClick={() => setSaved(null)}
            className="px-5 py-2.5 rounded-[12px] text-[13px] font-semibold"
            style={{
              background: "rgba(48,209,88,0.15)",
              border: "1px solid rgba(48,209,88,0.3)",
              color: "rgba(48,209,88,0.95)",
            }}
          >
            + New invoice
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <Link
            href="/finance/invoices"
            className="text-white/35 text-[13px] font-medium mb-0.5 flex items-center gap-1"
            style={{ textDecoration: "none" }}
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
            Invoices
          </Link>
          <h1 className="text-white/90 text-[26px] font-semibold tracking-tight leading-tight">
            New Invoice
          </h1>
        </div>
        <button
          onClick={() => setShowPreview((v) => !v)}
          className="px-3 h-9 rounded-[10px] text-[12px] font-semibold flex items-center gap-1.5"
          style={{
            background: showPreview ? "rgba(10,132,255,0.15)" : "var(--prv-g1)",
            border: `1px solid ${showPreview ? "rgba(10,132,255,0.3)" : "var(--prv-border-subtle)"}`,
            color: showPreview ? "rgba(10,132,255,0.9)" : "var(--prv-text-2)",
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
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Preview
        </button>
      </div>

      {/* Section: Client + Project */}
      <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mb-2.5">
        Client & Project
      </p>
      <div
        className="rounded-[18px] p-4 mb-4"
        style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
      >
        <div className="mb-3">
          <p className="text-[11px] text-white/35 font-semibold uppercase tracking-wider mb-1.5">
            Client
          </p>
          <GlassSelect
            value={clientId}
            items={[{ value: "", label: "Select client..." }, ...clientOptions]}
            onChange={setClientId}
          />
        </div>
        <div>
          <p className="text-[11px] text-white/35 font-semibold uppercase tracking-wider mb-1.5">
            Associated project
          </p>
          <GlassSelect
            value={projectId}
            items={[{ value: "", label: "Select project (optional)..." }, ...projectOptions]}
            onChange={setProjectId}
          />
        </div>
      </div>

      {/* Section: Dates */}
      <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mb-2.5">
        Dates & Terms
      </p>
      <div
        className="rounded-[18px] p-4 mb-4 grid grid-cols-2 gap-3"
        style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
      >
        <div>
          <p className="text-[11px] text-white/35 font-semibold uppercase tracking-wider mb-1.5">
            Issue date
          </p>
          <GlassInput
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
        </div>
        <div>
          <p className="text-[11px] text-white/35 font-semibold uppercase tracking-wider mb-1.5">
            Payment terms
          </p>
          <GlassSelect value={paymentTerms} items={PAYMENT_TERMS} onChange={setPaymentTerms} />
        </div>
        <div className="col-span-2">
          <p className="text-[11px] text-white/35 mt-1">
            Due:{" "}
            <span className="font-semibold text-white/65">
              {addDays(issueDate, parseInt(paymentTerms, 10))}
            </span>
          </p>
        </div>
      </div>

      {/* Section: Line Items */}
      <div className="flex items-center justify-between mx-1 mb-2.5">
        <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest">
          Line Items ({items.length})
        </p>
        <button
          onClick={addItem}
          className="text-[12px] font-semibold flex items-center gap-1"
          style={{ color: "rgba(10,132,255,0.9)" }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add item
        </button>
      </div>

      <div className="mb-4">
        {items.map((it) => (
          <LineItemRow
            key={it.id}
            item={it}
            onChange={(updated) => updateItem(it.id, updated)}
            onRemove={() => removeItem(it.id)}
            canRemove={items.length > 1}
          />
        ))}
      </div>

      {/* Totals summary */}
      <div
        className="rounded-[18px] p-4 mb-4"
        style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
      >
        {[
          { l: "Subtotal", v: fmtMoney(subtotal), bold: false },
          { l: "Total VAT", v: fmtMoney(tax), bold: false },
        ].map(({ l, v }) => (
          <div key={l} className="flex justify-between mb-2">
            <span className="text-[13px] text-white/45">{l}</span>
            <span className="text-[13px] text-white/65">{v}</span>
          </div>
        ))}
        <div
          className="flex justify-between pt-2.5"
          style={{ borderTop: "1px solid var(--prv-border-subtle)" }}
        >
          <span className="text-[15px] font-bold text-white/90">Invoice total</span>
          <span className="text-[18px] font-bold" style={{ color: "rgba(48,209,88,0.95)" }}>
            {fmtMoney(total)}
          </span>
        </div>
      </div>

      {/* Notes */}
      <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mb-2.5">
        Notes
      </p>
      <div className="mb-5">
        <GlassInput
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Payment terms, note for client..."
          className="w-full"
        />
      </div>

      {/* Preview panel */}
      {showPreview && (
        <div className="mb-5">
          <InvoicePreview
            clientName={clientOptions.find((c) => c.value === clientId)?.label ?? ""}
            projectName={projectOptions.find((p) => p.value === projectId)?.label ?? ""}
            issueDate={issueDate}
            paymentTerms={paymentTerms}
            items={items}
            notes={notes}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => setSaved("draft")}
          className="flex-1 py-3.5 rounded-[14px] text-[14px] font-semibold"
          style={{
            background: "var(--prv-g2)",
            border: "1px solid var(--prv-border-subtle)",
            color: "var(--prv-text-2)",
          }}
        >
          Save draft
        </button>
        <button
          onClick={() => setSaved("final")}
          disabled={!clientId || total === 0}
          className="flex-1 py-3.5 rounded-[14px] text-[14px] font-bold"
          style={{
            background: clientId && total > 0 ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.08)",
            color: clientId && total > 0 ? "#000" : "rgba(255,255,255,0.25)",
          }}
        >
          Issue invoice
        </button>
      </div>
    </div>
  )
}
