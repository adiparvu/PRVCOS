"use client"

import { useState, useMemo } from "react"
import { GlassTreeView, GlassStatusDot, type TreeNode, type StatusKind } from "@prv/ui"
import { usePeople } from "@/lib/api-hooks"

interface Member {
  id: string
  fullName: string
  jobTitle: string | null
  managerId: string | null
  presence: { status: string }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

function NodeAvatar({ name, status }: { name: string; status: StatusKind }) {
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
        {initials(name)}
      </span>
      <span
        style={{
          position: "absolute",
          right: -1,
          bottom: -1,
          outline: "2px solid #0b0b0b",
          borderRadius: "50%",
        }}
      >
        <GlassStatusDot status={status} size="sm" />
      </span>
    </span>
  )
}

function buildTree(members: Member[]): TreeNode[] {
  const childrenMap = new Map<string | null, Member[]>()
  for (const m of members) {
    const key = m.managerId ?? null
    if (!childrenMap.has(key)) childrenMap.set(key, [])
    childrenMap.get(key)!.push(m)
  }

  function toNode(m: Member): TreeNode {
    const kids = childrenMap.get(m.id) ?? []
    return {
      id: m.id,
      label: m.jobTitle ? `${m.fullName} · ${m.jobTitle}` : m.fullName,
      count: kids.length > 0 ? kids.length : undefined,
      icon: (
        <NodeAvatar
          name={m.fullName}
          status={(m.presence.status as StatusKind) ?? "offline"}
        />
      ),
      children: kids.length > 0 ? kids.map(toNode) : undefined,
    }
  }

  return (childrenMap.get(null) ?? []).map(toNode)
}

function SkeletonRow() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
      <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
      <div style={{ width: 120, height: 12, borderRadius: 4, background: "rgba(255,255,255,0.07)" }} />
    </div>
  )
}

export function OrgChartView() {
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const { data, isLoading } = usePeople()

  const nodes = useMemo<TreeNode[]>(() => {
    const members = data?.members ?? []
    if (members.length === 0) return []
    return buildTree(members as Member[])
  }, [data])

  const defaultExpanded = useMemo(
    () => nodes.flatMap((n) => [n.id, ...(n.children?.map((c) => c.id) ?? [])]),
    [nodes]
  )

  if (isLoading) {
    return (
      <div className="px-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <p className="px-4 text-[13px] text-white/30 text-center mt-6">
        No org chart data yet.
      </p>
    )
  }

  return (
    <div className="px-4">
      <GlassTreeView
        nodes={nodes}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id)}
        defaultExpanded={defaultExpanded}
      />
      <p className="text-[12px] text-white/15 mt-3.5 text-center">
        Tap a person to expand their reports
      </p>
    </div>
  )
}
