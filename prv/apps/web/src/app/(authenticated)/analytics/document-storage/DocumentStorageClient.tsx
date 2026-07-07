"use client"

import { useDocumentStorage, type DocumentStorageResponse } from "@/lib/api-hooks"

type TypeBucket = DocumentStorageResponse["byType"][number]

const STATUS_ROWS: {
  key: "published" | "signed" | "draft" | "under_review" | "archived"
  label: string
}[] = [
  { key: "published", label: "Published" },
  { key: "signed", label: "Signed" },
  { key: "draft", label: "Draft" },
  { key: "under_review", label: "Under review" },
  { key: "archived", label: "Archived" },
]

const TYPE_LABEL: Record<string, string> = {
  contract: "Contract",
  report: "Report",
  photo: "Photo",
  certificate: "Certificate",
  invoice_doc: "Invoice doc",
  permit: "Permit",
  specification: "Specification",
  other: "Other",
}

function bytes(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} GB`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} KB`
  return `${n} B`
}

function Tile({ label, value, unit }: { label: string; value: React.ReactNode; unit?: string }) {
  return (
    <div
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border)",
        borderRadius: 18,
        padding: "15px 17px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <div
        style={{
          color: "var(--prv-text-3)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          fontWeight: 560,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 680, marginTop: 8, letterSpacing: "-0.02em" }}>
        {value}
        {unit && (
          <span style={{ fontSize: 13, color: "var(--prv-text-3)", fontWeight: 560 }}> {unit}</span>
        )}
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border)",
        borderRadius: 22,
        padding: "18px 20px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <h2
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--prv-text-3)",
          fontWeight: 560,
          marginBottom: 14,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

export function DocumentStorageClient() {
  const { data, isLoading } = useDocumentStorage()
  const byType: TypeBucket[] = data?.byType ?? []
  const maxCount = Math.max(1, ...byType.map((t) => t.count))
  const byStatus = data?.byStatus ?? {
    draft: 0,
    published: 0,
    under_review: 0,
    signed: 0,
    archived: 0,
  }

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Document Storage</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · document center · library &amp; governance
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          margin: "24px 0",
        }}
      >
        <Tile label="Documents" value={(data?.total ?? 0).toLocaleString("en-US")} />
        <Tile label="Total storage" value={bytes(data?.totalBytes ?? 0)} />
        <Tile label="Avg size" value={bytes(data?.avgBytes ?? 0)} />
        <Tile label="Legal hold" value={data?.legalHold ?? 0} />
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && (data?.total ?? 0) === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>No documents in the library.</div>
      )}

      {(data?.total ?? 0) > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
          <Card title="By type · count & size">
            {byType.map((t) => (
              <div
                key={t.type}
                style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0" }}
              >
                <div style={{ width: 110, fontSize: 13, color: "var(--prv-text-2)" }}>
                  {TYPE_LABEL[t.type] ?? t.type}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 99,
                    background: "var(--prv-g3)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 99,
                      background: "rgba(255,255,255,0.5)",
                      width: `${Math.max(4, (t.count / maxCount) * 100)}%`,
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 92,
                    textAlign: "right",
                    fontSize: 12,
                    color: "var(--prv-text-3)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {t.count} · {bytes(t.bytes)}
                </div>
              </div>
            ))}
          </Card>

          <Card title="Status mix">
            {STATUS_ROWS.map((r, i) => (
              <div
                key={r.key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "9px 0",
                  borderBottom:
                    i < STATUS_ROWS.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
                  fontSize: 13.5,
                }}
              >
                <div>{r.label}</div>
                <div style={{ color: "var(--prv-text-3)", fontVariantNumeric: "tabular-nums" }}>
                  {byStatus[r.key]}
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}
