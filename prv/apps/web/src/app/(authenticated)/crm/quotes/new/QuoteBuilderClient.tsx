"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { GlassInput, GlassSelect, type SelectItem } from "@prv/ui"
import { useClients } from "@/lib/api-hooks"

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuoteLineItem {
  id: string
  description: string
  category: string
  qty: number
  unitPrice: number
  discount: number
  taxRate: number
}

const CATEGORY_OPTIONS: SelectItem[] = [
  { value: "manopera", label: "Manoperă" },
  { value: "materiale", label: "Materiale" },
  { value: "transport", label: "Transport" },
  { value: "proiectare", label: "Proiectare" },
  { value: "consultanta", label: "Consultanță" },
  { value: "utilaje", label: "Utilaje" },
]

const TAX_OPTIONS: SelectItem[] = [
  { value: "0", label: "0% (Scutit)" },
  { value: "5", label: "5%" },
  { value: "9", label: "9%" },
  { value: "19", label: "19% TVA" },
]

const VALIDITY_OPTIONS: SelectItem[] = [
  { value: "15", label: "15 zile" },
  { value: "30", label: "30 zile" },
  { value: "45", label: "45 zile" },
  { value: "60", label: "60 zile" },
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

function lineNet(item: QuoteLineItem) {
  return item.qty * item.unitPrice * (1 - item.discount / 100)
}

function lineTax(item: QuoteLineItem) {
  return lineNet(item) * (item.taxRate / 100)
}

function lineTotal(item: QuoteLineItem) {
  return lineNet(item) + lineTax(item)
}

// ── CSS tokens ────────────────────────────────────────────────────────────────

const g1 = "var(--prv-g1)"
const g2 = "var(--prv-g2)"
const bds = "var(--prv-border-subtle)"
const t3 = "var(--prv-text-3)"

// ── Line item row ─────────────────────────────────────────────────────────────

function LineItemRow({
  item,
  onChange,
  onRemove,
  canRemove,
}: {
  item: QuoteLineItem
  onChange: (updated: QuoteLineItem) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const net = lineNet(item)
  const tax = lineTax(item)
  const total = net + tax

  return (
    <div className="p-3 rounded-[14px] mb-2" style={{ background: g2, border: `1px solid ${bds}` }}>
      {/* Description + remove */}
      <div className="flex items-start gap-2 mb-2">
        <GlassInput
          value={item.description}
          onChange={(e) => onChange({ ...item, description: e.target.value })}
          placeholder="Descriere serviciu / lucrare"
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

      {/* Category */}
      <div className="mb-2">
        <p className="text-[10px] text-white/35 mb-1 font-semibold uppercase tracking-wider">
          Categorie
        </p>
        <GlassSelect
          value={item.category}
          items={CATEGORY_OPTIONS}
          onChange={(v) => onChange({ ...item, category: v })}
        />
      </div>

      {/* Qty / Unit price / Discount / TVA */}
      <div className="grid grid-cols-4 gap-2">
        <div>
          <p className="text-[10px] text-white/35 mb-1 font-semibold uppercase tracking-wider">
            Cant.
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
            Preț (€)
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
            Disc %
          </p>
          <GlassInput
            type="number"
            value={String(item.discount)}
            onChange={(e) =>
              onChange({ ...item, discount: Math.min(100, Math.max(0, Number(e.target.value))) })
            }
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

      {/* Line totals */}
      <div
        className="flex items-center justify-between mt-2 pt-2"
        style={{ borderTop: `1px solid ${bds}` }}
      >
        <span className="text-[11px] text-white/35">
          Net {fmtMoney(net)}
          {item.discount > 0 && (
            <span className="ml-1 text-[10px]" style={{ color: "rgba(255,159,10,0.8)" }}>
              −{item.discount}%
            </span>
          )}{" "}
          + TVA {fmtMoney(tax)}
        </span>
        <span className="text-[13px] font-bold text-white/90">{fmtMoney(total)}</span>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function QuoteBuilderClient() {
  const today = "2026-06-07"

  const { data: clientsData } = useClients()
  const clientOptions = useMemo<SelectItem[]>(
    () => (clientsData?.clients ?? []).map((c) => ({ value: c.id, label: c.name })),
    [clientsData]
  )

  const [clientId, setClientId] = useState("")
  const [projectName, setProjectName] = useState("")
  const [coverText, setCoverText] = useState("")
  const [issueDate, setIssueDate] = useState(today)
  const [validityDays, setValidityDays] = useState("30")
  const [notes, setNotes] = useState("")
  const [saved, setSaved] = useState<null | "draft" | "sent">(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [items, setItems] = useState<QuoteLineItem[]>([
    {
      id: newId(),
      description: "",
      category: "manopera",
      qty: 1,
      unitPrice: 0,
      discount: 0,
      taxRate: 19,
    },
  ])

  function updateItem(id: string, updated: QuoteLineItem) {
    setItems((prev) => prev.map((it) => (it.id === id ? updated : it)))
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: newId(),
        description: "",
        category: "manopera",
        qty: 1,
        unitPrice: 0,
        discount: 0,
        taxRate: 19,
      },
    ])
  }

  const subtotal = items.reduce((s, it) => s + lineNet(it), 0)
  const totalDiscount = items.reduce((s, it) => {
    const gross = it.qty * it.unitPrice
    return s + (gross - lineNet(it))
  }, 0)
  const totalTax = items.reduce((s, it) => s + lineTax(it), 0)
  const total = subtotal + totalTax
  const expiryDate = addDays(issueDate, parseInt(validityDays, 10))

  async function handleSubmit(type: "draft" | "sent") {
    setIsSubmitting(true)
    try {
      await fetch("/api/crm/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          projectName,
          items,
          validityDays: parseInt(validityDays, 10),
          notes,
          coverText,
          status: type,
        }),
      })
    } finally {
      setIsSubmitting(false)
    }
    setSaved(type)
  }

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
          {saved === "draft" ? "Ofertă salvată ca ciornă" : "Ofertă trimisă clientului"}
        </p>
        <p className="text-[13px] text-white/40 mb-6">
          {saved === "draft"
            ? "O poți trimite oricând din lista de oferte."
            : `Valabilă până la ${expiryDate}.`}
        </p>
        <div className="flex gap-3">
          <Link
            href="/crm/quotes"
            className="px-5 py-2.5 rounded-[12px] text-[13px] font-semibold"
            style={{
              background: g2,
              border: `1px solid ${bds}`,
              color: "var(--prv-text-1)",
              textDecoration: "none",
            }}
          >
            Vezi toate ofertele
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
            Ofertă nouă
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
            href="/crm/quotes"
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
            Oferte
          </Link>
          <h1 className="text-white/90 text-[26px] font-semibold tracking-tight leading-tight">
            Ofertă Nouă
          </h1>
        </div>
        <div
          className="px-3 py-1.5 rounded-[10px] text-[12px] font-semibold"
          style={{ background: g1, border: `1px solid ${bds}`, color: t3 }}
        >
          {expiryDate}
        </div>
      </div>

      {/* Client + Project */}
      <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mb-2.5">
        Client & Proiect
      </p>
      <div
        className="rounded-[18px] p-4 mb-4"
        style={{ background: g1, border: `1px solid ${bds}` }}
      >
        <div className="mb-3">
          <p className="text-[11px] text-white/35 font-semibold uppercase tracking-wider mb-1.5">
            Client
          </p>
          <GlassSelect
            value={clientId}
            items={[{ value: "", label: "Selectează client..." }, ...clientOptions]}
            onChange={setClientId}
          />
        </div>
        <div>
          <p className="text-[11px] text-white/35 font-semibold uppercase tracking-wider mb-1.5">
            Denumire proiect / lucrare
          </p>
          <GlassInput
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="ex. Renovare apartament 3 camere"
          />
        </div>
      </div>

      {/* Cover letter */}
      <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mb-2.5">
        Scrisoare de intenție
      </p>
      <div className="mb-4">
        <GlassInput
          value={coverText}
          onChange={(e) => setCoverText(e.target.value)}
          placeholder="Introduceți contextul ofertei pentru client (opțional)..."
          className="w-full"
        />
      </div>

      {/* Dates */}
      <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mb-2.5">
        Date & Valabilitate
      </p>
      <div
        className="rounded-[18px] p-4 mb-4 grid grid-cols-2 gap-3"
        style={{ background: g1, border: `1px solid ${bds}` }}
      >
        <div>
          <p className="text-[11px] text-white/35 font-semibold uppercase tracking-wider mb-1.5">
            Data emiterii
          </p>
          <GlassInput
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
        </div>
        <div>
          <p className="text-[11px] text-white/35 font-semibold uppercase tracking-wider mb-1.5">
            Valabilitate
          </p>
          <GlassSelect value={validityDays} items={VALIDITY_OPTIONS} onChange={setValidityDays} />
        </div>
        <div className="col-span-2">
          <p className="text-[11px] text-white/35 mt-1">
            Expiră: <span className="font-semibold text-white/65">{expiryDate}</span>
          </p>
        </div>
      </div>

      {/* Line items */}
      <div className="flex items-center justify-between mx-1 mb-2.5">
        <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest">
          Articole ({items.length})
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
          Adaugă
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

      {/* Totals */}
      <div
        className="rounded-[18px] overflow-hidden mb-4"
        style={{ background: g1, border: `1px solid ${bds}` }}
      >
        {[
          { label: "Subtotal brut", value: fmtMoney(subtotal + totalDiscount), muted: true },
          ...(totalDiscount > 0
            ? [
                {
                  label: "Discount total",
                  value: `−${fmtMoney(totalDiscount)}`,
                  muted: true,
                  discount: true,
                },
              ]
            : []),
          { label: "Subtotal net", value: fmtMoney(subtotal), muted: true },
          { label: "TVA", value: fmtMoney(totalTax), muted: true },
        ].map(({ label, value, discount: isDiscount }) => (
          <div
            key={label}
            className="flex justify-between px-4 py-2.5"
            style={{ borderBottom: `1px solid ${bds}` }}
          >
            <span className="text-[13px] text-white/45">{label}</span>
            <span
              className={`text-[13px] ${isDiscount ? "" : "text-white/65"}`}
              style={isDiscount ? { color: "rgba(255,159,10,0.85)" } : {}}
            >
              {value}
            </span>
          </div>
        ))}
        <div className="flex justify-between px-4 py-3.5">
          <span className="text-[15px] font-bold text-white/90">Total ofertă</span>
          <span className="text-[18px] font-bold" style={{ color: "rgba(48,209,88,0.95)" }}>
            {fmtMoney(total)}
          </span>
        </div>
      </div>

      {/* Internal notes */}
      <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mb-2.5">
        Notă internă
      </p>
      <div className="mb-5">
        <GlassInput
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observații interne (nu sunt vizibile pentru client)..."
          className="w-full"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => handleSubmit("draft")}
          disabled={isSubmitting}
          className="flex-1 py-3.5 rounded-[14px] text-[14px] font-semibold"
          style={{ background: g2, border: `1px solid ${bds}`, color: "var(--prv-text-2)" }}
        >
          Salvează ciornă
        </button>
        <button
          onClick={() => handleSubmit("sent")}
          disabled={isSubmitting || !clientId || total === 0}
          className="flex-1 py-3.5 rounded-[14px] text-[14px] font-bold"
          style={{
            background: clientId && total > 0 ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.08)",
            color: clientId && total > 0 ? "#000" : "rgba(255,255,255,0.25)",
          }}
        >
          {isSubmitting ? "Se trimite..." : "Trimite ofertă"}
        </button>
      </div>
    </div>
  )
}
