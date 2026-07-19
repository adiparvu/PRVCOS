"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useToast } from "@prv/ui"
import type { InspectionTemplateDto } from "@/app/api/safety/inspection-templates/route"
import { computeInspectionScore, type ChecklistResult } from "@/lib/inspection-checklist"

type Row = {
  label: string
  weight: number
  critical: boolean
  requirePhoto: boolean
  result: ChecklistResult
  note: string
  photoUrl: string
}

type SavedItem = {
  itemIndex: number
  label: string
  weight: number
  critical: boolean
  result: ChecklistResult
  note: string | null
  photoUrl: string | null
  correctiveTaskId: string | null
}

const card: React.CSSProperties = {
  margin: "12px 0 0",
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  borderRadius: 16,
  overflow: "hidden",
}
const RESULT_META: Record<ChecklistResult, { label: string; color: string; bg: string }> = {
  pass: { label: "OK", color: "rgba(48,209,88,0.95)", bg: "rgba(48,209,88,0.14)" },
  fail: { label: "Fail", color: "rgba(255,69,58,0.95)", bg: "rgba(255,69,58,0.14)" },
  na: { label: "N/A", color: "var(--prv-text-3)", bg: "rgba(255,255,255,0.06)" },
}

export function InspectionChecklist({
  inspectionId,
  onSubmitted,
}: {
  inspectionId: string
  onSubmitted: () => void
}) {
  const { toast } = useToast()
  const [saved, setSaved] = useState<SavedItem[] | null>(null)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [templates, setTemplates] = useState<InspectionTemplateDto[] | null>(null)
  const [busy, setBusy] = useState(false)

  const loadSaved = useCallback(() => {
    return fetch(`/api/safety/inspections/${inspectionId}/checklist`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { items: SavedItem[] }) => setSaved(d.items))
      .catch(() => setSaved([]))
  }, [inspectionId])

  useEffect(() => {
    loadSaved()
  }, [loadSaved])

  const openTemplatePicker = () => {
    if (templates === null) {
      fetch("/api/safety/inspection-templates")
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
        .then((d: { templates: InspectionTemplateDto[] }) => setTemplates(d.templates))
        .catch(() => setTemplates([]))
    }
  }

  const loadTemplate = (t: InspectionTemplateDto) => {
    setRows(
      t.items.map((i) => ({
        label: i.label,
        weight: i.weight,
        critical: i.critical,
        requirePhoto: i.requirePhoto,
        result: "na" as ChecklistResult,
        note: "",
        photoUrl: "",
      }))
    )
  }

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((prev) => (prev ? prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) : prev))

  const submit = () => {
    if (!rows || busy) return
    setBusy(true)
    fetch(`/api/safety/inspections/${inspectionId}/checklist`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: rows.map((r) => ({
          label: r.label,
          weight: r.weight,
          critical: r.critical,
          requirePhoto: r.requirePhoto,
          result: r.result,
          note: r.note.trim() || null,
          photoUrl: r.photoUrl.trim() || null,
        })),
      }),
    })
      .then(async (res) => {
        const j = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (j.items) throw new Error(`Foto lipsă: ${(j.items as string[]).join(", ")}`)
          throw new Error(j.error ?? "Submit failed")
        }
        setRows(null)
        await loadSaved()
        onSubmitted()
        toast.success(
          `Scor ${j.passRate}% · ${j.correctiveCreated} task-uri corective`.replace(
            " · 0 task-uri corective",
            ""
          )
        )
      })
      .catch((e) => toast.error("Nu s-a putut salva", e instanceof Error ? e.message : undefined))
      .finally(() => setBusy(false))
  }

  // ── Executed (read-only) view ──
  if (saved && saved.length > 0 && !rows) {
    const score = computeInspectionScore(
      saved.map((s) => ({ weight: s.weight, critical: s.critical, result: s.result }))
    )
    return (
      <div style={card}>
        <Header title={`Checklist · ${score.passRate}%`} right={`${score.failedItems} nereușite`} />
        {saved.map((s) => (
          <ItemRow
            key={s.itemIndex}
            label={s.label}
            critical={s.critical}
            result={s.result}
            note={s.note}
            corrective={!!s.correctiveTaskId}
          />
        ))}
      </div>
    )
  }

  // ── Editing view ──
  if (rows) {
    const preview = computeInspectionScore(
      rows.map((r) => ({ weight: r.weight, critical: r.critical, result: r.result }))
    )
    return (
      <div style={card}>
        <Header title="Execută checklist" right={`${preview.passRate}%`} />
        <div style={{ padding: "4px 0" }}>
          {rows.map((r, i) => (
            <div
              key={i}
              style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--prv-text-1)" }}>
                  {r.label}
                  {r.critical && (
                    <span style={{ color: "rgba(255,69,58,0.9)", marginLeft: 6, fontSize: 11 }}>
                      critic
                    </span>
                  )}
                </span>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {(["pass", "fail", "na"] as ChecklistResult[]).map((res) => {
                    const m = RESULT_META[res]
                    const on = r.result === res
                    return (
                      <button
                        key={res}
                        type="button"
                        onClick={() => setRow(i, { result: res })}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 8,
                          border: `1px solid ${on ? m.color : "var(--prv-border)"}`,
                          background: on ? m.bg : "transparent",
                          color: on ? m.color : "var(--prv-text-3)",
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {m.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              {r.result === "fail" && (
                <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                  <input
                    value={r.note}
                    onChange={(e) => setRow(i, { note: e.target.value })}
                    placeholder="Notă neconformitate"
                    style={inputStyle}
                  />
                  {r.requirePhoto && (
                    <input
                      value={r.photoUrl}
                      onChange={(e) => setRow(i, { photoUrl: e.target.value })}
                      placeholder="URL foto (obligatoriu)"
                      style={inputStyle}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, padding: "12px 16px" }}>
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            style={{
              flex: 1,
              background: "#fff",
              color: "#000",
              border: "none",
              borderRadius: 11,
              padding: 11,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "Se salvează…" : "Finalizează inspecția"}
          </button>
          <button
            type="button"
            onClick={() => setRows(null)}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--prv-border)",
              color: "var(--prv-text-2)",
              borderRadius: 11,
              padding: "11px 18px",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Renunță
          </button>
        </div>
      </div>
    )
  }

  // ── Empty: offer to load a template ──
  return (
    <div style={{ ...card, padding: 16 }}>
      <div
        style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.75)", marginBottom: 4 }}
      >
        Checklist
      </div>
      <div style={{ fontSize: 12.5, color: "var(--prv-text-3)", marginBottom: 12 }}>
        Încarcă un checklist pentru a evalua inspecția punct cu punct.
      </div>
      {templates === null ? (
        <button type="button" onClick={openTemplatePicker} style={loadBtn}>
          Alege un checklist
        </button>
      ) : templates.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--prv-text-3)" }}>
          Niciun checklist definit.{" "}
          <Link href="/safety/inspection-templates" style={{ color: "rgba(10,132,255,0.9)" }}>
            Creează unul
          </Link>
          .
        </div>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {templates.map((t) => (
            <button key={t.id} type="button" onClick={() => loadTemplate(t)} style={loadBtn}>
              {t.name}{" "}
              <span style={{ color: "var(--prv-text-3)", fontWeight: 500 }}>
                · {t.itemCount} puncte
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--prv-border)",
  borderRadius: 9,
  padding: "8px 10px",
  color: "var(--prv-text-1)",
  fontSize: 12.5,
  fontFamily: "inherit",
}
const loadBtn: React.CSSProperties = {
  textAlign: "left",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid var(--prv-border)",
  borderRadius: 10,
  padding: "10px 12px",
  color: "var(--prv-text-1)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
}

function Header({ title, right }: { title: string; right: string }) {
  return (
    <div
      style={{
        padding: "12px 16px 10px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        fontSize: 13,
        fontWeight: 700,
        color: "rgba(255,255,255,0.75)",
      }}
    >
      <span>{title}</span>
      <span style={{ fontSize: 12, color: "var(--prv-text-3)" }}>{right}</span>
    </div>
  )
}

function ItemRow({
  label,
  critical,
  result,
  note,
  corrective,
}: {
  label: string
  critical: boolean
  result: ChecklistResult
  note: string | null
  corrective: boolean
}) {
  const m = RESULT_META[result]
  return (
    <div style={{ padding: "11px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}
      >
        <span style={{ fontSize: 13, color: "var(--prv-text-1)" }}>
          {label}
          {critical && (
            <span style={{ color: "rgba(255,69,58,0.9)", marginLeft: 6, fontSize: 11 }}>
              critic
            </span>
          )}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 9px",
            borderRadius: 100,
            background: m.bg,
            color: m.color,
            flexShrink: 0,
          }}
        >
          {m.label}
        </span>
      </div>
      {note && <div style={{ fontSize: 12, color: "var(--prv-text-3)", marginTop: 3 }}>{note}</div>}
      {corrective && (
        <div style={{ fontSize: 11.5, color: "rgba(255,159,10,0.9)", marginTop: 3 }}>
          → task corectiv creat
        </div>
      )}
    </div>
  )
}
