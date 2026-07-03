"use client"

import { useMemo, useState } from "react"
import {
  useDocuments,
  usePeople,
  useDocumentShares,
  useCreateShare,
  useRevokeShare,
  type SharesResponse,
} from "@/lib/api-hooks"

type ShareRow = SharesResponse["shares"][number]

const PERM_LABEL: Record<string, string> = {
  view: "View only",
  download: "Download",
  edit: "Edit",
  manage: "Manage",
}
const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  expired: "Expired",
  revoked: "Revoked",
}

function shortDate(iso: string | null): string {
  if (!iso) return "no expiry"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const card = {
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  borderRadius: 22,
  padding: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 24px 64px rgba(0,0,0,0.5)",
  marginBottom: 18,
} as const
const inputStyle = {
  width: "100%",
  background: "var(--prv-g2)",
  border: "1px solid var(--prv-border)",
  borderRadius: 12,
  color: "var(--prv-text-1)",
  font: "inherit",
  fontSize: 13,
  padding: "10px 12px",
} as const
const labelStyle = {
  display: "block",
  color: "var(--prv-text-3)",
  fontSize: 11,
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  marginBottom: 6,
}
const miniBtn = {
  border: "1px solid var(--prv-border)",
  background: "var(--prv-g2)",
  color: "var(--prv-text-1)",
  borderRadius: 9,
  font: "inherit",
  fontSize: 11.5,
  padding: "6px 10px",
  cursor: "pointer",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
} as const

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border)",
        borderRadius: 18,
        padding: "14px 16px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <div
        style={{
          color: "var(--prv-text-3)",
          fontSize: 10.5,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 560,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 680, marginTop: 8 }}>{value}</div>
    </div>
  )
}

function Row({ s, onRevoke }: { s: ShareRow; onRevoke: () => void }) {
  const revoked = s.status === "revoked"
  const expired = s.status === "expired"
  const external = s.scope === "external"
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto",
        gap: 14,
        alignItems: "center",
        padding: "13px 15px",
        border: "1px solid var(--prv-border)",
        background: "var(--prv-g1)",
        borderRadius: 14,
        marginBottom: 9,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
        opacity: revoked ? 0.55 : 1,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: "var(--prv-g2)",
          border: "1px solid var(--prv-border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
        }}
      >
        {external ? "🔗" : "👤"}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 560 }}>
          {external ? "External link" : (s.granteeName ?? "User")}
          {s.passwordProtected ? " · 🔒" : ""}
        </div>
        <div style={{ color: "var(--prv-text-3)", fontSize: 12, marginTop: 3 }}>
          {external && s.token ? (
            <span style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>
              /share/{s.token.slice(0, 8)}… ·{" "}
            </span>
          ) : (
            "Internal · "
          )}
          {PERM_LABEL[s.permission] ?? s.permission}
          {external ? ` · ${s.accessCount} views` : ""} · exp {shortDate(s.expiresAt)}
        </div>
      </div>
      <span
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          border: `1px solid ${expired ? "rgba(255,176,64,0.32)" : "var(--prv-border)"}`,
          borderRadius: 6,
          padding: "3px 8px",
          whiteSpace: "nowrap",
          color: expired ? "rgba(255,190,90,0.92)" : "var(--prv-text-2)",
          background: expired ? "rgba(255,176,64,0.12)" : "transparent",
        }}
      >
        {STATUS_LABEL[s.status] ?? s.status}
      </span>
      {!revoked ? (
        <button style={miniBtn} onClick={onRevoke}>
          Revoke
        </button>
      ) : (
        <span />
      )}
    </div>
  )
}

