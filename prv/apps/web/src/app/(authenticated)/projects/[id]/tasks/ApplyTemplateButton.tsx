"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useToast } from "@prv/ui"
import type { TaskTemplateDto } from "@/app/api/projects/task-templates/route"

// Header control: pick a saved task template and expand it into backlog tasks on
// this project. Templates are fetched lazily when the menu first opens.
export function ApplyTemplateButton({
  projectId,
  onApplied,
}: {
  projectId: string
  onApplied: () => void
}) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<TaskTemplateDto[] | null>(null)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    if (templates === null) {
      fetch("/api/projects/task-templates")
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
        .then((d: { templates: TaskTemplateDto[] }) => setTemplates(d.templates))
        .catch(() => setTemplates([]))
    }
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open, templates])

  const apply = (t: TaskTemplateDto) => {
    if (busy) return
    setBusy(true)
    fetch(`/api/projects/${projectId}/tasks/apply-template`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ templateId: t.id }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(j.error ?? "Apply failed")
        }
        const j = (await r.json()) as { created: number }
        setOpen(false)
        onApplied()
        toast.success(`${j.created} task-uri adăugate din „${t.name}'`)
      })
      .catch((e) => toast.error("Nu s-a putut aplica", e instanceof Error ? e.message : undefined))
      .finally(() => setBusy(false))
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: "7px 13px",
          borderRadius: 10,
          border: "1px solid var(--prv-border-subtle)",
          background: "var(--prv-g1)",
          color: "var(--prv-text-2)",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Din șablon ▾
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 40,
            minWidth: 240,
            maxHeight: 320,
            overflowY: "auto",
            background: "var(--prv-g2)",
            border: "1px solid var(--prv-border)",
            borderRadius: 14,
            boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
            padding: 6,
          }}
        >
          {templates === null ? (
            <div style={{ padding: 12, fontSize: 12.5, color: "var(--prv-text-3)" }}>
              Se încarcă…
            </div>
          ) : templates.length === 0 ? (
            <div
              style={{ padding: 12, fontSize: 12.5, color: "var(--prv-text-3)", lineHeight: 1.5 }}
            >
              Niciun șablon.{" "}
              <Link href="/projects/task-templates" style={{ color: "rgba(10,132,255,0.9)" }}>
                Creează unul
              </Link>
            </div>
          ) : (
            templates.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={busy}
                onClick={() => apply(t)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "9px 11px",
                  borderRadius: 9,
                  border: "none",
                  background: "transparent",
                  color: "var(--prv-text-1)",
                  fontSize: 13,
                  cursor: busy ? "default" : "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontWeight: 600 }}>{t.name}</span>
                <span style={{ color: "var(--prv-text-3)", marginLeft: 6, fontSize: 11.5 }}>
                  {t.itemCount} task-uri
                </span>
              </button>
            ))
          )}
          <div style={{ borderTop: "1px solid var(--prv-border-subtle)", margin: "6px 4px 4px" }} />
          <Link
            href="/projects/task-templates"
            style={{
              display: "block",
              padding: "8px 11px",
              fontSize: 12,
              color: "var(--prv-text-3)",
              textDecoration: "none",
            }}
          >
            Gestionează șabloane →
          </Link>
        </div>
      )}
    </div>
  )
}
