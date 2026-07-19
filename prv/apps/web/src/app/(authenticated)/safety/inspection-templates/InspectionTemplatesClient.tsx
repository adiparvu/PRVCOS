"use client"

import { useCallback, useEffect, useState } from "react"
import { useToast } from "@prv/ui"
import type { InspectionTemplateDto } from "@/app/api/safety/inspection-templates/route"

type DraftItem = { label: string; weight: string; critical: boolean; requirePhoto: boolean }

const card: React.CSSProperties = {
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  borderRadius: 18,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
}
const input: React.CSSProperties = {
  boxSizing: "border-box",
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

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...input,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: on ? "rgba(10,132,255,0.15)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${on ? "rgba(10,132,255,0.4)" : "var(--prv-border)"}`,
        color: on ? "rgba(126,184,255,0.95)" : "var(--prv-text-3)",
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {on ? "✓ " : ""}
      {children}
    </button>
  )
}

export function InspectionTemplatesClient() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<InspectionTemplateDto[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [items, setItems] = useState<DraftItem[]>([
    { label: "", weight: "1", critical: false, requirePhoto: false },
  ])

  const load = useCallback(() => {
    return fetch("/api/safety/inspection-templates")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { templates: InspectionTemplateDto[] }) => setTemplates(d.templates))
      .catch(() => setTemplates([]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const validItems = items.filter((i) => i.label.trim().length > 0)
  const canCreate = name.trim().length > 0 && validItems.length > 0 && !busy

  const reset = () => {
    setName("")
    setDescription("")
    setItems([{ label: "", weight: "1", critical: false, requirePhoto: false }])
    setShowForm(false)
  }

  const create = () => {
    if (!canCreate) return
    setBusy(true)
    fetch("/api/safety/inspection-templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || undefined,
        items: validItems.map((i) => ({
          label: i.label.trim(),
          weight: Math.max(1, parseInt(i.weight, 10) || 1),
          critical: i.critical,
          requirePhoto: i.requirePhoto,
        })),
      }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(j.error ?? "Create failed")
        }
        reset()
        await load()
        toast.success("Checklist creat")
      })
      .catch((e) => toast.error("Nu s-a putut crea", e instanceof Error ? e.message : undefined))
      .finally(() => setBusy(false))
  }

  const remove = (t: InspectionTemplateDto) => {
    if (!window.confirm(`Ștergi checklist-ul „${t.name}'?`)) return
    setBusy(true)
    fetch(`/api/safety/inspection-templates/${t.id}`, { method: "DELETE" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Delete failed")
        await load()
        toast.success("Checklist șters")
      })
      .catch(() => toast.error("Nu s-a putut șterge"))
      .finally(() => setBusy(false))
  }

  const setItem = (i: number, patch: Partial<DraftItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 24px 80px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>
            Checklist-uri inspecție
          </h1>
          <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
            Șabloane de verificare ponderate, aplicabile la execuția inspecțiilor
          </div>
        </div>
        <button
          type="button"
          onClick={() => (showForm ? reset() : setShowForm(true))}
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
          {showForm ? "Anulează" : "＋ Checklist nou"}
        </button>
      </div>

      {showForm && (
        <div style={{ ...card, padding: 20, marginTop: 20, display: "grid", gap: 14 }}>
          <div>
            <span style={label}>Nume</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ ...input, width: "100%" }}
              placeholder="Inspecție șantier — săptămânală"
            />
          </div>
          <div>
            <span style={label}>Descriere (opțional)</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ ...input, width: "100%" }}
            />
          </div>
          <div>
            <span style={label}>Puncte de verificare</span>
            <div style={{ display: "grid", gap: 8 }}>
              {items.map((it, i) => (
                <div
                  key={i}
                  style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
                >
                  <input
                    value={it.label}
                    onChange={(e) => setItem(i, { label: e.target.value })}
                    style={{ ...input, flex: "1 1 200px" }}
                    placeholder={`Punct ${i + 1}`}
                  />
                  <input
                    value={it.weight}
                    onChange={(e) => setItem(i, { weight: e.target.value })}
                    style={{ ...input, width: 64 }}
                    placeholder="pond"
                    inputMode="numeric"
                    title="Pondere"
                  />
                  <Toggle on={it.critical} onClick={() => setItem(i, { critical: !it.critical })}>
                    Critic
                  </Toggle>
                  <Toggle
                    on={it.requirePhoto}
                    onClick={() => setItem(i, { requirePhoto: !it.requirePhoto })}
                  >
                    Foto
                  </Toggle>
                  <button
                    type="button"
                    onClick={() =>
                      setItems((prev) =>
                        prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev
                      )
                    }
                    style={{
                      ...input,
                      cursor: "pointer",
                      padding: "0 10px",
                      color: "rgba(255,69,58,0.9)",
                      fontWeight: 700,
                    }}
                    title="Elimină"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setItems((prev) => [
                  ...prev,
                  { label: "", weight: "1", critical: false, requirePhoto: false },
                ])
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
              ＋ Adaugă punct
            </button>
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
            Salvează checklist-ul ({validItems.length} puncte)
          </button>
        </div>
      )}

      <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
        {templates === null ? (
          <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Se încarcă…</div>
        ) : templates.length === 0 ? (
          <div style={{ ...card, padding: 24, color: "var(--prv-text-3)", fontSize: 14 }}>
            Niciun checklist. Creează unul și aplică-l apoi la execuția unei inspecții.
          </div>
        ) : (
          templates.map((t) => (
            <div key={t.id} style={{ ...card, padding: "16px 18px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 640 }}>{t.name}</div>
                  {t.description && (
                    <div style={{ fontSize: 12.5, color: "var(--prv-text-3)", marginTop: 3 }}>
                      {t.description}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "var(--prv-text-3)", marginTop: 6 }}>
                    {t.itemCount} puncte · {t.items.filter((i) => i.critical).length} critice
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(t)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255,69,58,0.9)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  Șterge
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