export function SharesClient() {
  const docsQuery = useDocuments()
  const peopleQuery = usePeople()
  const documents = docsQuery.data?.documents ?? []
  const members = peopleQuery.data?.members ?? []

  const [docId, setDocId] = useState("")
  const selectedDoc = docId || (documents[0]?.id ?? "")

  const sharesQuery = useDocumentShares(selectedDoc || null)
  const create = useCreateShare(selectedDoc)
  const revoke = useRevokeShare(selectedDoc)

  const [scope, setScope] = useState<"internal" | "external">("internal")
  const [granteeUserId, setGranteeUserId] = useState("")
  const [permission, setPermission] = useState("view")
  const [expiresAt, setExpiresAt] = useState("")
  const [passwordProtected, setPasswordProtected] = useState(false)

  const shares = sharesQuery.data?.shares ?? []
  const meta = sharesQuery.data?.meta

  const canSubmit = useMemo(() => {
    if (!selectedDoc || create.isPending) return false
    if (scope === "internal" && !granteeUserId) return false
    return true
  }, [selectedDoc, scope, granteeUserId, create.isPending])

  function submit() {
    if (!canSubmit) return
    create.mutate(
      {
        scope,
        permission,
        granteeUserId: scope === "internal" ? granteeUserId : undefined,
        passwordProtected,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      },
      {
        onSuccess: () => {
          setExpiresAt("")
          setPasswordProtected(false)
        },
      }
    )
  }

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Sharing</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Documents · internal &amp; external access, secure links, revoke
      </div>

      <div style={{ margin: "22px 0" }}>
        <label style={labelStyle}>Document</label>
        <select style={inputStyle} value={selectedDoc} onChange={(e) => setDocId(e.target.value)}>
          {documents.length === 0 && <option value="">No documents</option>}
          {documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <Tile label="Shares" value={meta?.total ?? 0} />
        <Tile label="Active" value={meta?.active ?? 0} />
        <Tile label="External links" value={meta?.external ?? 0} />
        <Tile label="Revoked" value={meta?.revoked ?? 0} />
      </div>

      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>New share</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Scope</label>
            <div
              style={{
                display: "inline-flex",
                gap: 4,
                background: "var(--prv-g2)",
                border: "1px solid var(--prv-border)",
                borderRadius: 100,
                padding: 3,
              }}
            >
              {(["internal", "external"] as const).map((sc) => (
                <button
                  key={sc}
                  onClick={() => setScope(sc)}
                  style={{
                    border: 0,
                    background: scope === sc ? "var(--prv-g3)" : "transparent",
                    color: scope === sc ? "var(--prv-text-1)" : "var(--prv-text-2)",
                    font: "inherit",
                    fontSize: 12,
                    padding: "6px 14px",
                    borderRadius: 100,
                    cursor: "pointer",
                    boxShadow: scope === sc ? "inset 0 1px 0 rgba(255,255,255,0.22)" : "none",
                  }}
                >
                  {sc === "internal" ? "Internal user" : "External link"}
                </button>
              ))}
            </div>
          </div>
          {scope === "internal" && (
            <div>
              <label style={labelStyle}>User</label>
              <select
                style={inputStyle}
                value={granteeUserId}
                onChange={(e) => setGranteeUserId(e.target.value)}
              >
                <option value="">Select…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label style={labelStyle}>Permission</label>
            <select
              style={inputStyle}
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
            >
              <option value="view">View only</option>
              <option value="download">Download</option>
              <option value="edit">Edit</option>
              <option value="manage">Manage</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Expires (optional)</label>
            <input
              type="date"
              style={inputStyle}
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
          {scope === "external" && (
            <div>
              <label style={labelStyle}>Password</label>
              <button
                onClick={() => setPasswordProtected((v) => !v)}
                style={{ ...inputStyle, textAlign: "left", cursor: "pointer" }}
              >
                {passwordProtected ? "🔒 Protected" : "Off"}
              </button>
            </div>
          )}
          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={submit}
              disabled={!canSubmit}
              style={{
                background: "#fff",
                color: "#000",
                border: 0,
                borderRadius: 12,
                font: "inherit",
                fontWeight: 600,
                fontSize: 13,
                padding: "10px 20px",
                cursor: canSubmit ? "pointer" : "not-allowed",
                opacity: canSubmit ? 1 : 0.4,
              }}
            >
              {create.isPending ? "Creating…" : "Create share"}
            </button>
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Shares</h2>
          <span style={{ color: "var(--prv-text-3)", fontSize: 12 }}>newest first</span>
        </div>
        {sharesQuery.isLoading && (
          <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>
        )}
        {!sharesQuery.isLoading && shares.length === 0 && (
          <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>
            No shares yet for this document.
          </div>
        )}
        {shares.map((s) => (
          <Row key={s.id} s={s} onRevoke={() => revoke.mutate(s.id)} />
        ))}
      </div>
    </div>
  )
}
