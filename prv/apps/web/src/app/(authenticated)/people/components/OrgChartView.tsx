"use client"

import { useState } from "react"
import { GlassTreeView, GlassStatusDot, type TreeNode, type StatusKind } from "@prv/ui"

// ── Placeholder hierarchy ─────────────────────────────────────────────────────
// Reporting lines don't exist in the current /api/people payload (flat list, no
// manager relationships). Until a backend query exposes the org graph, the chart
// renders from this typed placeholder so the UI can be assembled and reviewed.

interface OrgPerson {
  id: string
  name: string
  role: string
  initials: string
  status: StatusKind
  reports: number
  children?: OrgPerson[]
}

const ORG: OrgPerson = {
  id: "ap",
  name: "Andrei Popescu",
  role: "Group CEO",
  initials: "AP",
  status: "online",
  reports: 1204,
  children: [
    {
      id: "mi",
      name: "Maria Ionescu",
      role: "Regional Manager · West",
      initials: "MI",
      status: "busy",
      reports: 214,
      children: [
        {
          id: "rd",
          name: "Radu Dumitru",
          role: "Store Manager · Cluj",
          initials: "RD",
          status: "online",
          reports: 12,
        },
        {
          id: "es",
          name: "Elena Stan",
          role: "Store Manager · Iași",
          initials: "ES",
          status: "away",
          reports: 8,
        },
      ],
    },
    {
      id: "vg",
      name: "Victor Georgescu",
      role: "Project Director",
      initials: "VG",
      status: "offline",
      reports: 96,
    },
    {
      id: "cn",
      name: "Cristina Neagu",
      role: "HR & Payroll Director",
      initials: "CN",
      status: "online",
      reports: 42,
    },
  ],
}

// ── Avatar w/ status badge (used as each tree node's icon) ─────────────────────

function NodeAvatar({ initials, status }: { initials: string; status: StatusKind }) {
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 700,
          color: "#fff",
          background: "var(--prv-g3)",
        }}
      >
        {initials}
      </span>
      <span
        style={{
          position: "absolute",
          right: -1,
          bottom: -1,
          // GlassStatusDot draws the colored presence dot with an outline-like ring.
          outline: "2px solid #0b0b0b",
          borderRadius: "50%",
        }}
      >
        <GlassStatusDot status={status} size="sm" />
      </span>
    </span>
  )
}

// ── Map the placeholder org into GlassTreeView nodes ───────────────────────────

function toTreeNode(person: OrgPerson): TreeNode {
  return {
    id: person.id,
    label: person.name,
    count: person.reports,
    icon: <NodeAvatar initials={person.initials} status={person.status} />,
    children: person.children?.map(toTreeNode),
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OrgChartView() {
  const [selectedId, setSelectedId] = useState<string>("ap")
  const nodes = [toTreeNode(ORG)]

  return (
    <div className="px-4">
      <GlassTreeView
        nodes={nodes}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id)}
        defaultExpanded={["ap", "mi"]}
      />
      <p className="text-[12px] text-white/15 mt-3.5 text-center">
        Tap a person to expand their reports
      </p>
    </div>
  )
}
