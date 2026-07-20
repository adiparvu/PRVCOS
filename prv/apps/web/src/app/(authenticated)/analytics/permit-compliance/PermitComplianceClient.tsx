"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import type { PermitComplianceResponse } from "@/app/api/analytics/permit-compliance/route"
import type { PermitType } from "@/lib/ptw"

const TYPE_LABEL: Record<PermitType, string> = {
  hot_work: "Lucru la cald",
  confined_space: "Spațiu închis",
  working_at_height: "Lucru la înălțime",
  electrical: "Electric",
  excavation: "Săpături",
}

const tile: React.CSSProperties = {
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  borderRadius: 18,
  padding: "15px 17px",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
}

function Tile({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div style={tile}>
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
      <div
        style={{
          fontSize: 24,
          fontWeight: 680,
          marginTop: 8,
          letterSpacing: "-0.02em",
          color: tone ?? "var(--prv-text-1)",
        }}
      >
        {value}
      </div>
    </div>
  )
}

export function PermitComplianceClient() {
  const { data, isLoading } = useQuery<PermitComplianceResponse>({
    queryKey: ["permit-compliance"],
    queryFn: () => fetch("/api/analytics/permit-compliance").then((r) => r.json()),
  })

  const rate = data?.complianceRate ?? 0
  const rateTone =
    rate >= 90
      ? "rgba(48,209,88,0.95)"
      : rate >= 70
        ? "rgba(255,159,10,0.95)"
        : "rgba(255,69,58,0.95)"
  const maxType = Math.max(1, ...(data?.byType ?? []).map((t) => t.count))

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "36px 24px 80px" }}>
      <Link
        href="/safety/permits"
        style={{ color: "rgba(10,132,255,0.9)", fontSize: 13, textDecoration: "none" }}
      >
        → Permise de lucru
      </Link>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em", marginTop: 8 }}>
        Conformitate PTW
      </h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Guvernanța permiselor de lucru · rată de închidere formală vs. lapse/revocare
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          margin: "24px 0",
        }}
      >
        <Tile label="Rată închidere" value={`${rate}%`} tone={rateTone} />
        <Tile label="Active valide" value={data?.liveValid ?? 0} />
        <Tile label="În aprobare" value={data?.pendingApproval ?? 0} />
        <Tile
          label="De atenționat"
          value={data?.atRisk ?? 0}
          tone={(data?.atRisk ?? 0) > 0 ? "rgba(255,69,58,0.95)" : undefined}
        />
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Se încarcă…</div>}

      {data && (
        <>
          <div style={{ ...tile, marginBottom: 16 }}>
            <div
              style={{
                color: "var(--prv-text-3)",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                fontWeight: 560,
                marginBottom: 10,
              }}
            >
              Ciclu de viață
            </div>
            {[
              { k: "Închise", v: data.closed, c: "rgba(48,209,88,0.7)" },
              { k: "Expirate", v: data.expired, c: "rgba(255,69,58,0.7)" },
              { k: "Revocate", v: data.revoked, c: "rgba(255,69,58,0.7)" },
              { k: "Suspendate", v: data.suspended, c: "rgba(255,159,10,0.7)" },
              { k: "Respinse", v: data.rejected, c: "var(--prv-text-3)" },
            ].map((row) => (
              <div
                key={row.k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  fontSize: 13,
                }}
              >
                <span style={{ color: "var(--prv-text-2)" }}>{row.k}</span>
                <span style={{ fontWeight: 600, color: row.c, fontVariantNumeric: "tabular-nums" }}>
                  {row.v}
                </span>
              </div>
            ))}
          </div>

          <div style={tile}>
            <div
              style={{
                color: "var(--prv-text-3)",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                fontWeight: 560,
                marginBottom: 12,
              }}
            >
              Pe tip de permis
            </div>
            {data.byType.length === 0 ? (
              <div style={{ color: "var(--prv-text-3)", fontSize: 13 }}>Niciun permis încă.</div>
            ) : (
              data.byType.map((t) => (
                <div key={t.type} style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      marginBottom: 4,
                    }}
                  >
                    <span>{TYPE_LABEL[t.type]}</span>
                    <span
                      style={{ color: "var(--prv-text-3)", fontVariantNumeric: "tabular-nums" }}
                    >
                      {t.count}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 99,
                      background: "var(--prv-g3)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 99,
                        background: "rgba(255,255,255,0.55)",
                        width: `${Math.max(4, (t.count / maxType) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
