"use client"

import { useCallback, useEffect, useState } from "react"
import { useToast } from "@prv/ui"
import type { DocumentVersionEntry } from "@/app/api/documents/[id]/versions/route"

const g1 = "var(--prv-g1)"
const bds = "var(--prv-border-subtle)"
const t3 = "var(--prv-text-3)"
const blue = "rgba(10,132,255,0.9)"
const green = "rgba(48,209,88,0.95)"

function fmtDate(iso: string): string {
  const d = new Date(iso)
  const M = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`
}

export function DocumentVersionsCard({ id, onChanged }: { id: string; onChanged?: () => void }) {
  const { toast } = useToast()
  const [versions, setVersions] = useState<DocumentVersionEntry[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [fileUrl, setFileUrl] = useState("")
  const [fileName, setFileName] = useState("")
  const [note, setNote] = useState("")

  const load = useCallback(() => {
    return fetch(`/api/documents/${id}/versions`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { versions: DocumentVersionEntry[] }) => setVersions(d.versions))
      .catch(() => setVersions([]))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const submitNew = () => {
    if (!fileUrl.trim() || !fileName.trim() || busy) return
    setBusy(true)
    fetch(`/api/documents/${id}/versions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileUrl: fileUrl.trim(),
        fileName: fileName.trim(),
        changeNote: note.trim() || null,
      }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(j.error ?? "Upload failed")
        }
        setFileUrl("")
        setFileName("")
        setNote("")
        setShowForm(false)
        await load()
        onChanged?.()
        toast.success("Versiune nouă încărcată")
      })
      .catch((e) =>
        toast.error("Nu s-a putut încărca versiunea", e instanceof Error ? e.message : undefined)
      )
      .finally(() => setBusy(false))
  }

  const restore = (versionId: string, version: number) => {
    if (busy) return
    if (
      !window.confirm(
        `Restaurezi v${version}? Fișierul curent este păstrat ca versiune anterioară.`
      )
    )
      return
    setBusy(true)
    fetch(`/api/documents/${id}/versions/${versionId}/restore`, { method: "POST" })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(j.error ?? "Restore failed")
        }
        await load()
        onChanged?.()
        toast.success(`v${version} restaurată`)
      })
      .catch((e) =>
        toast.error("Nu s-a putut restaura", e instanceof Error ? e.message : undefined)
      )
      .finally(() => setBusy(false))
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: t3,
    fontWeight: 600,
    display: "block",
    marginBottom: 6,
  }
  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    padding: 10,
    color: "rgba(255,255,255,0.92)",
    fontSize: 13.5,
    fontFamily: "inherit",
  }

  return (
    <div
      style={{
        margin: "12px 0 0",
        background: g1,
        border: `1px solid ${bds}`,
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "0 0 auto",
          height: 1,
          background: "linear-gradient(90deg,transparent,var(--prv-border),transparent)",
        }}
      />
      <div
        style={{
          padding: "12px 16px 10px",
          fontSize: 13,
          fontWeight: 700,
          color: "rgba(255,255,255,0.75)",
          borderBottom: `1px solid rgba(255,255,255,0.06)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>Versiuni</span>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          style={{
            background: "none",
            border: "none",
            color: blue,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {showForm ? "Anulează" : "＋ Versiune nouă"}
        </button>
      </div>

      {showForm && (
        <div
          style={{
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div>
            <span style={labelStyle}>URL fișier</span>
            <input
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://storage.example.com/doc-v2.pdf"
              style={inputStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>Nume fișier</span>
            <input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="contract-v2.pdf"
              style={inputStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>Notă (opțional)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ce s-a schimbat"
              style={inputStyle}
            />
          </div>
          <button
            type="button"
            disabled={busy || !fileUrl.trim() || !fileName.trim()}
            onClick={submitNew}
            style={{
              background: fileUrl.trim() && fileName.trim() ? "#fff" : "rgba(255,255,255,0.07)",
              color: fileUrl.trim() && fileName.trim() ? "#000" : "rgba(255,255,255,0.4)",
              border: "none",
              borderRadius: 10,
              padding: 11,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: busy ? "default" : "pointer",
            }}
          >
            {busy ? "Se încarcă…" : "Încarcă versiunea"}
          </button>
        </div>
      )}

      {versions === null ? (
        <div style={{ padding: "16px", fontSize: 13, color: t3 }}>Se încarcă…</div>
      ) : (
        versions.map((v, i) => (
          <div
            key={v.id ?? "live"}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "12px 16px",
              borderBottom: i < versions.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "3px 8px",
                borderRadius: 8,
                marginTop: 1,
                flexShrink: 0,
                background: v.current ? "rgba(48,209,88,0.13)" : "rgba(255,255,255,0.07)",
                color: v.current ? green : "rgba(255,255,255,0.5)",
              }}
            >
              v{v.version}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "var(--prv-text-1)",
                  margin: 0,
                  wordBreak: "break-word",
                }}
              >
                {v.fileName}
              </p>
              <p style={{ fontSize: 11.5, color: t3, margin: "2px 0 0" }}>
                {v.uploadedBy ? `${v.uploadedBy} · ` : ""}
                {fmtDate(v.createdAt)} · {v.sizeLabel}
              </p>
              {v.changeNote && (
                <p style={{ fontSize: 12, color: "var(--prv-text-2)", margin: "3px 0 0" }}>
                  {v.changeNote}
                </p>
              )}
            </div>
            {v.current ? (
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 100,
                  background: "rgba(48,209,88,0.10)",
                  color: "rgba(48,209,88,0.8)",
                  border: "1px solid rgba(48,209,88,0.2)",
                  flexShrink: 0,
                }}
              >
                Curent
              </span>
            ) : (
              v.id && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => restore(v.id!, v.version)}
                  style={{
                    fontSize: 12,
                    color: blue,
                    fontWeight: 600,
                    background: "none",
                    border: "none",
                    cursor: busy ? "default" : "pointer",
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  Restaurează
                </button>
              )
            )}
          </div>
        ))
      )}
    </div>
  )
}
