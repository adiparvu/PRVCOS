"use client"

import { useEffect, useState } from "react"

interface OrgNode {
  id: string
  firstName: string
  lastName: string
  fullName: string
  role: string
  email: string
  isActive: boolean
  managerId: string | null
  reportCount: number
  depth: number
}

interface OrgChartData {
  nodes: OrgNode[]
  edges: Array<{ source: string; target: string }>
  rootIds: string[]
  totalNodes: number
}

const ROLE_LABEL: Record<string, string> = {
  group_ceo: "Group CEO",
  ceo: "CEO",
  co_ceo: "Co-CEO",
  operations_manager: "Ops Manager",
  project_director: "Project Director",
  shop_director: "Shop Director",
  store_manager: "Store Manager",
  hr_payroll: "HR & Payroll",
  department_head: "Dept Head",
  project_operations_manager: "Project Ops Mgr",
  oms: "OMS",
  project_oms: "Project OMS",
  data_analyst: "Data Analyst",
  qa_tester: "QA",
  app_support_specialist: "App Support",
  system_administrator: "Sysadmin",
  team_leader: "Team Leader",
  project_team_leader: "Project Team Leader",
  seller: "Seller",
  worker: "Worker",
  project_worker: "Project Worker",
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function AvatarNode({
  node,
  isSelected,
  onClick,
}: {
  node: OrgNode
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        minWidth: 80,
        maxWidth: 100,
      }}
    >
      {/* Avatar circle */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: isSelected ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)",
          border: isSelected
            ? "2px solid rgba(255,255,255,0.55)"
            : "1px solid rgba(255,255,255,0.14)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          fontWeight: 700,
          color: isSelected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.65)",
          transition: "all 0.15s",
          boxShadow: isSelected ? "0 0 16px rgba(255,255,255,0.12)" : "none",
        }}
      >
        {initials(node.fullName)}
      </div>

      {/* Name */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: isSelected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.75)",
            lineHeight: 1.3,
            letterSpacing: "-0.1px",
            maxWidth: 80,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {node.firstName}
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: "rgba(255,255,255,0.35)",
            letterSpacing: "0.2px",
            maxWidth: 80,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {ROLE_LABEL[node.role] ?? node.role}
        </div>
        {node.reportCount > 0 && (
          <div
            style={{
              fontSize: 10,
              color: "rgba(10,132,255,0.9)",
              fontWeight: 500,
              marginTop: 2,
            }}
          >
            {node.reportCount} rapoarte
          </div>
        )}
      </div>
    </div>
  )
}

function NodeDetailPanel({ node, onClose }: { node: OrgNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 80,
        left: 16,
        right: 16,
        background: "rgba(28,28,30,0.92)",
        backdropFilter: "blur(48px)",
        WebkitBackdropFilter: "blur(48px)",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: "28px 28px 0 0",
        padding: "20px 20px 40px",
        zIndex: 50,
        boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.4)",
      }}
    >
      {/* Drag handle */}
      <div
        style={{
          width: 36,
          height: 4,
          borderRadius: 2,
          background: "rgba(255,255,255,0.20)",
          margin: "0 auto 20px",
        }}
      />

      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.10)",
            border: "1px solid rgba(255,255,255,0.20)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            fontWeight: 700,
            color: "rgba(255,255,255,0.90)",
            flexShrink: 0,
          }}
        >
          {initials(node.fullName)}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "rgba(255,255,255,0.95)",
              letterSpacing: "-0.3px",
              marginBottom: 3,
            }}
          >
            {node.fullName}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.50)", fontWeight: 400 }}>
            {ROLE_LABEL[node.role] ?? node.role}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.30)", marginTop: 4 }}>
            {node.email}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.55)",
            fontSize: 18,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
        }}
      >
        <div
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: "12px 14px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "rgba(255,255,255,0.90)",
              marginBottom: 2,
            }}
          >
            {node.reportCount}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>
            Rapoarte directe
          </div>
        </div>
        <div
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: "12px 14px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "rgba(255,255,255,0.90)",
              marginBottom: 2,
            }}
          >
            {node.depth + 1}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>
            Nivel ierarhic
          </div>
        </div>
        <div
          style={{
            flex: 1,
            background: node.isActive ? "rgba(48,209,88,0.06)" : "rgba(255,69,58,0.06)",
            border: `1px solid ${node.isActive ? "rgba(48,209,88,0.20)" : "rgba(255,69,58,0.20)"}`,
            borderRadius: 12,
            padding: "12px 14px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: node.isActive ? "rgba(48,209,88,0.95)" : "rgba(255,69,58,0.95)",
              marginBottom: 2,
            }}
          >
            {node.isActive ? "Activ" : "Inactiv"}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>
            Status
          </div>
        </div>
      </div>
    </div>
  )
}

