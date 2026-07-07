"use client"

import { useSupplierSpend, type SupplierSpendResponse } from "@/lib/api-hooks"

type Row = SupplierSpendResponse["suppliers"][number]

function eur(n: number): string {
  if (Math.abs(n) >= 1000)
    return `€${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`
  return `€${Math.round(n)}`
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string
  value: React.ReactNode
  tone?: "amber" | "red"
}) {
  return (
    <div
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border)",
        borderRadius: 18,
        padding: "15px 17px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <div
        style={{
          color: "var(--prv-text-3)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          fontWeight: 560,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 680,
          marginTop: 8,
          letterSpacing: "-0.02em",
          color:
            tone === "red"
              ? "rgba(255,105,97,0.95)"
              : tone === "amber"
                ? "rgba(255,190,90,0.92)"
                : undefined,
        }}
      >
        {value}
      </div>
    </div>
  )
}

const GRID = "1.6fr 0.9fr 0.9fr 0.9fr"

export function SupplierSpendClient() {
  const { data, isLoading } = useSupplierSpend()
  const suppliers = data?.suppliers ?? []

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Supplier Spend</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · supplier management · spend &amp; payables
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          margin: "24px 0",
        }}
      >
        <Tile label="Total spend" value={eur(data?.totalSpend ?? 0)} />
        <Tile label="Outstanding" value={eur(data?.totalOutstanding ?? 0)} tone="amber" />
        <Tile
          label="Overdue"
          value={eur(data?.totalOverdue ?? 0)}
          tone={(data?.totalOverdue ?? 0) > 0 ? "red" : undefined}
        />
        <Tile label="Suppliers" value={data?.supplierCount ?? 0} />
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && suppliers.length === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>
          No supplier invoices recorded.
        </div>
      )}

      {suppliers.length > 0 && (
        <div
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border)",
            borderRadius: 22,
            padding: "8px 8px 4px",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: GRID,
              gap: 10,
              padding: "12px 16px",
              color: "var(--prv-text-3)",
              fontSize: 10.5,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 560,
              borderBottom: "1px solid var(--prv-border-subtle)",
            }}
          >
            <div>Supplier</div>
            <div style={{ textAlign: "right" }}>Spend</div>
            <div style={{ textAlign: "right" }}>Outstanding</div>
            <div style={{ textAlign: "right" }}>Overdue</div>
          </div>
          {suppliers.map((s: Row, i) => (
            <div
              key={s.supplierId}
              style={{
                display: "grid",
                gridTemplateColumns: GRID,
                gap: 10,
                alignItems: "center",
                padding: "12px 16px",
                borderBottom:
                  i < suppliers.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 560 }}>{s.name}</div>
                <div style={{ color: "var(--prv-text-3)", fontSize: 11, marginTop: 2 }}>
                  {s.invoices} invoice{s.invoices === 1 ? "" : "s"}
                </div>
              </div>
              <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                {eur(s.spend)}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontVariantNumeric: "tabular-nums",
                  textAlign: "right",
                  color: "var(--prv-text-2)",
                }}
              >
                {eur(s.outstanding)}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontVariantNumeric: "tabular-nums",
                  textAlign: "right",
                  fontWeight: s.overdueAmount > 0 ? 600 : 400,
                  color: s.overdueAmount > 0 ? "rgba(255,105,97,0.95)" : "var(--prv-text-3)",
                }}
              >
                {s.overdueAmount > 0 ? eur(s.overdueAmount) : "€0"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
