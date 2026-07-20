"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useToast } from "@prv/ui"
import type { CriticalRouteDto } from "@/app/api/notifications/critical-routes/route"
import { CRITICAL_TRIGGERS } from "@/lib/critical-alert-routing"

const red = "rgba(255,69,58,0.95)"
const green = "rgba(48,209,88,0.9)"

const GROUP_LABEL: Record<string, string> = {
  finance: "Finanțe",
  operations: "Operațiuni",
  security: "Securitate",
}

function triggerMeta(key: string) {
  return CRITICAL_TRIGGERS.find((t) => t.key === key)
}

interface Member {
  id: string
  fullName: string
  jobTitle: string | null
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
  background: "var(--prv-g1)",
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

export function CriticalRoutesClient({ canManage }: { canManage: boolean }) {
  const { toast } = useToast()
  const [routes, setRoutes] = useState<CriticalRouteDto[] | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [triggerKey, setTriggerKey] = useState(CRITICAL_TRIGGERS[0]?.key ?? "")
  const [routeToUserId, setRouteToUserId] = useState("")

  const load = useCallback(() => {
    return fetch("/api/notifications/critical-routes")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { routes: CriticalRouteDto[] }) => setRoutes(d.routes))
      .catch(() => setRoutes([]))
  }, [])

  useEffect(() => {
    load()
    fetch("/api/people?limit=200")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("members"))))
      .then((d: { members: Member[] }) => setMembers(d.members))
      .catch(() => setMembers([]))
  }, [load])

  const routedKeys = useMemo(() => new Set((routes ?? []).map((r) => r.triggerKey)), [routes])
  const canCreate = triggerKey.length > 0 && routeToUserId.length > 0 && !busy

  const save = () => {
    if (!canCreate) return
    setBusy(true)
    fetch("/api/notifications/critical-routes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ triggerKey, routeToUserId }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("save")
        setRouteToUserId("")
        setShowForm(false)
        await load()
        toast.success("Rută salvată")
      })
      .catch(() => toast.error("Nu s-a putut salva"))
      .finally(() => setBusy(false))
  }

  const toggle = (rt: CriticalRouteDto) => {
    setBusy(true)
    fetch(`/api/notifications/critical-routes/${rt.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: !rt.isActive }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("toggle")
        await load()
      })
      .catch(() => toast.error("Nu s-a putut actualiza"))
      .finally(() => setBusy(false))
  }

  const remove = (rt: CriticalRouteDto) => {
    const label = triggerMeta(rt.triggerKey)?.label ?? rt.triggerKey
    if (!window.confirm(`Ștergi ruta pentru „${label}'?`)) return
    setBusy(true)
    fetch(`/api/notifications/critical-routes/${rt.id}`, { method: "DELETE" })
      .then(async (r) => {
        if (!r.ok) throw new Error("delete")
        await load()
        toast.success("Rută ștearsă")
      })
      .catch(() => toast.error("Nu s-a putut șterge"))
      .finally(() => setBusy(false))
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "36px 24px 80px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>
            Rutare alerte critice
          </h1>
          <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6, maxWidth: 560 }}>
            Pentru fiecare eveniment critic la nivel de companie, alege exact cine primește alerta.
            Un trigger fără rută activă nu ridică nicio alertă.
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
            {showForm ? "Anulează" : "＋ Rută nouă"}
          </button>
        )}
      </div>

      {showForm && canManage && (
        <div style={{ ...card, padding: 20, marginTop: 20, display: "grid", gap: 14 }}>
          <div>
            <span style={labelStyle}>Trigger</span>
            <select
              value={triggerKey}
              onChange={(e) => setTriggerKey(e.target.value)}
              style={inputStyle}
            >
              {CRITICAL_TRIGGERS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label} · {GROUP_LABEL[t.group]}
                  {routedKeys.has(t.key) ? " (deja rutat — se înlocuiește)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span style={labelStyle}>Rutează către</span>
            <select
              value={routeToUserId}
              onChange={(e) => setRouteToUserId(e.target.value)}
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
          <button
            type="button"
            disabled={!canCreate}
            onClick={save}
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
            Salvează ruta
          </button>
        </div>
      )}

      <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
        {routes === null ? (
          <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Se încarcă…</div>
        ) : routes.length === 0 ? (
          <div style={{ ...card, padding: 24, color: "var(--prv-text-3)", fontSize: 14 }}>
            Nicio rută configurată. {canManage ? "Adaugă una" : "Un administrator poate adăuga una"}{" "}
            pentru ca alertele critice la nivel de companie să ajungă la un responsabil.
          </div>
        ) : (
          routes.map((rt) => {
            const meta = triggerMeta(rt.triggerKey)
            return (
              <div
                key={rt.id}
                style={{
                  ...card,
                  padding: "16px 18px",
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        padding: "2px 8px",
                        borderRadius: 100,
                        background: "var(--prv-g2)",
                        color: "var(--prv-text-2)",
                        border: "1px solid var(--prv-border)",
                      }}
                    >
                      {meta ? GROUP_LABEL[meta.group] : "—"}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 640 }}>
                      {meta?.label ?? rt.triggerKey}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--prv-text-3)", marginTop: 4 }}>
                    →{" "}
                    <span style={{ color: "var(--prv-text-2)" }}>
                      {rt.routeToName ?? "(utilizator șters)"}
                    </span>
                  </div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 14, alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: "2px 9px",
                      borderRadius: 100,
                      background: rt.isActive ? "rgba(48,209,88,0.13)" : "rgba(255,255,255,0.07)",
                      color: rt.isActive ? green : "var(--prv-text-3)",
                    }}
                  >
                    {rt.isActive ? "Activ" : "Oprit"}
                  </span>
                  {canManage && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => toggle(rt)}
                        style={linkBtn("var(--prv-text-2)")}
                      >
                        {rt.isActive ? "Oprește" : "Pornește"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => remove(rt)}
                        style={linkBtn(red)}
                      >
                        Șterge
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function linkBtn(color: string): React.CSSProperties {
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
