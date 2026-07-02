"use client"

import { useState } from "react"
import {
  useContracts,
  useCreateContract,
  useUpdateContract,
  usePeople,
  type ContractSummary,
} from "@/lib/api-hooks"

const TYPES = ["permanent", "fixed_term", "contractor", "intern"] as const
const TYPE_LABEL: Record<string, string> = {
  permanent: "Permanent",
  fixed_term: "Fixed-term",
  contractor: "Contractor",
  intern: "Intern",
}
const PERIOD_SUFFIX: Record<string, string> = { hourly: "/hr", monthly: "/mo", annual: "/yr" }

function initials(name: string | null): string {
  if (!name) return "?"
  const p = name.trim().split(/\s+/)
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "?"
}

function AlertBadge({ c }: { c: ContractSummary }) {
  if (c.status === "draft") return <Badge tone="draft">Draft</Badge>
  if (c.status === "terminated") return <Badge tone="draft">Terminated</Badge>
  if (c.status === "superseded") return <Badge tone="draft">Superseded</Badge>
  if (c.alert === "expired") return <Badge tone="bad">Expired</Badge>
  if (c.alert != null) return <Badge tone="warn">{c.expiresInDays}d left</Badge>
  return <Badge tone="ok">Active</Badge>
}

function Badge({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "bad" | "draft"
  children: React.ReactNode
}) {
  const map = {
    ok: ["rgba(48,209,88,0.9)", "rgba(48,209,88,0.12)", "rgba(48,209,88,0.26)"],
    warn: ["rgba(255,159,10,0.95)", "rgba(255,159,10,0.14)", "rgba(255,159,10,0.28)"],
    bad: ["rgba(255,69,58,0.9)", "rgba(255,69,58,0.14)", "rgba(255,69,58,0.3)"],
    draft: ["var(--prv-text-2)", "transparent", "var(--prv-border)"],
  } as const
  const [color, bg, border] = map[tone]
  return (
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        borderRadius: 100,
        padding: "3px 9px",
        color,
        background: bg,
        border: `1px solid ${border}`,
      }}
    >
      {children}
    </span>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" | "bad" }) {
  const color =
    tone === "bad"
      ? "rgba(255,69,58,0.9)"
      : tone === "warn"
        ? "rgba(255,159,10,0.95)"
        : "var(--prv-text-1)"
  return (
    <div
      style={{
        borderRadius: 18,
        padding: "14px 16px",
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--prv-text-3)",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 6, color }}>
        {value}
      </div>
    </div>
  )
}

function Row({
  c,
  onAction,
}: {
  c: ContractSummary
  onAction: (id: string, patch: Record<string, unknown>) => void
}) {
  const money =
    c.salaryAmount != null
      ? `${c.salaryCurrency === "RON" ? "" : c.salaryCurrency + " "}${c.salaryAmount.toLocaleString()}${PERIOD_SUFFIX[c.payPeriod] ?? ""}`
      : "—"
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "14px 16px",
        borderBottom: "1px solid var(--prv-border-subtle)",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: "var(--prv-g2)",
          display: "grid",
          placeItems: "center",
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
      >
        {initials(c.userName)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 640, letterSpacing: "-0.01em" }}>
          {c.userName ?? "—"} · {c.roleTitle}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--prv-text-3)",
            marginTop: 3,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "var(--prv-text-4)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 5,
              padding: "2px 6px",
            }}
          >
            {TYPE_LABEL[c.type]}
          </span>
          <span>{money}</span>
          <span>
            v{c.version}
            {c.signed ? " · signed" : ""}
          </span>
        </div>
        {c.status === "active" && c.alert === "expired" && (
          <div style={{ fontSize: 11, color: "rgba(255,69,58,0.9)", marginTop: 5 }}>
            Expired — renewal overdue
          </div>
        )}
        {c.status === "active" && typeof c.alert === "number" && (
          <div style={{ fontSize: 11, color: "rgba(255,159,10,0.95)", marginTop: 5 }}>
            Expires in {c.expiresInDays} days · {c.alert}-day alert
          </div>
        )}
      </div>
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
        }}
      >
        <AlertBadge c={c} />
        <div style={{ display: "flex", gap: 6 }}>
          {c.status === "draft" && (
            <Action label="Activate" onClick={() => onAction(c.id, { action: "activate" })} />
          )}
          {c.status === "active" && !c.signed && (
            <Action label="Sign" onClick={() => onAction(c.id, { action: "sign" })} />
          )}
          {c.status === "active" && (
            <Action label="Terminate" onClick={() => onAction(c.id, { action: "terminate" })} />
          )}
        </div>
      </div>
    </div>
  )
}

