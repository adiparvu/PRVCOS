"use client"

import React from "react"
import { createPortal } from "react-dom"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useCommandPalette } from "@prv/ui"
import { getCommandsForRole } from "./registry"
import { useEntitySearch } from "./useEntitySearch"
import type { CommandEntry, EntityResult, EntityType, EntityStatus } from "./types"

// ── Recents ───────────────────────────────────────────────────────────────────

const RECENT_KEY = "prv:cmd:recent"
const MAX_RECENT = 5

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[]
  } catch {
    return []
  }
}

function pushRecent(id: string) {
  const next = [id, ...getRecent().filter((x) => x !== id)].slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}

// ── Entity display config ─────────────────────────────────────────────────────

const ENTITY_LABEL: Record<EntityType, string> = {
  employee: "Employee",
  project: "Project",
  client: "Client",
  invoice: "Invoice",
  document: "Document",
  vehicle: "Vehicle",
  tool: "Tool",
  product: "Product",
  team: "Team",
}

const STATUS_DOT: Record<EntityStatus, string> = {
  active: "rgba(48,209,88,0.9)",
  completed: "rgba(48,209,88,0.55)",
  review: "rgba(255,159,10,0.9)",
  pending: "rgba(255,159,10,0.75)",
  planning: "rgba(255,255,255,0.30)",
  inactive: "rgba(255,255,255,0.20)",
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function EntityIcon({ type }: { type: EntityType }) {
  const paths: Record<EntityType, React.ReactNode> = {
    project: (
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    ),
    employee: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </>
    ),
    client: (
      <>
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 3H8L2 7h20l-6-4Z" />
      </>
    ),
    invoice: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </>
    ),
    document: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
      </>
    ),
    vehicle: (
      <>
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <path d="M16 8h4l3 5v4h-7V8Z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </>
    ),
    tool: (
      <>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
      </>
    ),
    product: (
      <>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </>
    ),
    team: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  }
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[type]}
    </svg>
  )
}

function CommandIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

type PaletteItem =
  | { kind: "command"; entry: CommandEntry }
  | { kind: "entity"; result: EntityResult }

interface DisplaySection {
  title: string
  items: PaletteItem[]
}

// ── Row ───────────────────────────────────────────────────────────────────────

function PaletteRow({
  item,
  isActive,
  onHover,
  onSelect,
}: {
  item: PaletteItem
  isActive: boolean
  onHover: () => void
  onSelect: () => void
}) {
  const isCmd = item.kind === "command"

  return (
    <button
      role="option"
      aria-selected={isActive}
      data-active={isActive}
      onMouseEnter={onHover}
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "calc(100% - 16px)",
        margin: "1px 8px",
        padding: isActive ? "9px 12px 9px 14px" : "9px 12px",
        borderRadius: 12,
        background: isActive ? "rgba(255,255,255,0.10)" : "transparent",
        border: "none",
        textAlign: "left",
        cursor: "pointer",
        transition: "background 0.1s",
        position: "relative",
      }}
    >
      {/* Left accent bar */}
      {isActive && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            top: 6,
            bottom: 6,
            width: 2,
            borderRadius: "0 2px 2px 0",
            background: "rgba(255,255,255,0.65)",
          }}
        />
      )}

      {/* Icon */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          color: "var(--prv-text-2)",
        }}
      >
        {isCmd ? (
          <CommandIcon />
        ) : (
          <EntityIcon type={(item as { kind: "entity"; result: EntityResult }).result.entityType} />
        )}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--prv-text-1)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            margin: 0,
          }}
        >
          {isCmd
            ? item.entry.label
            : (item as { kind: "entity"; result: EntityResult }).result.title}
        </p>
        {!isCmd && (item as { kind: "entity"; result: EntityResult }).result.subtitle && (
          <p style={{ fontSize: 11, color: "var(--prv-text-3)", margin: "1px 0 0" }}>
            {(item as { kind: "entity"; result: EntityResult }).result.subtitle}
          </p>
        )}
        {isCmd && item.entry.description && (
          <p style={{ fontSize: 11, color: "var(--prv-text-3)", margin: "1px 0 0" }}>
            {item.entry.description}
          </p>
        )}
      </div>

      {/* Right side: status dot + type chip OR shortcut + badge */}
      {!isCmd &&
        (() => {
          const r = (item as { kind: "entity"; result: EntityResult }).result
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              {r.status && (
                <span
                  aria-hidden="true"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: STATUS_DOT[r.status] ?? "rgba(255,255,255,0.25)",
                  }}
                />
              )}
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--prv-text-4)",
                  background: "var(--prv-g1)",
                  border: "1px solid var(--prv-border-subtle)",
                  borderRadius: 5,
                  padding: "2px 6px",
                }}
              >
                {ENTITY_LABEL[r.entityType] ?? r.entityType}
              </span>
            </div>
          )
        })()}

      {isCmd && (item.entry.shortcut || item.entry.badge !== undefined) && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {item.entry.badge !== undefined && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "rgba(255,179,64,0.95)",
                background: "rgba(255,159,10,0.14)",
                border: "1px solid rgba(255,159,10,0.22)",
                borderRadius: 9999,
                padding: "2px 7px",
              }}
            >
              {item.entry.badge}
            </span>
          )}
          {item.entry.shortcut && (
            <kbd
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: "var(--prv-text-4)",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid var(--prv-border)",
                borderRadius: 5,
                padding: "2px 6px",
                fontFamily: "'SF Mono', 'Fira Code', monospace",
              }}
            >
              {item.entry.shortcut}
            </kbd>
          )}
        </div>
      )}
    </button>
  )
}

