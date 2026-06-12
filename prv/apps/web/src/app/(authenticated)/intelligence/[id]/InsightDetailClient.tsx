"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type {
  InsightDetail,
  AffectedStore,
  Recommendation,
} from "@/app/api/intelligence/[id]/route"

function ScoreRing({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score))
  return (
    <div
      style={{
        width: 76,
        height: 76,
        borderRadius: "50%",
        background: `conic-gradient(rgba(191,90,242,0.85) 0% ${pct}%, rgba(255,255,255,0.08) ${pct}% 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: "#000",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
        }}
      >
        <span
          style={{ fontSize: 20, fontWeight: 700, color: "rgba(191,90,242,0.9)", lineHeight: 1 }}
        >
          {score}
        </span>
        <span
          style={{
            fontSize: 9,
            color: "rgba(255,255,255,0.35)",
            fontWeight: 600,
            letterSpacing: 0.3,
            marginTop: 1,
          }}
        >
          SCOR
        </span>
      </div>
    </div>
  )
}

function AffectedStoreRow({ store }: { store: AffectedStore }) {
  const dotColor =
    store.statusDot === "red"
      ? "rgba(255,69,58,0.95)"
      : store.statusDot === "amber"
        ? "rgba(255,159,10,0.95)"
        : "rgba(48,209,88,0.95)"

  const valColor =
    store.statusDot === "red"
      ? "rgba(255,69,58,0.9)"
      : store.statusDot === "amber"
        ? "rgba(255,159,10,0.9)"
        : "rgba(48,209,88,0.9)"

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "13px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: dotColor,
          boxShadow: `0 0 6px ${dotColor}`,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "rgba(255,255,255,0.90)",
            marginBottom: 3,
          }}
        >
          {store.storeName}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.40)" }}>{store.detail}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: valColor }}>{store.metricValue}</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.30)" }}>{store.metricLabel}</div>
      </div>
    </div>
  )
}

function RecommendationRow({ rec }: { rec: Recommendation }) {
  const priorityColor =
    rec.priority === "urgent"
      ? "rgba(48,209,88,0.9)"
      : rec.priority === "medium"
        ? "rgba(10,132,255,0.9)"
        : "rgba(255,159,10,0.9)"

  const iconBg =
    rec.priority === "urgent"
      ? "rgba(48,209,88,0.12)"
      : rec.priority === "medium"
        ? "rgba(10,132,255,0.12)"
        : "rgba(255,159,10,0.12)"
  const iconBorder =
    rec.priority === "urgent"
      ? "1.5px solid rgba(48,209,88,0.35)"
      : rec.priority === "medium"
        ? "1.5px solid rgba(10,132,255,0.35)"
        : "1.5px solid rgba(255,159,10,0.35)"

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "13px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: iconBg,
          border: iconBorder,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {rec.priority === "urgent" ? (
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke={priorityColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : rec.priority === "medium" ? (
          <svg width="8" height="8" viewBox="0 0 24 24" fill={priorityColor} stroke="none">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        ) : (
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke={priorityColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "rgba(255,255,255,0.88)",
            lineHeight: 1.4,
          }}
        >
          {rec.title}
        </div>
        <div style={{ fontSize: 11, color: priorityColor, fontWeight: 600, marginTop: 4 }}>
          {rec.priority === "urgent"
            ? "Prioritate Urgent"
            : rec.priority === "medium"
              ? "Prioritate Medie"
              : "Low Priority"}{" "}
          · {rec.deadline}
        </div>
      </div>
    </div>
  )
}

function SectionCard({
  title,
  badge,
  children,
}: {
  title: string
  badge?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ margin: "0 16px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase" as const,
            letterSpacing: 0.8,
          }}
        >
          {title}
        </span>
        {badge && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.22)",
              background: "rgba(255,255,255,0.07)",
              borderRadius: 8,
              padding: "2px 7px",
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 20,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",
          }}
        />
        {children}
      </div>
    </div>
  )
}

export default function InsightDetailClient({ id }: { id: string }) {
  const [insight, setInsight] = useState<InsightDetail | null>(null)
  const [fabOpen, setFabOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/intelligence/${id}`)
      .then((r) => r.json())
      .then((d) => setInsight(d as InsightDetail))
      .catch(() => {})
  }, [id])

  const typeColor =
    insight?.type === "recommendation"
      ? "rgba(191,90,242,0.9)"
      : insight?.type === "alert"
        ? "rgba(255,69,58,0.9)"
        : insight?.type === "forecast"
          ? "rgba(10,132,255,0.9)"
          : "rgba(48,209,88,0.9)"

  const typeLabel =
    insight?.type === "recommendation"
      ? "Recomandare AI"
      : insight?.type === "alert"
        ? "Alert · Urgent"
        : insight?.type === "forecast"
          ? "AI Forecast"
          : "Raport"

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        paddingBottom: 120,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
      }}
    >
      {/* Back + Header */}
      <div style={{ padding: "52px 16px 0" }}>
        <Link
          href="/intelligence"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: "rgba(191,90,242,0.85)",
            textDecoration: "none",
            fontSize: 15,
            fontWeight: 400,
            marginBottom: 16,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Intelligence
        </Link>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: insight ? typeColor.replace("0.9", "0.14") : "rgba(255,255,255,0.06)",
              border: `1px solid ${insight ? typeColor.replace("0.9", "0.30") : "rgba(255,255,255,0.12)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {insight?.type === "recommendation" || insight?.type === "forecast" ? (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke={typeColor}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            ) : insight?.type === "alert" ? (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke={typeColor}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            ) : null}
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: typeColor.replace("0.9", "0.75"),
                textTransform: "uppercase" as const,
                letterSpacing: 0.6,
                marginBottom: 5,
              }}
            >
              {typeLabel}
            </div>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "rgba(255,255,255,0.95)",
                letterSpacing: "-0.4px",
                lineHeight: 1.3,
                margin: 0,
              }}
            >
              {insight?.title ?? "—"}
            </h1>
          </div>
        </div>

        <div
          style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}
        >
          {insight?.priority === "urgent" && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,69,58,0.9)",
                background: "rgba(255,69,58,0.10)",
                border: "1px solid rgba(255,69,58,0.25)",
                borderRadius: 8,
                padding: "3px 8px",
              }}
            >
              Urgent
            </span>
          )}
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: typeColor.replace("0.9", "0.85"),
              background: typeColor.replace("0.9", "0.10"),
              border: `1px solid ${typeColor.replace("0.9", "0.25")}`,
              borderRadius: 8,
              padding: "3px 8px",
            }}
          >
            {insight?.affectedCount ?? 0} {insight?.affectedLabel ?? ""}
          </span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.28)" }}>
            {insight?.confidenceLabel} · {insight?.timeAgo}
          </span>
        </div>
      </div>

      {/* Score card */}
      <div
        style={{
          margin: "20px 16px 0",
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "rgba(191,90,242,0.06)",
          border: "1px solid rgba(191,90,242,0.16)",
          borderRadius: 18,
          padding: 16,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: "linear-gradient(90deg,transparent,rgba(191,90,242,0.25),transparent)",
          }}
        />
        <ScoreRing score={insight?.score ?? 0} />
        <div>
          <div
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1.5,
              fontWeight: 400,
            }}
          >
            {insight?.summary ?? "—"}
          </div>
          {insight?.riskLabel && (
            <div
              style={{ fontSize: 11, color: "rgba(191,90,242,0.6)", marginTop: 6, fontWeight: 500 }}
            >
              {insight.riskLabel} · {insight.riskDeadline} · {insight.dataSource}
            </div>
          )}
        </div>
      </div>

      {/* Affected Stores */}
      <div style={{ marginTop: 24 }}>
        <SectionCard
          title="Magazine Afectate"
          badge={insight ? `${insight.affectedStores.length} magazine` : undefined}
        >
          {insight
            ? insight.affectedStores.map((s) => <AffectedStoreRow key={s.storeId} store={s} />)
            : [1, 2].map((n) => (
                <div
                  key={n}
                  style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div
                    style={{
                      height: 14,
                      background: "rgba(255,255,255,0.07)",
                      borderRadius: 5,
                      width: "55%",
                      marginBottom: 7,
                    }}
                  />
                  <div
                    style={{
                      height: 11,
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: 4,
                      width: "75%",
                    }}
                  />
                </div>
              ))}
        </SectionCard>
      </div>

      {/* Recommendations */}
      <SectionCard
        title="Recommendations"
        badge={insight ? `${insight.recommendations.length} actions` : undefined}
      >
        {insight
          ? insight.recommendations.map((r) => <RecommendationRow key={r.id} rec={r} />)
          : [1, 2, 3].map((n) => (
              <div
                key={n}
                style={{
                  padding: "13px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.06)",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      height: 13,
                      background: "rgba(255,255,255,0.07)",
                      borderRadius: 4,
                      width: "70%",
                      marginBottom: 6,
                    }}
                  />
                  <div
                    style={{
                      height: 10,
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: 4,
                      width: "40%",
                    }}
                  />
                </div>
              </div>
            ))}
      </SectionCard>

      {/* FAB 3-dot */}
      <button
        onClick={() => setFabOpen(true)}
        style={{
          position: "fixed",
          bottom: 88,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.14)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          border: "1px solid rgba(255,255,255,0.28)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.25)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 40,
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="5" r="1" fill="currentColor" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
          <circle cx="12" cy="19" r="1" fill="currentColor" />
        </svg>
      </button>

      {/* FAB Sheet */}
      {fabOpen && (
        <>
          <div
            onClick={() => setFabOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              zIndex: 48,
            }}
          />
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "rgba(28,28,30,0.92)",
              backdropFilter: "blur(48px)",
              WebkitBackdropFilter: "blur(48px)",
              borderTop: "1px solid rgba(255,255,255,0.14)",
              borderRadius: "28px 28px 0 0",
              padding: "12px 16px 44px",
              zIndex: 50,
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                background: "rgba(255,255,255,0.20)",
                borderRadius: 2,
                margin: "0 auto 20px",
              }}
            />
            {[
              {
                label: "Act",
                icon: "M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
                color: "rgba(48,209,88,0.9)",
              },
              {
                label: "Distribuie",
                icon: "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8 M16 6l-4-4-4 4 M12 2v13",
                color: "rgba(10,132,255,0.9)",
              },
              {
                label: "Archive",
                icon: "M21 8v13H3V8 M23 2H1v6h22z M10 12h4",
                color: "rgba(255,255,255,0.70)",
              },
              {
                label: "Ignhour",
                icon: "M18.36 6.64A9 9 0 015.64 19.36 M9.9 4.24A9.12 9.12 0 0112 4a9 9 0 019 9 M12 20v2 M12 2v2",
                color: "rgba(255,69,58,0.9)",
              },
            ].map((item, i, arr) => (
              <button
                key={i}
                onClick={() => setFabOpen(false)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "15px 4px",
                  background: "none",
                  border: "none",
                  borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: item.color.replace("0.9", "0.12").replace("0.70", "0.08"),
                    border: `1px solid ${item.color.replace("0.9", "0.25").replace("0.70", "0.16")}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={item.color}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={item.icon} />
                  </svg>
                </div>
                <span style={{ fontSize: 16, fontWeight: 500, color: item.color }}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
