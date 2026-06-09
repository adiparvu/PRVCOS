"use client"
import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"

const GLASS_CARD: React.CSSProperties = {
  background: "var(--prv-g1, rgba(255,255,255,0.06))",
  backdropFilter: "blur(32px)",
  WebkitBackdropFilter: "blur(32px)",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 24px 64px rgba(0,0,0,0.7)",
  borderRadius: 20,
}
const FIELD: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  color: "rgba(255,255,255,0.95)",
  padding: "10px 14px",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
}
const SELECT: React.CSSProperties = { ...FIELD, appearance: "none" } as React.CSSProperties
const LABEL: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "rgba(255,255,255,0.55)",
  marginBottom: 6,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
}
const BTN_PRIMARY: React.CSSProperties = {
  background: "rgba(255,255,255,0.92)",
  color: "#000",
  border: "none",
  borderRadius: 12,
  padding: "12px 28px",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
}
const BTN_GHOST: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.85)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  padding: "12px 24px",
  fontSize: 15,
  cursor: "pointer",
}

type FormState = Record<string, string | boolean>

export function DocumentBuilderClient() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>({ title: "", type: "other", description: "", fileUrl: "", fileName: "", isPublic: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function set(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, key: string) {
    setForm(p => ({ ...p, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
      title: form.title,
      type: form.type || undefined,
      description: form.description || undefined,
      fileUrl: form.fileUrl,
      fileName: form.fileName,
      isPublic: form.isPublic || undefined,
    }
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      void queryClient.invalidateQueries({ queryKey: ["documents"] })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută")
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ ...GLASS_CARD, padding: 40, textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h2 style={{ color: "rgba(255,255,255,0.95)", marginBottom: 8 }}>Creat cu succes!</h2>
          <p style={{ color: "rgba(255,255,255,0.55)", marginBottom: 24 }}>Înregistrarea a fost salvată.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button style={BTN_PRIMARY} onClick={() => router.push("/documents")}>← Înapoi la listă</button>
            <button style={BTN_GHOST} onClick={() => { setDone(false); setForm({ title: "", type: "other", description: "", fileUrl: "", fileName: "", isPublic: false }) }}>+ Creează altul</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000", padding: "24px 16px 120px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <button style={{ ...BTN_GHOST, marginBottom: 24 }} onClick={() => router.back()}>← Înapoi</button>
        <h1 style={{ color: "rgba(255,255,255,0.95)", fontSize: 28, fontWeight: 700, marginBottom: 32 }}>Document Nou</h1>

        {error && (
          <div style={{ background: "rgba(255,69,58,0.15)", border: "1px solid rgba(255,69,58,0.4)", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
            <span style={{ color: "#FF453A", fontSize: 14 }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ ...GLASS_CARD, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={LABEL}>Titlu document *</label>
            <input style={FIELD} value={form.title as string} onChange={e => set(e, "title")} type="text" required />
          </div>
          <div>
            <label style={LABEL}>Tip document</label>
            <select style={SELECT} value={form.type as string} onChange={e => set(e, "type")}>
              <option value="">— Selectează —</option>
              <option value="contract">Contract</option>
              <option value="report">Raport</option>
              <option value="photo">Fotografie</option>
              <option value="certificate">Certificat</option>
              <option value="permit">Permis</option>
              <option value="specification">Specificație</option>
              <option value="other">Altele</option>
            </select>
          </div>
          <div>
            <label style={LABEL}>URL fișier *</label>
            <input style={FIELD} value={form.fileUrl as string} onChange={e => set(e, "fileUrl")} type="text" placeholder="https://..." required />
          </div>
          <div>
            <label style={LABEL}>Nume fișier *</label>
            <input style={FIELD} value={form.fileName as string} onChange={e => set(e, "fileName")} type="text" placeholder="document.pdf" required />
          </div>
          <div>
            <label style={LABEL}>Descriere</label>
            <textarea style={{...FIELD, minHeight: 80}} value={form.description as string} onChange={e => set(e, "description")} />
          </div>
          <div>
            <label style={LABEL}>Vizibilitate</label>
            <label style={{display: "flex", alignItems: "center", gap: 10, cursor: "pointer"}}>
              <input type="checkbox" checked={!!form.isPublic} onChange={e => setForm(p => ({...p, isPublic: e.target.checked}))} style={{accentColor: "#fff"}} />
              <span style={{color: "rgba(255,255,255,0.75)", fontSize: 14}}>Document public</span>
            </label>
          </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button type="submit" style={{ ...BTN_PRIMARY, opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? "Se salvează..." : "Salvează"}
            </button>
            <button type="button" style={BTN_GHOST} onClick={() => router.back()}>Anulează</button>
          </div>
        </form>
      </div>
    </div>
  )
}