// ── Preview panel ─────────────────────────────────────────────────────────────

function PreviewPanel({ entity, onNavigate }: { entity: EntityResult; onNavigate: () => void }) {
  return (
    <div
      style={{
        borderTop: "1px solid var(--prv-border-subtle)",
        background: "rgba(255,255,255,0.05)",
        padding: "12px 16px 14px",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--prv-g2)",
            border: "1px solid var(--prv-border)",
            color: "var(--prv-text-2)",
            flexShrink: 0,
          }}
        >
          <EntityIcon type={entity.entityType} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--prv-text-1)", margin: 0 }}>
            {entity.title}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 2,
            }}
          >
            {entity.status && (
              <span
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: STATUS_DOT[entity.status] ?? "rgba(255,255,255,0.25)",
                  flexShrink: 0,
                }}
              />
            )}
            <span style={{ fontSize: 11, color: "var(--prv-text-3)" }}>
              {entity.subtitle ?? ENTITY_LABEL[entity.entityType]}
            </span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "center" }}>
        <button
          onClick={onNavigate}
          style={{
            padding: "6px 14px",
            borderRadius: 9999,
            background: "rgba(255,255,255,0.88)",
            border: "none",
            color: "rgba(0,0,0,0.9)",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Open
        </button>
        <button
          style={{
            padding: "6px 14px",
            borderRadius: 9999,
            background: "var(--prv-g2)",
            border: "1px solid var(--prv-border)",
            color: "var(--prv-text-1)",
            fontSize: 11,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Actions
        </button>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            color: "var(--prv-text-4)",
            fontFamily: "'SF Mono', monospace",
          }}
        >
          ↵ Open · ⌘C Copy
        </span>
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function CommandPalettePanel({ role }: { role: string }) {
  const { isOpen, close } = useCommandPalette()
  const router = useRouter()

  const [query, setQuery] = useState("")
  const [activeIdx, setActiveIdx] = useState(0)
  const [recents, setRecents] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  const allCommands = useMemo(() => getCommandsForRole(role), [role])
  const { results: entityResults, loading: entityLoading } = useEntitySearch(query)

  // Reset + focus on open
  useEffect(() => {
    if (isOpen) {
      setQuery("")
      setActiveIdx(0)
      setRecents(getRecent())
      setTimeout(() => inputRef.current?.focus(), 40)
    }
  }, [isOpen])

  // Build displayed sections
  const sections = useMemo<DisplaySection[]>(() => {
    const trimmed = query.trim()

    if (!trimmed) {
      const result: DisplaySection[] = []

      const recentCmds = recents
        .map((id) => allCommands.find((c) => c.id === id))
        .filter(Boolean) as CommandEntry[]
      if (recentCmds.length > 0) {
        result.push({
          title: "Recent",
          items: recentCmds.map((entry) => ({ kind: "command" as const, entry })),
        })
      }

      const bySection = new Map<string, CommandEntry[]>()
      for (const cmd of allCommands) {
        const arr = bySection.get(cmd.section) ?? []
        arr.push(cmd)
        bySection.set(cmd.section, arr)
      }
      for (const [title, entries] of bySection) {
        result.push({
          title,
          items: entries.map((entry) => ({ kind: "command" as const, entry })),
        })
      }
      return result
    }

    const q = trimmed.toLowerCase()
    const out: DisplaySection[] = []

    if (entityResults.length > 0) {
      out.push({
        title: `Results · ${entityResults.length}`,
        items: entityResults.map((result) => ({ kind: "entity" as const, result })),
      })
    }

    const matchedCmds = allCommands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        (c.keywords ?? []).some((kw) => kw.toLowerCase().includes(q))
    )
    if (matchedCmds.length > 0) {
      out.push({
        title: "Commands",
        items: matchedCmds.map((entry) => ({ kind: "command" as const, entry })),
      })
    }

    return out
  }, [query, allCommands, entityResults, recents])

  const flatItems = useMemo(() => sections.flatMap((s) => s.items), [sections])
  const activeItem = flatItems[activeIdx] ?? null
  const previewEntity = activeItem?.kind === "entity" ? activeItem.result : null

  function selectItem(item: PaletteItem) {
    if (item.kind === "command") {
      pushRecent(item.entry.id)
      if (item.entry.href) router.push(item.entry.href)
      else item.entry.action?.()
    } else {
      router.push(item.result.href)
    }
    close()
  }

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, flatItems.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === "Enter") {
        const item = flatItems[activeIdx]
        if (item) selectItem(item)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
    // selectItem is stable w.r.t. deps; intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, flatItems, activeIdx])

  // Scroll active item into view
  useEffect(() => {
    bodyRef.current
      ?.querySelector<HTMLElement>("[data-active='true']")
      ?.scrollIntoView({ block: "nearest" })
  }, [activeIdx])

  if (!mounted) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "10vh",
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? "auto" : "none",
        transition: "opacity 0.18s ease",
      }}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={close}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 560,
          margin: "0 16px",
          borderRadius: 32,
          background: "var(--prv-g3)",
          border: "1px solid var(--prv-border)",
          backdropFilter: "blur(64px) saturate(200%)",
          WebkitBackdropFilter: "blur(64px) saturate(200%)",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.8), 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 var(--prv-g3-spec)",
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transform: isOpen ? "scale(1) translateY(0)" : "scale(0.92) translateY(-16px)",
          transition: isOpen
            ? "transform 0.28s cubic-bezier(0.34,1.56,0.64,1)"
            : "transform 0.2s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Search row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 18px",
            borderBottom: "1px solid var(--prv-border-subtle)",
            flexShrink: 0,
          }}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--prv-text-3)"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIdx(0)
            }}
            placeholder="Search or type a command…"
            aria-label="Search commands"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 17,
              color: "var(--prv-text-1)",
              fontFamily: "inherit",
            }}
          />
          {entityLoading && <span style={{ fontSize: 11, color: "var(--prv-text-4)" }}>…</span>}
          {query && entityResults.length > 0 && !entityLoading && (
            <span style={{ fontSize: 11, color: "var(--prv-text-3)" }}>{entityResults.length}</span>
          )}
          <kbd
            style={{
              fontSize: 11,
              padding: "3px 7px",
              borderRadius: 6,
              background: "var(--prv-g2)",
              border: "1px solid var(--prv-border)",
              color: "var(--prv-text-4)",
              fontFamily: "inherit",
              flexShrink: 0,
            }}
          >
            esc
          </kbd>
        </div>

        {/* Results body */}
        <div
          ref={bodyRef}
          style={{ overflowY: "auto", flex: 1, paddingBottom: previewEntity ? 0 : 6 }}
        >
          {sections.length === 0 && query.trim() ? (
            <p
              style={{
                padding: "32px 20px",
                textAlign: "center",
                fontSize: 14,
                color: "var(--prv-text-4)",
              }}
            >
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            (() => {
              let gi = 0
              return sections.map((section) => (
                <div key={section.title}>
                  <p
                    style={{
                      padding: "10px 18px 5px",
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.10em",
                      color: "var(--prv-text-3)",
                      margin: 0,
                    }}
                  >
                    {section.title}
                  </p>
                  {section.items.map((item) => {
                    const isActive = gi === activeIdx
                    const idx = gi++
                    const key = item.kind === "command" ? item.entry.id : item.result.id
                    return (
                      <PaletteRow
                        key={key}
                        item={item}
                        isActive={isActive}
                        onHover={() => setActiveIdx(idx)}
                        onSelect={() => selectItem(item)}
                      />
                    )
                  })}
                </div>
              ))
            })()
          )}
        </div>

        {/* Entity preview panel */}
        {previewEntity && (
          <PreviewPanel
            entity={previewEntity}
            onNavigate={() => selectItem({ kind: "entity", result: previewEntity })}
          />
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "8px 18px",
            borderTop: "1px solid var(--prv-border-subtle)",
            flexShrink: 0,
          }}
        >
          {(
            [
              ["↑↓", "navigate"],
              ["↵", "open"],
              ["esc", "close"],
            ] as const
          ).map(([key, label]) => (
            <span
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                color: "var(--prv-text-4)",
              }}
            >
              <kbd
                style={{
                  padding: "2px 6px",
                  borderRadius: 5,
                  background: "var(--prv-g2)",
                  border: "1px solid var(--prv-border)",
                  fontSize: 10,
                }}
              >
                {key}
              </kbd>
              {label}
            </span>
          ))}
          <span
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: "var(--prv-text-4)",
            }}
          >
            <kbd
              style={{
                padding: "2px 6px",
                borderRadius: 5,
                background: "var(--prv-g2)",
                border: "1px solid var(--prv-border)",
                fontSize: 10,
              }}
            >
              ⌘K
            </kbd>
            toggle
          </span>
        </div>
      </div>
    </div>,
    document.body
  )
}
