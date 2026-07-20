"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useToast } from "@prv/ui"
import type { PermitSummary, PermitsMeta } from "@/app/api/safety/permits/route"
import { PERMIT_TYPES, requiredFieldsForType, type PermitStatus, type PermitType } from "@/lib/ptw"

const TYPE_LABEL: Record<PermitType, string> = {
  hot_work: "Lucru la cald",
  confined_space: "Spațiu închis",
  working_at_height: "Lucru la înălțime",
  electrical: "Electric",
  excavation: "Săpături",
}
const STATUS_META: Record<PermitStatus, { label: string; color: string; bg: string }> = {
  draft: { label: "Ciornă", color: "var(--prv-text-3)", bg: "rgba(255,255,255,0.06)" },
  pending_supervisor: {
    label: "Așteaptă supervizor",
    color: "rgba(255,159,10,0.95)",
    bg: "rgba(255,159,10,0.13)",
  },
  pending_safety_officer: {
    label: "Așteaptă PSI/SSM",
    color: "rgba(255,159,10,0.95)",
    bg: "rgba(255,159,10,0.13)",
  },
  approved: { label: "Aprobat", color: "rgba(10,132,255,0.95)", bg: "rgba(10,132,255,0.13)" },
  active: { label: "Activ", color: "rgba(48,209,88,0.95)", bg: "rgba(48,209,88,0.14)" },
  closed: { label: "Închis", color: "var(--prv-text-3)", bg: "rgba(255,255,255,0.06)" },
  rejected: { label: "Respins", color: "rgba(255,69,58,0.95)", bg: "rgba(255,69,58,0.14)" },
  expired: { label: "Expirat", color: "rgba(255,69,58,0.95)", bg: "rgba(255,69,58,0.14)" },
  suspended: { label: "Suspendat", color: "rgba(255,159,10,0.95)", bg: "rgba(255,159,10,0.13)" },
  revoked: { label: "Revocat", color: "rgba(255,69,58,0.95)", bg: "rgba(255,69,58,0.14)" },
}

const card: React.CSSProperties = {
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  borderRadius: 18,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
}
const input: React.CSSProperties = {
  boxSizing: "border-box",
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--prv-border)",
  borderRadius: 10,
  padding: "9px 10px",
  color: "var(--prv-text-1)",
  fontSize: 13.5,
  fontFamily: "inherit",
}
const label: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--prv-text-3)",
  fontWeight: 600,
  display: "block",
  marginBottom: 6,
}

function StatusBadge({ status }: { status: PermitStatus }) {
  const m = STATUS_META[status]
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        padding: "2px 9px",
        borderRadius: 100,
        background: m.bg,
        color: m.color,
        whiteSpace: "nowrap",
      }}
    >
      {m.label}
    </span>
  )
}

type RiskRow = { hazard: string; control: string; residualRisk: "low" | "medium" | "high" }

