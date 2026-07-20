"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { MyPayslipDto } from "@/app/api/me/payslips/route"

const green = "rgba(48,209,88,0.95)"
const amber = "rgba(255,159,10,0.95)"
const muted = "var(--prv-text-3)"

const TYPE_LABEL: Record<string, string> = {
  weekly: "Săptămânal",
  monthly: "Lunar",
  special: "Special",
}

function fmtMoney(n: number): string {
  return n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtPeriod(start: string, end: string): string {
  // start/end are YYYY-MM-DD strings.
  try {
    const s = new Date(start + "T00:00:00Z")
    const e = new Date(end + "T00:00:00Z")
    const d = (x: Date) => x.getUTCDate()
    const mon = new Intl.DateTimeFormat("ro-RO", { month: "short", timeZone: "UTC" })
    const yr = e.getUTCFullYear()
    if (s.getUTCMonth() === e.getUTCMonth()) {
      return `${d(s)}–${d(e)} ${mon.format(e)} ${yr}`
    }
    return `${d(s)} ${mon.format(s)} – ${d(e)} ${mon.format(e)} ${yr}`
  } catch {
    return `${start} – ${end}`
  }
}

const card: React.CSSProperties = {
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  borderRadius: 20,
  overflow: "hidden",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
}

const tile: React.CSSProperties = {
  flex: 1,
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border-subtle)",
  borderRadius: 16,
  padding: "14px 16px",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
}

function BreakdownRow({
  label,
  value,
  kind,
}: {
  label: string
  value: number
  kind?: "ded" | "tot"
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 13,
        ...(kind === "tot"
          ? {
              borderTop: "1px solid var(--prv-border-subtle)",
              paddingTop: 9,
              marginTop: 2,
              fontWeight: 680,
            }
          : {}),
      }}
    >
      <span style={{ color: kind === "tot" ? "var(--prv-text-1)" : "var(--prv-text-2)" }}>
        {label}
      </span>
      <span
        style={{
          fontVariantNumeric: "tabular-nums",
          color: kind === "tot" ? green : kind === "ded" ? amber : "var(--prv-text-1)",
        }}
      >
        {kind === "ded" ? "−" : ""}
        {fmtMoney(value)}
      </span>
    </div>
  )
}

function PayslipCard({ p }: { p: MyPayslipDto }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={card}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 18px",
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "inherit",
          fontFamily: "inherit",
          textAlign: "left",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 660 }}>
            {fmtPeriod(p.periodStart, p.periodEnd)}
          </div>
          <div style={{ fontSize: 12, color: muted, marginTop: 3 }}>
            Rulare {TYPE_LABEL[p.runType]?.toLowerCase() ?? p.runType}
          </div>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            padding: "3px 9px",
            borderRadius: 100,
            background: "var(--prv-g2)",
            color: "var(--prv-text-2)",
            border: "1px solid var(--prv-border)",
          }}
        >
          {TYPE_LABEL[p.runType] ?? p.runType}
        </span>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 720 }}>{fmtMoney(p.net)} RON</div>
          <div style={{ fontSize: 11.5, color: muted, marginTop: 2 }}>brut {fmtMoney(p.gross)}</div>
        </div>
        <span style={{ color: muted, fontSize: 12, marginLeft: 4 }}>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div
          style={{
            borderTop: "1px solid var(--prv-border-subtle)",
            padding: "12px 18px 16px",
            display: "grid",
            gap: 7,
          }}
        >
          <BreakdownRow label="Bază" value={p.base} />
          <BreakdownRow label="Ore suplimentare" value={p.overtime} />
          <BreakdownRow label="Bonus" value={p.bonus} />
          <BreakdownRow label="Sporuri" value={p.allowance} />
          <BreakdownRow label="Rețineri" value={p.deduction} kind="ded" />
          <BreakdownRow label="Net de plată" value={p.net} kind="tot" />
        </div>
      )}
    </div>
  )
}

export function MyPayslipsClient() {
  const [payslips, setPayslips] = useState<MyPayslipDto[] | null>(null)

  const load = useCallback(() => {
    return fetch("/api/me/payslips")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { payslips: MyPayslipDto[] }) => setPayslips(d.payslips))
      .catch(() => setPayslips([]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const ytd = useMemo(() => {
    const list = payslips ?? []
    const year = new Date().getUTCFullYear()
    const inYear = list.filter((p) => p.periodEnd.startsWith(String(year)))
    const netYtd = inYear.reduce((s, p) => s + p.net, 0)
    const last = list[0] // sorted desc by periodEnd
    return { netYtd, count: list.length, last }
  }, [payslips])

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "8px 4px 60px" }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: muted,
        }}
      >
        People · Salarizare
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 680, letterSpacing: "-0.02em", margin: "4px 0 0" }}>
        Fluturașii mei
      </h1>
      <div style={{ color: muted, fontSize: 13.5, marginTop: 6 }}>
        Istoricul plăților tale, doar rulările finalizate.
      </div>

      {payslips === null ? (
        <div style={{ color: "var(--prv-text-4)", fontSize: 14, padding: "40px 8px" }}>
          Se încarcă…
        </div>
      ) : payslips.length === 0 ? (
        <div
          style={{
            ...card,
            padding: 24,
            marginTop: 22,
            color: "var(--prv-text-4)",
            fontSize: 14,
            textAlign: "center",
          }}
        >
          Niciun fluturaș încă. Aici vor apărea plățile tale odată ce o rulare de salarii este
          finalizată.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, margin: "22px 0 10px" }}>
            <div style={tile}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: muted,
                  fontWeight: 600,
                }}
              >
                Net an curent
              </div>
              <div style={{ fontSize: 20, fontWeight: 680, marginTop: 6 }}>
                {fmtMoney(ytd.netYtd)} RON
              </div>
            </div>
            <div style={tile}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: muted,
                  fontWeight: 600,
                }}
              >
                Fluturași
              </div>
              <div style={{ fontSize: 20, fontWeight: 680, marginTop: 6 }}>{ytd.count}</div>
            </div>
            <div style={tile}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: muted,
                  fontWeight: 600,
                }}
              >
                Ultimul net
              </div>
              <div style={{ fontSize: 20, fontWeight: 680, marginTop: 6 }}>
                {ytd.last ? `${fmtMoney(ytd.last.net)}` : "—"}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {payslips.map((p) => (
              <PayslipCard key={p.itemId} p={p} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
