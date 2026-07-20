"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@prv/ui"
import type { PermitDetail } from "@/app/api/safety/permits/[id]/route"
import { type PermitAction, type PermitStatus, type PermitType } from "@/lib/ptw"

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
}
const ACTION_LABEL: Record<PermitAction, string> = {
  submit: "Trimite spre aprobare",
  approve: "Aprobă",
  reject: "Respinge",
  activate: "Activează",
  close: "Închide permisul",
}

const card: React.CSSProperties = {
  margin: "12px 0 0",
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  borderRadius: 16,
  overflow: "hidden",
}
function fmt(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={card}>
      <div
        style={{
          padding: "12px 16px 10px",
          fontSize: 13,
          fontWeight: 700,
          color: "rgba(255,255,255,0.75)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {title}
      </div>
      <div style={{ padding: "6px 0" }}>{children}</div>
    </div>
  )
}
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "9px 16px",
        fontSize: 13,
      }}
    >
      <span style={{ color: "var(--prv-text-3)" }}>{k}</span>
      <span style={{ color: "var(--prv-text-1)", fontWeight: 500, textAlign: "right" }}>{v}</span>
    </div>
  )
}

export function PermitDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [permit, setPermit] = useState<PermitDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    return fetch(`/api/safety/permits/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: PermitDetail) => setPermit(d))
  }, [id])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  const transition = (action: PermitAction) => {
    if (busy) return
    let reason: string | undefined
    let closeOutNotes: string | undefined
    if (action === "reject") {
      reason = window.prompt("Motivul respingerii:") ?? undefined
      if (!reason?.trim()) return
    }
    if (action === "close") {
      closeOutNotes = window.prompt("Note de închidere (opțional):") ?? undefined
    }
    if (
      (action === "submit" || action === "activate") &&
      !window.confirm(`${ACTION_LABEL[action]}?`)
    )
      return
    setBusy(true)
    fetch(`/api/safety/permits/${id}/transition`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, reason, closeOutNotes }),
    })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}))
        if (!r.ok) {
          if (Array.isArray(j.issues)) throw new Error(j.issues.join("; "))
          throw new Error(j.error ?? "Acțiune eșuată")
        }
        await load()
        toast.success(`${ACTION_LABEL[action]} ✓`)
      })
      .catch((e) => toast.error("Nu s-a putut executa", e instanceof Error ? e.message : undefined))
      .finally(() => setBusy(false))
  }

  if (loading || !permit) {
    return <div style={{ padding: "40px 24px", color: "var(--prv-text-3)" }}>Se încarcă…</div>
  }

  const m = STATUS_META[permit.effectiveStatus]
  const detailKeys = Object.keys(permit.typeDetails ?? {})

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 24px 96px" }}>
      <button
        onClick={() => router.push("/safety/permits")}
        style={{
          background: "none",
          border: "none",
          color: "rgba(10,132,255,0.9)",
          fontSize: 14,
          cursor: "pointer",
          padding: 0,
        }}
      >
        ← Permise
      </button>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "var(--prv-text-3)",
            }}
          >
            {TYPE_LABEL[permit.type]}
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 680,
              letterSpacing: "-0.02em",
              margin: "4px 0 0",
              wordBreak: "break-word",
            }}
          >
            {permit.title}
          </h1>
        </div>
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            padding: "4px 11px",
            borderRadius: 100,
            background: m.bg,
            color: m.color,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {m.label}
        </span>
      </div>

      {/* Action bar */}
      {(permit.allowedActions.length > 0 || permit.canEdit) && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
          {permit.canEdit && (
            <button
              onClick={() => router.push("/safety/permits")}
              style={btn("rgba(255,255,255,0.06)", "var(--prv-text-2)")}
              disabled
              title="Editează din listă"
            >
              Ciornă editabilă
            </button>
          )}
          {permit.allowedActions.map((a) => {
            const danger = a === "reject"
            const primary = a === "approve" || a === "activate" || a === "submit"
            return (
              <button
                key={a}
                type="button"
                disabled={busy}
                onClick={() => transition(a)}
                style={btn(
                  danger ? "rgba(255,69,58,0.14)" : primary ? "#fff" : "rgba(255,255,255,0.06)",
                  danger ? "rgba(255,120,110,0.95)" : primary ? "#000" : "var(--prv-text-2)"
                )}
              >
                {ACTION_LABEL[a]}
              </button>
            )
          })}
        </div>
      )}

      <Section title="Detalii">
        <Row k="Locație" v={permit.location ?? "—"} />
        <Row k="Proiect" v={permit.projectName ?? "—"} />
        <Row k="Valabil" v={`${fmt(permit.validFrom)} → ${fmt(permit.validTo)}`} />
        <Row k="Solicitat de" v={permit.requesterName ?? "—"} />
        <div
          style={{ padding: "9px 16px", fontSize: 13, color: "var(--prv-text-2)", lineHeight: 1.5 }}
        >
          {permit.description}
        </div>
      </Section>

      <Section title="Aprobare (2 trepte)">
        <Row k="Supervizor" v={permit.supervisorName ?? "neasignat"} />
        <Row k="Aprobat supervizor" v={fmt(permit.supervisorApprovedAt)} />
        <Row k="Responsabil SSM/PSI" v={permit.safetyOfficerName ?? "neasignat"} />
        <Row k="Aprobat SSM/PSI" v={fmt(permit.safetyOfficerApprovedAt)} />
        {permit.activatedAt && <Row k="Activat" v={fmt(permit.activatedAt)} />}
        {permit.closedAt && <Row k="Închis" v={fmt(permit.closedAt)} />}
        {permit.rejectedAt && <Row k="Respins" v={fmt(permit.rejectedAt)} />}
        {permit.rejectionReason && (
          <div style={{ padding: "9px 16px", fontSize: 12.5, color: "rgba(255,120,110,0.95)" }}>
            Motiv: {permit.rejectionReason}
          </div>
        )}
        {permit.closeOutNotes && (
          <div style={{ padding: "9px 16px", fontSize: 12.5, color: "var(--prv-text-3)" }}>
            Închidere: {permit.closeOutNotes}
          </div>
        )}
      </Section>

      {permit.riskAssessment.length > 0 && (
        <Section title="Evaluare de risc">
          {permit.riskAssessment.map((r, i) => (
            <div
              key={i}
              style={{
                padding: "9px 16px",
                fontSize: 13,
                borderBottom:
                  i < permit.riskAssessment.length - 1
                    ? "1px solid rgba(255,255,255,0.05)"
                    : "none",
              }}
            >
              <div style={{ fontWeight: 600 }}>
                {r.hazard}{" "}
                <span
                  style={{
                    fontSize: 11,
                    color:
                      r.residualRisk === "high"
                        ? "rgba(255,69,58,0.9)"
                        : r.residualRisk === "medium"
                          ? "rgba(255,159,10,0.9)"
                          : "rgba(48,209,88,0.9)",
                  }}
                >
                  · {r.residualRisk}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--prv-text-3)", marginTop: 2 }}>
                {r.control}
              </div>
            </div>
          ))}
        </Section>
      )}

      {(permit.ppe.length > 0 || detailKeys.length > 0) && (
        <Section title="EIP & câmpuri specifice">
          {permit.ppe.length > 0 && <Row k="EIP" v={permit.ppe.join(", ")} />}
          {detailKeys.map((k) => (
            <Row key={k} v={String(permit.typeDetails[k])} k={k} />
          ))}
        </Section>
      )}
    </div>
  )
}

function btn(bg: string, color: string): React.CSSProperties {
  return {
    padding: "9px 15px",
    borderRadius: 11,
    border: bg.startsWith("#") ? "none" : "1px solid var(--prv-border)",
    background: bg,
    color,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  }
}
