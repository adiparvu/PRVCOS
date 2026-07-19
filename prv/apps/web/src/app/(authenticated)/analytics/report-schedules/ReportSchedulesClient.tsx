"use client"

import { useCallback, useEffect, useState } from "react"
import { useToast } from "@prv/ui"
import type { ReportScheduleDto } from "@/app/api/intelligence/report-schedules/route"
import {
  frequencyLabel,
  parseRecipients,
  REPORT_FREQUENCIES,
  type ReportFrequency,
} from "@/lib/report-schedule"

const green = "rgba(48,209,88,0.95)"
const red = "rgba(255,69,58,0.95)"

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleString("ro-RO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
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

export function ReportSchedulesClient() {
  const { toast } = useToast()
  const [schedules, setSchedules] = useState<ReportScheduleDto[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [name, setName] = useState("")
  const [frequency, setFrequency] = useState<ReportFrequency>("weekly")
  const [hour, setHour] = useState(7)
  const [recipientsRaw, setRecipientsRaw] = useState("")

  const load = useCallback(() => {
    return fetch("/api/intelligence/report-schedules")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { schedules: ReportScheduleDto[] }) => setSchedules(d.schedules))
      .catch(() => setSchedules([]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const parsed = parseRecipients(recipientsRaw)
  const canCreate = name.trim().length > 0 && parsed.valid.length > 0 && !busy

  const create = () => {
    if (!canCreate) return
    setBusy(true)
    fetch("/api/intelligence/report-schedules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        frequency,
        sendHourUtc: hour,
        recipients: parsed.valid,
      }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(j.error ?? "Create failed")
        }
        setName("")
        setRecipientsRaw("")
        setShowForm(false)
        await load()
        toast.success("Program creat")
      })
      .catch((e) => toast.error("Nu s-a putut crea", e instanceof Error ? e.message : undefined))
      .finally(() => setBusy(false))
  }

  const toggle = (s: ReportScheduleDto) => {
    setBusy(true)
    fetch(`/api/intelligence/report-schedules/${s.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: !s.enabled }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Toggle failed")
        await load()
      })
      .catch(() => toast.error("Nu s-a putut actualiza"))
      .finally(() => setBusy(false))
  }

  const runNow = (s: ReportScheduleDto) => {
    setBusy(true)
    fetch(`/api/intelligence/report-schedules/${s.id}/run-now`, { method: "POST" })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(j.error ?? "Send failed")
        }
        const j = (await r.json()) as { recipients: number }
        await load()
        toast.success(`Trimis către ${j.recipients} destinatari`)
      })
      .catch((e) => toast.error("Nu s-a putut trimite", e instanceof Error ? e.message : undefined))
      .finally(() => setBusy(false))
  }

  const remove = (s: ReportScheduleDto) => {
    if (!window.confirm(`Ștergi programul „${s.name}'?`)) return
    setBusy(true)
    fetch(`/api/intelligence/report-schedules/${s.id}`, { method: "DELETE" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Delete failed")
        await load()
        toast.success("Program șters")
      })
      .catch(() => toast.error("Nu s-a putut șterge"))
      .finally(() => setBusy(false))
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "36px 24px 80px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>
            Rapoarte programate
          </h1>
          <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
            Livrare recurentă pe email a raportului KPI al companiei
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
          {showForm ? "Anulează" : "＋ Program nou"}
        </button>
      </div>

      {showForm && (
        <div style={{ ...card, padding: 20, marginTop: 20, display: "grid", gap: 14 }}>
          <div>
            <span style={labelStyle}>Nume</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Raport săptămânal conducere"
              style={inputStyle}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <span style={labelStyle}>Frecvență</span>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as ReportFrequency)}
                style={inputStyle}
              >
                {REPORT_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {frequencyLabel(f)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span style={labelStyle}>Oră (UTC)</span>
              <select
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                style={inputStyle}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <span style={labelStyle}>Destinatari (email, separate prin virgulă)</span>
            <textarea
              value={recipientsRaw}
              onChange={(e) => setRecipientsRaw(e.target.value)}
              placeholder="ceo@firma.ro, cfo@firma.ro"
              style={{ ...inputStyle, minHeight: 64, resize: "vertical" }}
            />
            <div style={{ fontSize: 11.5, color: "var(--prv-text-3)", marginTop: 5 }}>
              {parsed.valid.length} valide
              {parsed.invalid.length > 0 && (
                <span style={{ color: red }}> · {parsed.invalid.length} invalide</span>
              )}
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
            Creează programul
          </button>
        </div>
      )}

      <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
        {schedules === null ? (
          <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Se încarcă…</div>
        ) : schedules.length === 0 ? (
          <div style={{ ...card, padding: 24, color: "var(--prv-text-3)", fontSize: 14 }}>
            Niciun raport programat. Creează unul pentru a trimite automat KPI-urile companiei.
          </div>
        ) : (
          schedules.map((s) => (
            <div key={s.id} style={{ ...card, padding: "16px 18px" }}>
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
                    <span style={{ fontSize: 16, fontWeight: 640 }}>{s.name}</span>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: "2px 9px",
                        borderRadius: 100,
                        background: s.enabled ? "rgba(48,209,88,0.13)" : "rgba(255,255,255,0.07)",
                        color: s.enabled ? green : "var(--prv-text-3)",
                      }}
                    >
                      {s.enabled ? "Activ" : "Oprit"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--prv-text-3)", marginTop: 5 }}>
                    {frequencyLabel(s.frequency)} · {String(s.sendHourUtc).padStart(2, "0")}:00 UTC
                    · {s.recipients.length} destinatari
                  </div>
                  <div style={{ fontSize: 12, color: "var(--prv-text-3)", marginTop: 3 }}>
                    Următorul: {fmtDateTime(s.nextRunAt)}
                    {s.lastRunAt && (
                      <>
                        {" · "}Ultimul: {fmtDateTime(s.lastRunAt)}
                        {s.lastStatus === "error" ? (
                          <span style={{ color: red }}> (eroare)</span>
                        ) : s.lastStatus === "ok" ? (
                          <span style={{ color: green }}> ✓</span>
                        ) : null}
                      </>
                    )}
                  </div>
                  {s.lastStatus === "error" && s.lastError && (
                    <div style={{ fontSize: 11.5, color: red, marginTop: 3 }}>{s.lastError}</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 14, flexShrink: 0, alignItems: "center" }}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => runNow(s)}
                    style={actionBtn("rgba(10,132,255,0.9)")}
                  >
                    Trimite acum
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggle(s)}
                    style={actionBtn("var(--prv-text-2)")}
                  >
                    {s.enabled ? "Oprește" : "Pornește"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove(s)}
                    style={actionBtn(red)}
                  >
                    Șterge
                  </button>
                </div>
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
