"use client"

import { useCallback, useEffect, useState } from "react"
import { useToast } from "@prv/ui"
import type { EscalationPolicyDto } from "@/app/api/notifications/escalation-policies/route"

const red = "rgba(255,69,58,0.95)"
const green = "rgba(48,209,88,0.95)"

// Curated scope options. `null` (Toate) applies to every action_required
// notification; the rest match a notification's stored entityType exactly.
const ENTITY_OPTIONS: { value: string | null; label: string }[] = [
  { value: null, label: "Toate cererile de acțiune" },
  { value: "safety_permit", label: "Permise de lucru (PTW)" },
  { value: "approval", label: "Aprobări" },
  { value: "expense", label: "Cheltuieli" },
  { value: "purchase_order", label: "Comenzi de achiziție" },
  { value: "document", label: "Documente" },
  { value: "incident", label: "Incidente" },
  { value: "task", label: "Sarcini" },
]

// SLA presets in minutes, with human labels.
const SLA_PRESETS: { value: number; label: string }[] = [
  { value: 15, label: "15 minute" },
  { value: 30, label: "30 minute" },
  { value: 60, label: "1 oră" },
  { value: 120, label: "2 ore" },
  { value: 240, label: "4 ore" },
  { value: 480, label: "8 ore" },
  { value: 1440, label: "24 ore" },
  { value: 2880, label: "48 ore" },
]

interface Member {
  id: string
  fullName: string
  jobTitle: string | null
}

function slaLabel(min: number): string {
  const preset = SLA_PRESETS.find((p) => p.value === min)
  if (preset) return preset.label
  if (min < 60) return `${min} min`
  if (min % 60 === 0) return `${min / 60} h`
  return `${Math.floor(min / 60)} h ${min % 60} min`
}

function entityLabel(v: string | null): string {
  return ENTITY_OPTIONS.find((o) => o.value === v)?.label ?? v ?? "Toate"
}

const card: React.CSSProperties = {
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  borderRadius: 18,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--prv-border)",
  borderRadius: 11,
  padding: 11,
  color: "var(--prv-text-1)",
  fontSize: 14,
  fontFamily: "inherit",
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--prv-text-3)",
  fontWeight: 600,
  display: "block",
  marginBottom: 6,
}

export function EscalationPoliciesClient({ canManage }: { canManage: boolean }) {
  const { toast } = useToast()
  const [policies, setPolicies] = useState<EscalationPolicyDto[] | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [name, setName] = useState("")
  const [entityType, setEntityType] = useState<string | null>(null)
  const [slaMinutes, setSlaMinutes] = useState(60)
  const [escalateToUserId, setEscalateToUserId] = useState("")

  const load = useCallback(() => {
    return fetch("/api/notifications/escalation-policies")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { policies: EscalationPolicyDto[] }) => setPolicies(d.policies))
      .catch(() => setPolicies([]))
  }, [])

  useEffect(() => {
    load()
    fetch("/api/people?limit=200")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("members"))))
      .then((d: { members: Member[] }) => setMembers(d.members))
      .catch(() => setMembers([]))
  }, [load])

  const canCreate = name.trim().length > 0 && escalateToUserId.length > 0 && !busy

  const create = () => {
    if (!canCreate) return
    setBusy(true)
    fetch("/api/notifications/escalation-policies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim(), entityType, slaMinutes, escalateToUserId }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(j.error ?? "Create failed")
        }
        setName("")
        setEscalateToUserId("")
        setEntityType(null)
        setSlaMinutes(60)
        setShowForm(false)
        await load()
        toast.success("Politică creată")
      })
      .catch((e) => toast.error("Nu s-a putut crea", e instanceof Error ? e.message : undefined))
      .finally(() => setBusy(false))
  }

  const toggle = (p: EscalationPolicyDto) => {
    setBusy(true)
    fetch(`/api/notifications/escalation-policies/${p.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Toggle failed")
        await load()
      })
      .catch(() => toast.error("Nu s-a putut actualiza"))
      .finally(() => setBusy(false))
  }

  const remove = (p: EscalationPolicyDto) => {
    if (!window.confirm(`Ștergi politica „${p.name}'?`)) return
    setBusy(true)
    fetch(`/api/notifications/escalation-policies/${p.id}`, { method: "DELETE" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Delete failed")
        await load()
        toast.success("Politică ștearsă")
      })
      .catch(() => toast.error("Nu s-a putut șterge"))
      .finally(() => setBusy(false))
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "36px 24px 80px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>
            Escaladare notificări
          </h1>
          <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6, maxWidth: 560 }}>
            O cerere de acțiune care rămâne necitită și neînchisă peste termenul de mai jos este
            escaladată automat — o dată — către persoana desemnată.
          </div>
        </div>
        {canManage && (
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
              flexShrink: 0,
            }}
          >
            {showForm ? "Anulează" : "＋ Politică nouă"}
          </button>
        )}
      </div>

      {showForm && canManage && (
        <div style={{ ...card, padding: 20, marginTop: 20, display: "grid", gap: 14 }}>
          <div>
            <span style={labelStyle}>Nume</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Escaladare permise de lucru"
              style={inputStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>Se aplică la</span>
            <select
              value={entityType ?? ""}
              onChange={(e) => setEntityType(e.target.value === "" ? null : e.target.value)}
              style={inputStyle}
            >
              {ENTITY_OPTIONS.map((o) => (
                <option key={o.value ?? "all"} value={o.value ?? ""}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <span style={labelStyle}>Termen (SLA)</span>
              <select
                value={slaMinutes}
                onChange={(e) => setSlaMinutes(Number(e.target.value))}
                style={inputStyle}
              >
                {SLA_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span style={labelStyle}>Escaladează către</span>
              <select
                value={escalateToUserId}
                onChange={(e) => setEscalateToUserId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Alege o persoană…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                    {m.jobTitle ? ` · ${m.jobTitle}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
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
            Creează politica
          </button>
        </div>
      )}

      <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
        {policies === null ? (
          <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Se încarcă…</div>
        ) : policies.length === 0 ? (
          <div style={{ ...card, padding: 24, color: "var(--prv-text-3)", fontSize: 14 }}>
            Nicio politică de escaladare.{" "}
            {canManage ? "Creează una" : "Un administrator poate crea una"} pentru ca cererile de
            acțiune ignorate să ajungă la un responsabil.
          </div>
        ) : (
          policies.map((p) => (
            <div key={p.id} style={{ ...card, padding: "16px 18px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 16, fontWeight: 640 }}>{p.name}</span>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: "2px 9px",
                        borderRadius: 100,
                        background: p.isActive ? "rgba(48,209,88,0.13)" : "rgba(255,255,255,0.07)",
                        color: p.isActive ? green : "var(--prv-text-3)",
                      }}
                    >
                      {p.isActive ? "Activ" : "Oprit"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--prv-text-3)", marginTop: 5 }}>
                    {entityLabel(p.entityType)} · după {slaLabel(p.slaMinutes)} →{" "}
                    <span style={{ color: "var(--prv-text-2)" }}>
                      {p.escalateToName ?? "(utilizator șters)"}
                    </span>
                  </div>
                </div>
                {canManage && (
                  <div style={{ display: "flex", gap: 14, flexShrink: 0, alignItems: "center" }}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => toggle(p)}
                      style={actionBtn("var(--prv-text-2)")}
                    >
                      {p.isActive ? "Oprește" : "Pornește"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(p)}
                      style={actionBtn(red)}
                    >
                      Șterge
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function actionBtn(color: string): React.CSSProperties {
  return {
    background: "none",
    border: "none",
    color,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
  }
}
