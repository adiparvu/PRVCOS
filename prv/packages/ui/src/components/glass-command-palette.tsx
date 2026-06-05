"use client"

import React, { useEffect, useRef, useState, useMemo } from "react"
import { clsx } from "clsx"
import { createPortal } from "react-dom"

export interface CommandItem {
  id: string
  label: string
  category?: string
  icon?: React.ReactNode
  shortcut?: string
  keywords?: string[]
}

export interface CommandSection {
  id: string
  title: string
  items: CommandItem[]
}

export interface GlassCommandPaletteProps {
  open: boolean
  onClose: () => void
  sections: CommandSection[]
  onSelect: (id: string) => void
  placeholder?: string
  recentIds?: string[]
}

function fuzzyMatch(query: string, item: CommandItem): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  const label = item.label.toLowerCase()
  const cat = (item.category ?? "").toLowerCase()
  const kw = (item.keywords ?? []).join(" ").toLowerCase()
  return label.includes(q) || cat.includes(q) || kw.includes(q)
}

export function GlassCommandPalette({
  open,
  onClose,
  sections,
  onSelect,
  placeholder = "Search or type a command…",
  recentIds = [],
}: GlassCommandPaletteProps) {
  const [query, setQuery] = useState("")
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  // Build flattened + filtered list
  const displayed = useMemo<{ sectionTitle: string; items: CommandItem[] }[]>(() => {
    if (query) {
      const all = sections.flatMap((s) => s.items).filter((it) => fuzzyMatch(query, it))
      return all.length ? [{ sectionTitle: "Results", items: all }] : []
    }

    const recentItems = recentIds
      .map((rid) => sections.flatMap((s) => s.items).find((it) => it.id === rid))
      .filter(Boolean) as CommandItem[]

    const base: { sectionTitle: string; items: CommandItem[] }[] = []
    if (recentItems.length) base.push({ sectionTitle: "Recent", items: recentItems })
    sections.forEach((s) => base.push({ sectionTitle: s.title, items: s.items }))
    return base
  }, [query, sections, recentIds])

  const flatItems = useMemo(() => displayed.flatMap((s) => s.items), [displayed])

  // reset on open
  useEffect(() => {
    if (open) {
      setQuery("")
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  // keyboard nav
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose()
        return
      }
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, flatItems.length - 1))
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, 0))
      }
      if (e.key === "Enter") {
        const item = flatItems[activeIdx]
        if (item) {
          onSelect(item.id)
          onClose()
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, flatItems, activeIdx, onClose, onSelect])

  // scroll active item into view
  useEffect(() => {
    if (!bodyRef.current) return
    const el = bodyRef.current.querySelector<HTMLElement>("[data-active='true']")
    el?.scrollIntoView({ block: "nearest" })
  }, [activeIdx])

  if (typeof document === "undefined") return null

  let globalIdx = 0

  return createPortal(
    <div
      role="dialog"
      aria-label="Command palette"
      aria-modal="true"
      className={clsx(
        "fixed inset-0 z-[9000] flex items-start justify-center",
        "transition-opacity duration-[180ms]",
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
      style={{ paddingTop: "10vh" }}
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-[8px]"
        style={{ background: "rgba(0,0,0,0.65)" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* panel */}
      <div
        className={clsx(
          "relative w-full max-w-[560px] mx-4 rounded-[32px]",
          "border backdrop-blur-[64px] backdrop-saturate-[200%]",
          "flex flex-col overflow-hidden",
          "transition-transform duration-[280ms]",
          open ? "scale-100 translate-y-0" : "scale-[0.92] -translate-y-4"
        )}
        style={{
          background: "var(--prv-g3)",
          borderColor: "var(--prv-border)",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.8), 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 var(--prv-g3-spec)",
          maxHeight: "70vh",
          transitionTimingFunction: open
            ? "cubic-bezier(0.34,1.56,0.64,1)"
            : "cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* search row */}
        <div
          className="flex items-center gap-3 px-5 py-4 shrink-0 border-b"
          style={{ borderColor: "var(--prv-border-subtle)" }}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
            style={{ color: "var(--prv-text-3)", flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" x2="16.65" y1="21" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent border-none outline-none text-[17px]"
            style={{ color: "var(--prv-text-1)" }}
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIdx(0)
            }}
            aria-label="Search commands"
          />
          <kbd
            className="text-[11px] px-2 py-0.5 rounded-[6px] border shrink-0"
            style={{
              color: "var(--prv-text-4)",
              background: "var(--prv-g2)",
              borderColor: "var(--prv-border)",
            }}
          >
            esc
          </kbd>
        </div>

        {/* results */}
        <div ref={bodyRef} className="overflow-y-auto flex-1 py-1">
          {displayed.length === 0 ? (
            <p className="px-5 py-8 text-center text-[14px]" style={{ color: "var(--prv-text-4)" }}>
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            displayed.map((section) => (
              <div key={section.sectionTitle}>
                <p
                  className="px-5 pt-3 pb-1.5 text-[10px] font-bold tracking-[0.09em] uppercase"
                  style={{ color: "var(--prv-text-3)" }}
                >
                  {section.sectionTitle}
                </p>
                {section.items.map((item) => {
                  const isActive = globalIdx === activeIdx
                  const idx = globalIdx++
                  return (
                    <button
                      key={item.id}
                      role="option"
                      aria-selected={isActive}
                      data-active={isActive}
                      className={clsx(
                        "flex items-center gap-3 w-full text-left",
                        "px-3 py-[10px] mx-2 rounded-[12px]",
                        "transition-colors duration-[100ms] focus-visible:outline-none"
                      )}
                      style={{
                        width: "calc(100% - 16px)",
                        background: isActive ? "var(--prv-g2)" : "transparent",
                      }}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => {
                        onSelect(item.id)
                        onClose()
                      }}
                    >
                      {item.icon && (
                        <div
                          className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0 border"
                          style={{
                            background: "var(--prv-g1)",
                            borderColor: "var(--prv-border-subtle)",
                            color: "var(--prv-text-2)",
                          }}
                          aria-hidden="true"
                        >
                          {item.icon}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px]" style={{ color: "var(--prv-text-1)" }}>
                          {item.label}
                        </p>
                        {item.category && (
                          <p className="text-[11px] mt-0.5" style={{ color: "var(--prv-text-3)" }}>
                            {item.category}
                          </p>
                        )}
                      </div>
                      {item.shortcut && (
                        <span
                          className="text-[11px] shrink-0 whitespace-nowrap"
                          style={{ color: "var(--prv-text-4)" }}
                        >
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* footer */}
        <div
          className="flex items-center gap-4 px-5 py-[10px] shrink-0 border-t"
          style={{ borderColor: "var(--prv-border-subtle)" }}
        >
          {(
            [
              ["↑↓", "navigate"],
              ["↵", "select"],
              ["esc", "close"],
            ] as const
          ).map(([key, label]) => (
            <span
              key={key}
              className="flex items-center gap-1.5 text-[11px]"
              style={{ color: "var(--prv-text-4)" }}
            >
              <kbd
                className="px-1.5 py-0.5 rounded border text-[10px]"
                style={{ background: "var(--prv-g2)", borderColor: "var(--prv-border)" }}
              >
                {key}
              </kbd>
              {label}
            </span>
          ))}
          <span
            className="flex items-center gap-1.5 text-[11px] ml-auto"
            style={{ color: "var(--prv-text-4)" }}
          >
            <kbd
              className="px-1.5 py-0.5 rounded border text-[10px]"
              style={{ background: "var(--prv-g2)", borderColor: "var(--prv-border)" }}
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
