"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SearchResultItem {
  id: string
  label: string
  meta?: string
  badge?: string
  icon?: React.ReactNode
}

export interface SearchResultSection {
  id: string
  title: string
  items: SearchResultItem[]
}

export interface SearchScope {
  id: string
  label: string
}

// ── GlassSearchOverlay ────────────────────────────────────────────────────────

export interface GlassSearchOverlayProps {
  open: boolean
  onClose: () => void
  sections?: SearchResultSection[]
  scopes?: SearchScope[]
  activeScope?: string
  onScopeChange?: (id: string) => void
  onQueryChange?: (q: string) => void
  onSelect?: (item: SearchResultItem) => void
  placeholder?: string
}

export function GlassSearchOverlay({
  open,
  onClose,
  sections = [],
  scopes,
  activeScope = "all",
  onScopeChange,
  onQueryChange,
  onSelect,
  placeholder = "Search everything…",
}: GlassSearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    } else {
      setQuery("")
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value)
      onQueryChange?.(e.target.value)
    },
    [onQueryChange]
  )

  if (typeof document === "undefined") return null

  return createPortal(
    <>
      <style>{`.prv-search-input::placeholder{color:var(--prv-text-4)}`}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="fixed inset-0 z-[8000] flex flex-col"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 180ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* backdrop */}
        <div
          className="absolute inset-0"
          style={{
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
          onClick={onClose}
          aria-hidden="true"
        />

        {/* panel */}
        <div
          className="relative z-10 flex flex-col h-full mx-auto w-full"
          style={{ maxWidth: 640, padding: "env(safe-area-inset-top, 20px) 16px 0" }}
        >
          {/* scope pills */}
          {scopes && scopes.length > 0 && (
            <div className="flex gap-1.5 pt-3 pb-1 flex-wrap">
              {scopes.map((scope) => (
                <button
                  key={scope.id}
                  onClick={() => onScopeChange?.(scope.id)}
                  className="px-3 py-1.5 rounded-full border text-[12px] font-medium transition-all duration-200 focus-visible:outline-none"
                  style={
                    activeScope === scope.id
                      ? {
                          background: "var(--prv-text-1)",
                          color: "var(--prv-bg)",
                          borderColor: "transparent",
                        }
                      : {
                          background: "var(--prv-g1)",
                          color: "var(--prv-text-3)",
                          borderColor: "var(--prv-border)",
                        }
                  }
                >
                  {scope.label}
                </button>
              ))}
            </div>
          )}

          {/* input row */}
          <div
            className="flex items-center gap-3 mt-4 px-5 py-3.5 rounded-full border backdrop-blur-[64px] backdrop-saturate-[200%]"
            style={{
              background: "var(--prv-g2)",
              borderColor: "var(--prv-border)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 var(--prv-g3-spec)",
              transform: open ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.97)",
              transition: "transform 280ms cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              style={{ color: "var(--prv-text-3)", flexShrink: 0 }}
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" x2="16.65" y1="21" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={handleQueryChange}
              placeholder={placeholder}
              className="prv-search-input flex-1 bg-transparent border-none outline-none text-[17px]"
              style={{ color: "var(--prv-text-1)" }}
              aria-label={placeholder}
            />
            <button
              onClick={onClose}
              className="text-[14px] font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-none"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--prv-text-2)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--prv-text-1)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--prv-text-2)")}
            >
              Cancel
            </button>
          </div>

          {/* results */}
          <div
            className="flex-1 overflow-y-auto py-3 pb-6"
            style={{
              opacity: open ? 1 : 0,
              transform: open ? "translateY(0)" : "translateY(8px)",
              transition:
                "opacity 220ms cubic-bezier(0.4,0,0.2,1), transform 220ms cubic-bezier(0.4,0,0.2,1)",
              transitionDelay: open ? "80ms" : "0ms",
            }}
          >
            {sections.map((section) => (
              <div key={section.id}>
                <p
                  className="text-[10px] font-bold tracking-[0.09em] uppercase py-2.5 px-1"
                  style={{ color: "var(--prv-text-3)" }}
                >
                  {section.title}
                </p>
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-colors duration-100 focus-visible:outline-none"
                    style={{ background: "transparent", border: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--prv-g2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    onClick={() => {
                      onSelect?.(item)
                      onClose()
                    }}
                  >
                    {item.icon && (
                      <div
                        className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 border"
                        style={{
                          background: "var(--prv-g1)",
                          borderColor: "var(--prv-border-subtle)",
                          color: "var(--prv-text-2)",
                        }}
                      >
                        {item.icon}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] truncate" style={{ color: "var(--prv-text-1)" }}>
                        {item.label}
                      </p>
                      {item.meta && (
                        <p
                          className="text-[11px] mt-0.5 truncate"
                          style={{ color: "var(--prv-text-3)" }}
                        >
                          {item.meta}
                        </p>
                      )}
                    </div>
                    {item.badge && (
                      <span
                        className="text-[10px] font-semibold tracking-[0.05em] uppercase px-1.5 py-0.5 rounded-md border shrink-0"
                        style={{
                          background: "var(--prv-g2)",
                          borderColor: "var(--prv-border-subtle)",
                          color: "var(--prv-text-3)",
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

// ── GlassSearchBar ─────────────────────────────────────────────────────────────

export interface GlassSearchBarProps {
  onOpen: () => void
  placeholder?: string
  className?: string
  style?: React.CSSProperties
}

export function GlassSearchBar({
  onOpen,
  placeholder = "Search employees, stores, documents…",
  className,
  style,
}: GlassSearchBarProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault()
        onOpen()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onOpen])

  return (
    <button
      onClick={onOpen}
      className={clsx(
        "flex items-center gap-2.5 px-[18px] py-[11px] rounded-full border text-left",
        "backdrop-blur-[48px] backdrop-saturate-[180%]",
        "transition-colors duration-200 focus-visible:outline-none",
        className
      )}
      style={{
        background: "var(--prv-g2)",
        borderColor: "var(--prv-border)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 var(--prv-g2-spec)",
        ...style,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--prv-g3)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--prv-g2)")}
      aria-label="Open search"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        style={{ color: "var(--prv-text-3)", flexShrink: 0 }}
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" x2="16.65" y1="21" y2="16.65" />
      </svg>
      <span className="flex-1 text-[15px] truncate" style={{ color: "var(--prv-text-4)" }}>
        {placeholder}
      </span>
      <kbd
        className="text-[11px] rounded-[5px] border px-[7px] py-[2px] shrink-0"
        style={{
          color: "var(--prv-text-4)",
          background: "var(--prv-g1)",
          borderColor: "var(--prv-border-subtle)",
        }}
      >
        ⌘F
      </kbd>
    </button>
  )
}
