"use client"

import React, { useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TreeNode {
  id: string
  label: string
  icon?: React.ReactNode
  /** Optional trailing count badge. */
  count?: number
  children?: TreeNode[]
}

export interface GlassTreeViewProps {
  nodes: TreeNode[]
  /** Currently selected node id (controlled). */
  selectedId?: string | null
  onSelect?: (id: string, node: TreeNode) => void
  /** Node ids expanded by default (uncontrolled expansion). */
  defaultExpanded?: string[]
  /** Fired when a branch is expanded/collapsed. */
  onToggle?: (id: string, expanded: boolean) => void
  className?: string
  style?: React.CSSProperties
}

// ── Chevron ───────────────────────────────────────────────────────────────────

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
      style={{
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 220ms cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

// ── Node row ──────────────────────────────────────────────────────────────────

function TreeRow({
  node,
  depth,
  expanded,
  selectedId,
  onSelect,
  toggle,
}: {
  node: TreeNode
  depth: number
  expanded: Set<string>
  selectedId?: string | null
  onSelect?: (id: string, node: TreeNode) => void
  toggle: (id: string) => void
}) {
  const hasChildren = !!node.children && node.children.length > 0
  const isOpen = expanded.has(node.id)
  const isSelected = node.id === selectedId

  return (
    <div role="treeitem" aria-expanded={hasChildren ? isOpen : undefined}>
      <div
        onClick={() => {
          onSelect?.(node.id, node)
          if (hasChildren) toggle(node.id)
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 10px",
          paddingLeft: 10 + depth * 22,
          borderRadius: 9,
          cursor: "pointer",
          fontSize: 13,
          color: isSelected ? "#fff" : "var(--prv-text-1)",
          background: isSelected ? "rgba(10,132,255,0.14)" : "transparent",
          transition: "background 120ms",
        }}
        onMouseEnter={(e) => {
          if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "var(--prv-g2)"
        }}
        onMouseLeave={(e) => {
          if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "transparent"
        }}
      >
        <span
          style={{
            width: 16,
            height: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--prv-text-3)",
            flexShrink: 0,
            visibility: hasChildren ? "visible" : "hidden",
          }}
        >
          <Chevron open={isOpen} />
        </span>

        {node.icon && (
          <span
            style={{
              width: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--prv-text-2)",
              flexShrink: 0,
            }}
          >
            {node.icon}
          </span>
        )}

        <span style={{ flex: 1 }}>{node.label}</span>

        {node.count != null && (
          <span
            style={{
              fontSize: 11,
              color: "var(--prv-text-4)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {node.count}
          </span>
        )}
      </div>

      {/* Children (animated) */}
      {hasChildren && (
        <div
          role="group"
          style={{
            overflow: "hidden",
            maxHeight: isOpen ? 9999 : 0,
            transition: "max-height 280ms cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {node.children!.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selectedId={selectedId}
              onSelect={onSelect}
              toggle={toggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassTreeView({
  nodes,
  selectedId,
  onSelect,
  defaultExpanded = [],
  onToggle,
  className,
  style,
}: GlassTreeViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(defaultExpanded))

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      const willExpand = !next.has(id)
      if (willExpand) next.add(id)
      else next.delete(id)
      onToggle?.(id, willExpand)
      return next
    })
  }

  return (
    <div
      role="tree"
      className={clsx("relative overflow-hidden", className)}
      style={{
        padding: 14,
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        borderRadius: 20,
        ...style,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "0 0 auto",
          height: 1,
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.09),transparent)",
          pointerEvents: "none",
        }}
      />
      {nodes.map((node) => (
        <TreeRow
          key={node.id}
          node={node}
          depth={0}
          expanded={expanded}
          selectedId={selectedId}
          onSelect={onSelect}
          toggle={toggle}
        />
      ))}
    </div>
  )
}
