"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { startRegistration, startAuthentication } from "@simplewebauthn/browser"
import { getClientDeviceId } from "@/lib/client-device"

// ── Types ─────────────────────────────────────────────────────────────────────

type Passkey = {
  id: string
  nickname: string | null
  deviceType: string | null
  backedUp: boolean
  createdAt: string
  lastUsedAt: string | null
}

type TrustedDevice = {
  id: string
  name: string | null
  platform: string | null
  trusted: boolean
  trustExpiresAt: string | null
  lastSeenAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(ts: string | null): string {
  if (!ts) return "—"
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60_000) return "Activ acum"
  if (diff < 3_600_000) return `acum ${Math.floor(diff / 60_000)}min`
  if (diff < 86_400_000) return `acum ${Math.floor(diff / 3_600_000)}h`
  return `acum ${Math.floor(diff / 86_400_000)}z`
}

function shortDate(ts: string | null): string {
  if (!ts) return "—"
  return new Date(ts).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.30)",
  marginBottom: 8,
}

const CARD: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
  overflow: "hidden",
  position: "relative",
}

const TOP_SHINE: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 1,
  background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconKey() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.60)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M10.7 12.3 20 3M17 6l2 2M14 9l2 2" />
    </svg>
  )
}

function IconDevice() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.60)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="2" width="16" height="20" rx="3" />
      <path d="M12 18h.01" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PasskeysAndDevices() {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const { data: pkData } = useQuery({
    queryKey: ["auth-passkeys"],
    queryFn: () =>
      fetch("/api/auth/passkeys").then((r) => {
        if (!r.ok) throw new Error("Failed to load passkeys")
        return r.json() as Promise<{ passkeys: Passkey[] }>
      }),
  })
  const passkeys = pkData?.passkeys ?? []

  const { data: devData } = useQuery({
    queryKey: ["auth-devices"],
    queryFn: () =>
      fetch("/api/auth/devices").then((r) => {
        if (!r.ok) throw new Error("Failed to load devices")
        return r.json() as Promise<{ devices: TrustedDevice[] }>
      }),
  })
  const devices = devData?.devices ?? []

  const flash = (msg: string) => {
    setNotice(msg)
    setError(null)
    window.setTimeout(() => setNotice(null), 3500)
  }

  // Register a new passkey on this device.
  async function addPasskey() {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const optsRes = await fetch("/api/auth/webauthn/register/options", { method: "POST" })
      if (!optsRes.ok) throw new Error("Nu s-au putut genera opțiunile passkey")
      const options = await optsRes.json()

      const attResp = await startRegistration({ optionsJSON: options })

      const nickname =
        typeof navigator !== "undefined" && navigator.platform ? navigator.platform : undefined
      const verifyRes = await fetch("/api/auth/webauthn/register/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response: attResp, nickname }),
      })
      if (!verifyRes.ok) {
        const j = await verifyRes.json().catch(() => ({}))
        throw new Error(j.error ?? "Verificarea passkey a eșuat")
      }
      await qc.invalidateQueries({ queryKey: ["auth-passkeys"] })
      flash("Passkey adăugat")
    } catch (e) {
      // User cancelling the browser prompt throws — treat as a soft error.
      setError(e instanceof Error ? e.message : "Înregistrarea passkey a eșuat")
    } finally {
      setBusy(false)
    }
  }

  async function removePasskey(id: string) {
    if (!window.confirm("Elimini acest passkey? Nu va mai putea fi folosit pentru autentificare."))
      return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/auth/passkeys/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Ștergerea passkey a eșuat")
      await qc.invalidateQueries({ queryKey: ["auth-passkeys"] })
      flash("Passkey eliminat")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ștergerea passkey a eșuat")
    } finally {
      setBusy(false)
    }
  }

  // Step-up: prove presence with a passkey (fresh re-auth for sensitive actions).
  async function stepUp() {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const optsRes = await fetch("/api/auth/webauthn/authenticate/options", { method: "POST" })
      if (!optsRes.ok) {
        const j = await optsRes.json().catch(() => ({}))
        throw new Error(j.error ?? "Niciun passkey disponibil")
      }
      const options = await optsRes.json()
      const authResp = await startAuthentication({ optionsJSON: options })
      const verifyRes = await fetch("/api/auth/webauthn/authenticate/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response: authResp }),
      })
      if (!verifyRes.ok) {
        const j = await verifyRes.json().catch(() => ({}))
        throw new Error(j.error ?? "Verificarea a eșuat")
      }
      flash("Identitate confirmată (step-up activ)")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Step-up a eșuat")
    } finally {
      setBusy(false)
    }
  }

  // Trust this browser so future logins can skip MFA within the window.
  async function trustThisDevice() {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const deviceId = getClientDeviceId()
      const nickname =
        typeof navigator !== "undefined" && navigator.platform ? navigator.platform : undefined
      const res = await fetch("/api/auth/devices", {
        method: "POST",
        headers: { "content-type": "application/json", "x-device-id": deviceId },
        body: JSON.stringify(nickname ? { name: nickname } : {}),
      })
      if (!res.ok) throw new Error("Nu s-a putut marca dispozitivul ca de încredere")
      await qc.invalidateQueries({ queryKey: ["auth-devices"] })
      flash("Dispozitiv marcat ca de încredere")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operațiunea a eșuat")
    } finally {
      setBusy(false)
    }
  }

  async function revokeDevice(id: string) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/auth/devices/${id}/revoke`, { method: "POST" })
      if (!res.ok) throw new Error("Revocarea a eșuat")
      await qc.invalidateQueries({ queryKey: ["auth-devices"] })
      flash("Încrederea a fost revocată")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revocarea a eșuat")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {/* ── Passkeys ── */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <p style={SECTION_LABEL}>Passkeys</p>
        <button
          onClick={addPasskey}
          disabled={busy}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: busy ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.85)",
            background: "none",
            border: "none",
            cursor: busy ? "default" : "pointer",
            padding: 0,
          }}
        >
          + Adaugă passkey
        </button>
      </div>

      {passkeys.length === 0 ? (
        <div
          style={{
            ...CARD,
            padding: "18px 16px",
            marginBottom: 12,
            color: "rgba(255,255,255,0.35)",
            fontSize: 13,
          }}
        >
          <div style={TOP_SHINE} />
          Niciun passkey înregistrat. Adaugă unul pentru autentificare fără parolă și confirmări
          rapide (Face ID / Touch ID / cheie de securitate).
        </div>
      ) : (
        <div style={{ ...CARD, marginBottom: 12 }}>
          <div style={TOP_SHINE} />
          {passkeys.map((p, i) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "13px 14px",
                borderBottom: i < passkeys.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <IconKey />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
                  {p.nickname ?? "Passkey"}
                  {p.backedUp && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "1px 7px",
                        borderRadius: 100,
                        background: "rgba(80,255,140,0.12)",
                        color: "rgba(80,255,140,0.85)",
                        border: "1px solid rgba(80,255,140,0.22)",
                      }}
                    >
                      Sincronizat
                    </span>
                  )}
                </p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", marginTop: 1 }}>
                  Adăugat {shortDate(p.createdAt)} · folosit {relativeTime(p.lastUsedAt)}
                </p>
              </div>
              <button
                onClick={() => removePasskey(p.id)}
                disabled={busy}
                style={{
                  fontSize: 11,
                  color: "rgba(255,80,80,0.70)",
                  fontWeight: 500,
                  background: "none",
                  border: "none",
                  cursor: busy ? "default" : "pointer",
                  padding: 0,
                }}
              >
                Elimină
              </button>
            </div>
          ))}
        </div>
      )}

      {passkeys.length > 0 && (
        <button
          onClick={stepUp}
          disabled={busy}
          style={{
            width: "100%",
            padding: "11px",
            marginBottom: 24,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14,
            color: "rgba(255,255,255,0.80)",
            fontSize: 13,
            fontWeight: 600,
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.5 : 1,
          }}
        >
          Confirmă identitatea cu passkey (step-up)
        </button>
      )}

      {/* ── Trusted devices ── */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <p style={SECTION_LABEL}>Dispozitive de încredere</p>
        <button
          onClick={trustThisDevice}
          disabled={busy}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: busy ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.85)",
            background: "none",
            border: "none",
            cursor: busy ? "default" : "pointer",
            padding: 0,
          }}
        >
          + Ai încredere în acest dispozitiv
        </button>
      </div>

      {devices.length === 0 ? (
        <div
          style={{
            ...CARD,
            padding: "18px 16px",
            color: "rgba(255,255,255,0.35)",
            fontSize: 13,
          }}
        >
          <div style={TOP_SHINE} />
          Niciun dispozitiv de încredere. Pe un dispozitiv de încredere poți sări peste 2FA la
          autentificare, pentru {30} de zile.
        </div>
      ) : (
        <div style={CARD}>
          <div style={TOP_SHINE} />
          {devices.map((d, i) => (
            <div
              key={d.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "13px 14px",
                borderBottom: i < devices.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <IconDevice />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
                  {d.name ?? d.platform ?? "Dispozitiv"}
                </p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", marginTop: 1 }}>
                  {d.trusted
                    ? `De încredere până la ${shortDate(d.trustExpiresAt)}`
                    : "Fără încredere activă"}{" "}
                  · văzut {relativeTime(d.lastSeenAt)}
                </p>
              </div>
              {d.trusted ? (
                <button
                  onClick={() => revokeDevice(d.id)}
                  disabled={busy}
                  style={{
                    fontSize: 11,
                    color: "rgba(255,80,80,0.70)",
                    fontWeight: 500,
                    background: "none",
                    border: "none",
                    cursor: busy ? "default" : "pointer",
                    padding: 0,
                  }}
                >
                  Revocă
                </button>
              ) : (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 100,
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.40)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  Inactiv
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {(error || notice) && (
        <p
          style={{
            marginTop: 10,
            fontSize: 12,
            color: error ? "rgba(255,99,90,0.90)" : "rgba(80,255,140,0.90)",
          }}
        >
          {error ?? notice}
        </p>
      )}
    </div>
  )
}
