"use client"

import { useState } from "react"
import Link from "next/link"
import type { ExpenseCategory } from "@/app/api/finance/expenses/route"

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconChevronLeft() {
  return (
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
  )
}

function IconPlus() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExpenseLineItem {
  id: string
  description: string
  category: ExpenseCategory
  amount: number
  vatRate: number
  vendorName: string
  date: string
  receiptRef: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "materiale", label: "Materiale" },
  { value: "personal", label: "Personal" },
  { value: "logistica", label: "Logistică" },
  { value: "utilitati", label: "Utilități" },
  { value: "marketing", label: "Marketing" },
  { value: "altele", label: "Altele" },
]

const VAT_OPTIONS = [
  { value: 0, label: "0%" },
  { value: 5, label: "5%" },
  { value: 9, label: "9%" },
  { value: 19, label: "19%" },
]

const TODAY = new Date().toISOString().slice(0, 10)

function newLine(): ExpenseLineItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    category: "altele",
    amount: 0,
    vatRate: 19,
    vendorName: "",
    date: TODAY,
    receiptRef: "",
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "rgba(255,255,255,0.35)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: 8,
      }}
    >
      {children}
    </p>
  )
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string
  value: string | number
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "rgba(255,255,255,0.40)",
          marginBottom: 5,
        }}
      >
        {label}
      </p>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 10,
          padding: "9px 12px",
          fontSize: 14,
          color: "rgba(255,255,255,0.90)",
          outline: "none",
        }}
      />
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string | number
  onChange: (v: string) => void
  options: { value: string | number; label: string }[]
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "rgba(255,255,255,0.40)",
          marginBottom: 5,
        }}
      >
        {label}
      </p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 10,
          padding: "9px 12px",
          fontSize: 14,
          color: "rgba(255,255,255,0.90)",
          outline: "none",
          appearance: "none",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: "#1a1a1a", color: "#fff" }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function LineItemRow({
  item,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  item: ExpenseLineItem
  index: number
  onChange: (id: string, field: keyof ExpenseLineItem, value: string | number) => void
  onRemove: (id: string) => void
  canRemove: boolean
}) {
  const vatAmt = item.amount * (item.vatRate / 100)
  const total = item.amount + vatAmt

  return (
    <div
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        borderRadius: 16,
        padding: "12px 14px",
        marginBottom: 8,
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "rgba(255,255,255,0.30)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Linie {index + 1}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "rgba(255,255,255,0.90)",
              letterSpacing: "-0.3px",
            }}
          >
            €{total.toLocaleString("ro-RO", { maximumFractionDigits: 2 })}
          </span>
          {canRemove && (
            <button
              onClick={() => onRemove(item.id)}
              style={{
                background: "rgba(255,59,48,0.15)",
                border: "1px solid rgba(255,59,48,0.25)",
                borderRadius: 8,
                padding: "5px 7px",
                color: "rgba(255,100,90,0.9)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <IconTrash />
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <InputField
            label="Descriere"
            value={item.description}
            onChange={(v) => onChange(item.id, "description", v)}
            placeholder="Ex. Combustibil, materiale..."
          />
        </div>
        <SelectField
          label="Categorie"
          value={item.category}
          onChange={(v) => onChange(item.id, "category", v)}
          options={CATEGORIES}
        />
        <InputField
          label="Furnizor"
          value={item.vendorName}
          onChange={(v) => onChange(item.id, "vendorName", v)}
          placeholder="Nume furnizor"
        />
        <InputField
          label="Sumă (fără TVA) €"
          value={item.amount || ""}
          type="number"
          onChange={(v) => onChange(item.id, "amount", parseFloat(v) || 0)}
          placeholder="0.00"
        />
        <SelectField
          label="Cotă TVA"
          value={item.vatRate}
          onChange={(v) => onChange(item.id, "vatRate", parseInt(v))}
          options={VAT_OPTIONS}
        />
        <InputField
          label="Data"
          value={item.date}
          type="date"
          onChange={(v) => onChange(item.id, "date", v)}
        />
        <InputField
          label="Nr. chitanță / factură"
          value={item.receiptRef}
          onChange={(v) => onChange(item.id, "receiptRef", v)}
          placeholder="Ex. F-1234"
        />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ExpenseReportBuilderClient() {
  const [title, setTitle] = useState("")
  const [period, setPeriod] = useState(TODAY.slice(0, 7))
  const [projectRef, setProjectRef] = useState("")
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<ExpenseLineItem[]>([newLine()])
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const updateLine = (id: string, field: keyof ExpenseLineItem, value: string | number) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)))
  }
  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id))
  const addLine = () => setLines((prev) => [...prev, newLine()])

  const subtotalNet = lines.reduce((s, l) => s + l.amount, 0)
  const totalVat = lines.reduce((s, l) => s + l.amount * (l.vatRate / 100), 0)
  const totalGross = subtotalNet + totalVat

  const handleSubmit = async (status: "draft" | "pending") => {
    setSubmitting(true)
    try {
      await fetch("/api/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Raport cheltuieli",
          period,
          projectRef,
          notes,
          lines,
          status,
        }),
      })
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
        <div
          style={{
            marginTop: 40,
            textAlign: "center",
            padding: "40px 24px",
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 20,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 100,
              background: "rgba(90,255,160,0.15)",
              border: "1px solid rgba(90,255,160,0.30)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "#5affa0",
            }}
          >
            <IconCheck />
          </div>
          <p
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "rgba(255,255,255,0.95)",
              marginBottom: 6,
            }}
          >
            Cheltuială salvată
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.40)", marginBottom: 28 }}>
            Raportul a fost trimis spre aprobare
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Link
              href="/finance/expenses"
              style={{
                padding: "10px 20px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.92)",
                color: "#000",
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Înapoi la cheltuieli
            </Link>
            <button
              onClick={() => {
                setDone(false)
                setTitle("")
                setLines([newLine()])
                setNotes("")
              }}
              style={{
                padding: "10px 20px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "rgba(255,255,255,0.80)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cheltuială nouă
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <Link
          href="/finance/expenses"
          style={{
            display: "flex",
            alignItems: "center",
            color: "rgba(255,255,255,0.40)",
            textDecoration: "none",
          }}
        >
          <IconChevronLeft />
        </Link>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "rgba(255,255,255,0.95)",
          }}
        >
          Cheltuială Nouă
        </h1>
      </div>

      {/* Report header fields */}
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 20,
          padding: "16px 16px 8px",
          marginBottom: 16,
        }}
      >
        <SectionLabel>Detalii raport</SectionLabel>
        <InputField
          label="Titlu raport"
          value={title}
          onChange={setTitle}
          placeholder="Ex. Cheltuieli materiale lot 4 mai 2026"
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <InputField label="Perioadă" value={period} type="month" onChange={setPeriod} />
          <InputField
            label="Ref. proiect (opțional)"
            value={projectRef}
            onChange={setProjectRef}
            placeholder="Ex. PRJ-042"
          />
        </div>
      </div>

      {/* Line items */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <SectionLabel>Linii cheltuieli</SectionLabel>
          <button
            onClick={addLine}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 12px",
              borderRadius: 100,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.14)",
              color: "rgba(255,255,255,0.70)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <IconPlus /> Adaugă linie
          </button>
        </div>
        {lines.map((line, i) => (
          <LineItemRow
            key={line.id}
            item={line}
            index={i}
            onChange={updateLine}
            onRemove={removeLine}
            canRemove={lines.length > 1}
          />
        ))}
      </div>

      {/* Totals */}
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 20,
          padding: "14px 16px",
          marginBottom: 16,
        }}
      >
        <SectionLabel>Rezumat financiar</SectionLabel>
        {[
          { label: "Subtotal net", value: subtotalNet },
          { label: "Total TVA", value: totalVat },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.50)" }}>{label}</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.80)", fontWeight: 600 }}>
              €{value.toLocaleString("ro-RO", { maximumFractionDigits: 2 })}
            </span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>
            Total
          </span>
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "rgba(255,255,255,0.95)",
              letterSpacing: "-0.3px",
            }}
          >
            €{totalGross.toLocaleString("ro-RO", { maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Notes */}
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 20,
          padding: "14px 16px",
          marginBottom: 24,
        }}
      >
        <SectionLabel>Observații interne</SectionLabel>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notițe interne, context suplimentar..."
          rows={3}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 10,
            padding: "9px 12px",
            fontSize: 13,
            color: "rgba(255,255,255,0.80)",
            outline: "none",
            resize: "none",
            lineHeight: 1.5,
          }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => handleSubmit("draft")}
          disabled={submitting}
          style={{
            flex: 1,
            padding: "13px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.14)",
            color: "rgba(255,255,255,0.80)",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            opacity: submitting ? 0.5 : 1,
          }}
        >
          Salvează ciornă
        </button>
        <button
          onClick={() => handleSubmit("pending")}
          disabled={submitting}
          style={{
            flex: 2,
            padding: "13px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.92)",
            color: "#000",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            border: "none",
            opacity: submitting ? 0.5 : 1,
          }}
        >
          Trimite spre aprobare
        </button>
      </div>
    </div>
  )
}