export function OrgChartView() {
  const [data, setData] = useState<OrgChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetch("/api/people/org-chart")
      .then((r) => r.json())
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            style={{
              height: 72,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 14,
            }}
          />
        ))}
      </div>
    )
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>
          Nicio structură organizatorică disponibilă.
        </p>
      </div>
    )
  }

  const selectedNode = data.nodes.find((n) => n.id === selectedId) ?? null

  // Group nodes by depth
  const byDepth = new Map<number, OrgNode[]>()
  for (const n of data.nodes) {
    if (!byDepth.has(n.depth)) byDepth.set(n.depth, [])
    byDepth.get(n.depth)!.push(n)
  }
  const depths = Array.from(byDepth.keys()).sort((a, b) => a - b)

  // Filter
  const filtered = searchQuery.trim()
    ? data.nodes.filter(
        (n) =>
          n.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null

  return (
    <div
      style={{
        minHeight: "100%",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
      }}
    >
      {/* Search */}
      <div style={{ padding: "12px 16px 8px" }}>
        <input
          type="text"
          placeholder="Caută după nume, rol..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.90)",
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Stats bar */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "4px 16px 16px",
        }}
      >
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
          {data.totalNodes} persoane ·{" "}
        </span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
          {depths.length} niveluri ierarhice
        </span>
      </div>

      {/* Search results */}
      {filtered ? (
        <div style={{ padding: "0 16px" }}>
          {filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => setSelectedId(n.id === selectedId ? null : n.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 0",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.70)",
                  flexShrink: 0,
                }}
              >
                {initials(n.fullName)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.90)" }}>
                  {n.fullName}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.40)" }}>
                  {ROLE_LABEL[n.role] ?? n.role} · Nivel {n.depth + 1}
                </div>
              </div>
              {n.reportCount > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(10,132,255,0.9)",
                    background: "rgba(10,132,255,0.10)",
                    border: "1px solid rgba(10,132,255,0.20)",
                    borderRadius: 8,
                    padding: "2px 8px",
                    fontWeight: 600,
                  }}
                >
                  {n.reportCount}
                </span>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, padding: "16px 0" }}>
              Niciun rezultat
            </p>
          )}
        </div>
      ) : (
        /* Hierarchical tree view */
        <div
          style={{
            overflowX: "auto",
            scrollbarWidth: "none",
            paddingBottom: 24,
          }}
        >
          {depths.map((depth) => {
            const nodes = byDepth.get(depth) ?? []
            return (
              <div key={depth} style={{ marginBottom: 24 }}>
                {/* Depth label */}
                <div
                  style={{
                    padding: "0 16px 8px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      height: 1,
                      flex: 1,
                      background: "rgba(255,255,255,0.06)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.25)",
                      letterSpacing: "0.6px",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Nivel {depth + 1}
                  </span>
                  <div
                    style={{
                      height: 1,
                      flex: 1,
                      background: "rgba(255,255,255,0.06)",
                    }}
                  />
                </div>

                {/* Nodes row */}
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    padding: "0 16px",
                    overflowX: "auto",
                    scrollbarWidth: "none",
                  }}
                >
                  {nodes.map((n) => (
                    <AvatarNode
                      key={n.id}
                      node={n}
                      isSelected={n.id === selectedId}
                      onClick={() => setSelectedId(n.id === selectedId ? null : n.id)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail panel (bottom sheet) */}
      {selectedNode && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSelectedId(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              zIndex: 49,
            }}
          />
          <NodeDetailPanel node={selectedNode} onClose={() => setSelectedId(null)} />
        </>
      )}
    </div>
  )
}