export function PermitsListClient() {
  const { toast } = useToast()
  const [permits, setPermits] = useState<PermitSummary[] | null>(null)
  const [meta, setMeta] = useState<PermitsMeta | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // create form state
  const [type, setType] = useState<PermitType>("hot_work")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [validFrom, setValidFrom] = useState("")
  const [validTo, setValidTo] = useState("")
  const [supervisorId, setSupervisorId] = useState("")
  const [safetyOfficerId, setSafetyOfficerId] = useState("")
  const [risks, setRisks] = useState<RiskRow[]>([{ hazard: "", control: "", residualRisk: "low" }])
  const [ppe, setPpe] = useState("")
  const [details, setDetails] = useState<Record<string, string>>({})
  const [designated, setDesignated] = useState<
    { userId: string; userName: string | null; role: string }[] | null
  >(null)
  const supervisors = (designated ?? []).filter((d) => d.role === "supervisor")
  const safetyOfficers = (designated ?? []).filter((d) => d.role === "safety_officer")

  const load = useCallback(() => {
    const qs = statusFilter ? `?status=${statusFilter}` : ""
    return fetch(`/api/safety/permits${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { permits: PermitSummary[]; meta: PermitsMeta }) => {
        setPermits(d.permits)
        setMeta(d.meta)
      })
      .catch(() => setPermits([]))
  }, [statusFilter])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (showForm && designated === null) {
      fetch("/api/safety/permit-designations")
        .then((r) => r.json())
        .then((d: { designations?: { userId: string; userName: string | null; role: string }[] }) =>
          setDesignated(d.designations ?? [])
        )
        .catch(() => setDesignated([]))
    }
  }, [showForm, designated])

  const reqFields = requiredFieldsForType(type)
  const validRisks = risks.filter((r) => r.hazard.trim() && r.control.trim())
  const canCreate = title.trim() && description.trim() && validFrom && validTo && !busy

  const create = () => {
    if (!canCreate) return
    setBusy(true)
    const typeDetails: Record<string, string> = {}
    for (const f of reqFields) if (details[f]?.trim()) typeDetails[f] = details[f].trim()
    fetch("/api/safety/permits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type,
        title: title.trim(),
        description: description.trim(),
        location: location.trim() || undefined,
        supervisorId: supervisorId || undefined,
        safetyOfficerId: safetyOfficerId || undefined,
        validFrom: new Date(validFrom).toISOString(),
        validTo: new Date(validTo).toISOString(),
        riskAssessment: validRisks,
        ppe: ppe
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        typeDetails,
      }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(j.error ?? "Create failed")
        }
        setShowForm(false)
        setTitle("")
        setDescription("")
        setLocation("")
        setRisks([{ hazard: "", control: "", residualRisk: "low" }])
        setPpe("")
        setDetails({})
        await load()
        toast.success("Permis creat (ciornă)")
      })
      .catch((e) => toast.error("Nu s-a putut crea", e instanceof Error ? e.message : undefined))
      .finally(() => setBusy(false))
  }

  const setRisk = (i: number, patch: Partial<RiskRow>) =>
    setRisks((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 24px 80px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link
              href="/safety"
              style={{ color: "rgba(10,132,255,0.9)", fontSize: 13, textDecoration: "none" }}
            >
              ← Safety
            </Link>
          </div>
          <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em", marginTop: 6 }}>
            Permise de lucru
          </h1>
          <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 4 }}>
            Permit-to-Work — cerere, evaluare de risc, aprobare în două trepte, activare, închidere
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          style={{
            background: showForm ? "rgba(255,255,255,0.06)" : "#fff",
            color: showForm ? "var(--prv-text-2)" : "#000",
            border: showForm ? "1px solid var(--prv-border)" : "none",
            borderRadius: 12,
            padding: "10px 16px",
            fontSize: 13.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {showForm ? "Anulează" : "＋ Permis nou"}
        </button>
      </div>

      {/* KPI */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, margin: "22px 0" }}
      >
        {[
          { k: "Total", v: meta?.total ?? 0 },
          { k: "Active", v: meta?.active ?? 0 },
          { k: "În aprobare", v: meta?.pendingApproval ?? 0 },
          { k: "Expiră curând", v: meta?.expiringSoon ?? 0 },
        ].map((t) => (
          <div key={t.k} style={{ ...card, padding: "14px 16px" }}>
            <div style={{ fontSize: 24, fontWeight: 680, letterSpacing: "-0.02em" }}>{t.v}</div>
            <div style={{ fontSize: 11.5, color: "var(--prv-text-3)", marginTop: 3 }}>{t.k}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{ ...card, padding: 20, marginBottom: 22, display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <span style={label}>Tip permis</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PermitType)}
                style={input}
              >
                {PERMIT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span style={label}>Locație</span>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={input}
                placeholder="Zona / nivel"
              />
            </div>
          </div>
          <div>
            <span style={label}>Titlu</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={input}
              placeholder="Sudură structură etaj 3"
            />
          </div>
          <div>
            <span style={label}>Descriere lucrare</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ ...input, minHeight: 60, resize: "vertical" }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <span style={label}>Valabil de la</span>
              <input
                type="datetime-local"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                style={input}
              />
            </div>
            <div>
              <span style={label}>Valabil până la</span>
              <input
                type="datetime-local"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                style={input}
              />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <span style={label}>Supervizor (aprobare 1)</span>
              <select
                value={supervisorId}
                onChange={(e) => setSupervisorId(e.target.value)}
                style={input}
              >
                <option value="">—</option>
                {supervisors.map((p) => (
                  <option key={p.userId} value={p.userId}>
                    {p.userName ?? p.userId}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span style={label}>Responsabil SSM/PSI (aprobare 2)</span>
              <select
                value={safetyOfficerId}
                onChange={(e) => setSafetyOfficerId(e.target.value)}
                style={input}
              >
                <option value="">—</option>
                {safetyOfficers.map((p) => (
                  <option key={p.userId} value={p.userId}>
                    {p.userName ?? p.userId}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {supervisors.length === 0 && safetyOfficers.length === 0 && designated !== null && (
            <div style={{ fontSize: 11.5, color: "var(--prv-text-3)", marginTop: -4 }}>
              Niciun aprobator desemnat.{" "}
              <Link href="/safety/permit-designations" style={{ color: "rgba(10,132,255,0.9)" }}>
                Gestionează desemnări
              </Link>
              .
            </div>
          )}
          <div>
            <span style={label}>Evaluare de risc</span>
            <div style={{ display: "grid", gap: 8 }}>
              {risks.map((r, i) => (
                <div
                  key={i}
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr 110px 32px", gap: 8 }}
                >
                  <input
                    value={r.hazard}
                    onChange={(e) => setRisk(i, { hazard: e.target.value })}
                    style={input}
                    placeholder="Pericol"
                  />
                  <input
                    value={r.control}
                    onChange={(e) => setRisk(i, { control: e.target.value })}
                    style={input}
                    placeholder="Măsură de control"
                  />
                  <select
                    value={r.residualRisk}
                    onChange={(e) =>
                      setRisk(i, { residualRisk: e.target.value as RiskRow["residualRisk"] })
                    }
                    style={input}
                  >
                    <option value="low">scăzut</option>
                    <option value="medium">mediu</option>
                    <option value="high">ridicat</option>
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      setRisks((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p))
                    }
                    style={{
                      ...input,
                      cursor: "pointer",
                      padding: 0,
                      color: "rgba(255,69,58,0.9)",
                      fontWeight: 700,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setRisks((p) => [...p, { hazard: "", control: "", residualRisk: "low" }])
              }
              style={{
                marginTop: 8,
                background: "none",
                border: "1px dashed var(--prv-border)",
                borderRadius: 10,
                padding: "8px 12px",
                color: "var(--prv-text-3)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ＋ Rând risc
            </button>
          </div>
          <div>
            <span style={label}>EIP (separate prin virgulă)</span>
            <input
              value={ppe}
              onChange={(e) => setPpe(e.target.value)}
              style={input}
              placeholder="cască, mănuși, vizieră"
            />
          </div>
          {reqFields.length > 0 && (
            <div>
              <span style={label}>Câmpuri obligatorii · {TYPE_LABEL[type]}</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {reqFields.map((f) => (
                  <input
                    key={f}
                    value={details[f] ?? ""}
                    onChange={(e) => setDetails((prev) => ({ ...prev, [f]: e.target.value }))}
                    style={input}
                    placeholder={f}
                  />
                ))}
              </div>
              <div style={{ fontSize: 11, color: "var(--prv-text-3)", marginTop: 6 }}>
                Obligatorii la trimiterea spre aprobare (verificate de sistem).
              </div>
            </div>
          )}
          <button
            type="button"
            disabled={!canCreate}
            onClick={create}
            style={{
              background: canCreate ? "#fff" : "rgba(255,255,255,0.07)",
              color: canCreate ? "#000" : "var(--prv-text-3)",
              border: "none",
              borderRadius: 11,
              padding: 12,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: canCreate ? "pointer" : "default",
            }}
          >
            Creează ciorna
          </button>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {[
          "",
          "pending_supervisor",
          "pending_safety_officer",
          "approved",
          "active",
          "suspended",
          "closed",
        ].map((s) => (
          <button
            key={s || "all"}
            type="button"
            onClick={() => setStatusFilter(s)}
            style={{
              padding: "6px 12px",
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              border: `1px solid ${statusFilter === s ? "transparent" : "var(--prv-border)"}`,
              background: statusFilter === s ? "rgba(255,255,255,0.9)" : "transparent",
              color: statusFilter === s ? "#000" : "var(--prv-text-3)",
            }}
          >
            {s === "" ? "Toate" : STATUS_META[s as PermitStatus].label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {permits === null ? (
          <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Se încarcă…</div>
        ) : permits.length === 0 ? (
          <div style={{ ...card, padding: 24, color: "var(--prv-text-3)", fontSize: 14 }}>
            Niciun permis.
          </div>
        ) : (
          permits.map((p) => (
            <Link
              key={p.id}
              href={`/safety/permits/${p.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  ...card,
                  padding: "14px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 640 }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: "var(--prv-text-3)", marginTop: 3 }}>
                    {TYPE_LABEL[p.type]}
                    {p.location ? ` · ${p.location}` : ""}
                    {p.requesterName ? ` · ${p.requesterName}` : ""}
                  </div>
                </div>
                <StatusBadge status={p.effectiveStatus} />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