function Action({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "var(--prv-text-2)",
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border)",
        borderRadius: 100,
        padding: "4px 11px",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  )
}

export function ContractsClient() {
  const { data, isLoading } = useContracts()
  const { data: peopleData } = usePeople()
  const create = useCreateContract()
  const update = useUpdateContract()

  const contracts = data?.contracts ?? []
  const meta = data?.meta
  const people = peopleData?.members ?? []

  const [showForm, setShowForm] = useState(false)
  const [userId, setUserId] = useState("")
  const [type, setType] = useState<(typeof TYPES)[number]>("permanent")
  const [roleTitle, setRoleTitle] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [salary, setSalary] = useState("")

  function submit() {
    if (!userId || !roleTitle.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return
    create.mutate(
      {
        userId,
        type,
        status: "active",
        roleTitle: roleTitle.trim(),
        startDate,
        endDate: /^\d{4}-\d{2}-\d{2}$/.test(endDate) ? endDate : null,
        salaryAmount: salary.trim() ? Number(salary) : null,
      },
      {
        onSuccess: () => {
          setRoleTitle("")
          setStartDate("")
          setEndDate("")
          setSalary("")
          setShowForm(false)
        },
      }
    )
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "8px 4px 60px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--prv-text-3)",
            }}
          >
            People · HR
          </div>
          <h1
            style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-0.02em", margin: "3px 0 0" }}
          >
            Employment Contracts
          </h1>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            padding: "9px 16px",
            borderRadius: 100,
            background: showForm ? "var(--prv-g2)" : "rgba(255,255,255,0.92)",
            color: showForm ? "var(--prv-text-1)" : "#000",
            border: showForm ? "1px solid var(--prv-border)" : "none",
            fontSize: 13,
            fontWeight: 640,
            cursor: "pointer",
          }}
        >
          {showForm ? "Cancel" : "＋ New contract"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          margin: "20px 0 22px",
        }}
      >
        <Stat label="Total" value={meta?.total ?? 0} />
        <Stat label="Active" value={meta?.active ?? 0} />
        <Stat
          label="Expiring ≤60d"
          value={meta?.expiringSoon ?? 0}
          tone={meta?.expiringSoon ? "warn" : undefined}
        />
        <Stat label="Expired" value={meta?.expired ?? 0} tone={meta?.expired ? "bad" : undefined} />
      </div>

      {showForm && (
        <div
          style={{
            borderRadius: 20,
            padding: 16,
            marginBottom: 22,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <Field label="Employee">
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              style={{ ...inp, minWidth: 150 }}
            >
              <option value="">Select…</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
              style={inp}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Role">
            <input
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g. Carpenter"
              style={{ ...inp, minWidth: 140 }}
            />
          </Field>
          <Field label="Start">
            <input
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="YYYY-MM-DD"
              style={{ ...inp, width: 122 }}
            />
          </Field>
          <Field label="End (if fixed)">
            <input
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="optional"
              style={{ ...inp, width: 122 }}
            />
          </Field>
          <Field label="Salary /mo">
            <input
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="optional"
              style={{ ...inp, width: 100 }}
            />
          </Field>
          <button
            onClick={submit}
            disabled={create.isPending}
            style={{
              padding: "9px 18px",
              borderRadius: 100,
              background: "rgba(255,255,255,0.92)",
              color: "#000",
              border: "none",
              fontSize: 13,
              fontWeight: 640,
              cursor: "pointer",
              opacity: create.isPending ? 0.5 : 1,
            }}
          >
            Issue
          </button>
        </div>
      )}

      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--prv-text-3)",
          margin: "0 4px 12px",
        }}
      >
        Register · expiring first
      </div>
      <div
        style={{
          borderRadius: 22,
          overflow: "hidden",
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
        }}
      >
        {isLoading ? (
          <p style={{ padding: "40px 20px", textAlign: "center", color: "var(--prv-text-4)" }}>
            Loading contracts…
          </p>
        ) : contracts.length === 0 ? (
          <p
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--prv-text-4)",
              fontSize: 14,
            }}
          >
            No contracts yet. Use “New contract” to issue the first one.
          </p>
        ) : (
          contracts.map((c) => (
            <Row key={c.id} c={c} onAction={(id, patch) => update.mutate({ id, patch })} />
          ))
        )}
      </div>
    </div>
  )
}

const inp: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  color: "var(--prv-text-1)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--prv-text-3)",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}
