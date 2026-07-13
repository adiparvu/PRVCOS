"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { SystemRole } from "@prv/auth"
import { useEntitySearch } from "@/components/command-palette/useEntitySearch"
import { resolveShell } from "@/lib/shell-config"

const SearchIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
)

const KbdIcon = () => (
  <span
    className="hidden sm:flex items-center gap-[2px] text-[10px] font-medium"
    style={{ color: "rgba(255,255,255,0.30)" }}
    aria-hidden="true"
  >
    <span
      className="flex items-center justify-center rounded-[4px] px-1 py-[1px]"
      style={{
        border: "1px solid rgba(255,255,255,0.15)",
        fontSize: "10px",
        lineHeight: "1.2",
        fontFamily: "system-ui",
      }}
    >
      ⌘K
    </span>
  </span>
)

interface FloatingSearchBarProps {
  role: SystemRole
}

export function FloatingSearchBar({ role }: FloatingSearchBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const router = useRouter()
  const { results, loading } = useEntitySearch(query)
  const { searchScopes } = resolveShell(role)

  const openSearch = useCallback(() => setIsOpen(true), [])
  const closeSearch = useCallback(() => {
    setIsOpen(false)
    setQuery("")
  }, [])

  // ⌘K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsOpen((v) => !v)
      }
      if (e.key === "Escape") {
        closeSearch()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [closeSearch])

  return (
    <>
      {/* Floating pill trigger — centers within content area, offset for sidebar on md+ */}
      <div
        className="fixed top-4 z-40 left-0 right-0 flex justify-center pointer-events-none"
        style={{
          paddingLeft: "var(--prv-sidebar-w, 0px)",
          transition: "padding-left 300ms cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <div style={{ width: "min(calc(100vw - 32px), 480px)", pointerEvents: "all" }}>
          <button
            type="button"
            onClick={openSearch}
            className="w-full flex items-center gap-3 px-4 py-[10px] rounded-[100px]"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              backdropFilter: "blur(32px) saturate(180%)",
              WebkitBackdropFilter: "blur(32px) saturate(180%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 32px rgba(0,0,0,0.4)",
              cursor: "text",
            }}
            aria-label="Open search"
          >
            <SearchIcon />
            <span
              className="flex-1 text-left text-sm font-normal"
              style={{ color: "rgba(255,255,255,0.32)" }}
            >
              Search
              {searchScopes.length > 0 ? ` ${searchScopes[0]}s, ${searchScopes[1] ?? ""}…` : "…"}
            </span>
            <KbdIcon />
          </button>
        </div>
      </div>

      {/* Full search overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(16px)" }}
            onClick={closeSearch}
            aria-hidden="true"
          />

          {/* Search panel — centers within content area, sidebar-aware */}
          <div
            className="fixed top-4 left-0 right-0 z-50 flex justify-center pointer-events-none"
            style={{
              paddingLeft: "var(--prv-sidebar-w, 0px)",
              transition: "padding-left 300ms cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            <div
              className="flex flex-col pointer-events-auto"
              style={{
                width: "min(calc(100vw - 32px), 600px)",
                maxHeight: "80vh",
              }}
            >
              {/* Input */}
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-t-[24px] rounded-b-[12px]"
                style={{
                  background: "rgba(28,28,30,0.92)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  backdropFilter: "blur(64px) saturate(220%)",
                  WebkitBackdropFilter: "blur(64px) saturate(220%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 32px 80px rgba(0,0,0,0.8)",
                }}
              >
                <SearchIcon />
                <input
                  autoFocus
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-30"
                  style={{ color: "rgba(255,255,255,0.95)" }}
                  aria-label="Search query"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="flex items-center justify-center w-5 h-5 rounded-full"
                    style={{
                      background: "rgba(255,255,255,0.15)",
                      color: "rgba(255,255,255,0.70)",
                      fontSize: "11px",
                      lineHeight: "1",
                    }}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeSearch}
                  className="text-xs font-medium ml-1"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  Cancel
                </button>
              </div>

              {/* Scope pills */}
              {searchScopes.length > 1 && (
                <div
                  className="mt-[2px] flex gap-2 overflow-x-auto px-4 py-2 rounded-[12px]"
                  style={{
                    background: "rgba(20,20,22,0.88)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(48px)",
                    WebkitBackdropFilter: "blur(48px)",
                    scrollbarWidth: "none",
                  }}
                  aria-label="Search scopes"
                >
                  {searchScopes.map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      className="flex-shrink-0 px-3 py-1 rounded-[100px] text-[11px] font-medium capitalize"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "rgba(255,255,255,0.60)",
                        transition: "background 200ms, color 200ms",
                      }}
                    >
                      {scope.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              )}

              {query.trim().length >= 2 && (
                <div
                  className="mt-[2px] rounded-[12px] overflow-hidden"
                  style={{
                    background: "rgba(20,20,22,0.88)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(48px)",
                    WebkitBackdropFilter: "blur(48px)",
                  }}
                >
                  {loading ? (
                    <div
                      className="px-4 py-8 text-center text-sm"
                      style={{ color: "rgba(255,255,255,0.30)" }}
                    >
                      Searching…
                    </div>
                  ) : results.length === 0 ? (
                    <div
                      className="px-4 py-10 text-center text-sm"
                      style={{ color: "rgba(255,255,255,0.30)" }}
                    >
                      No results
                    </div>
                  ) : (
                    results.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          closeSearch()
                          router.push(r.href)
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          width: "100%",
                          padding: "12px 16px",
                          background: "none",
                          border: "none",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "rgba(255,255,255,0.9)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {r.title}
                          </div>
                          {r.subtitle && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "rgba(255,255,255,0.45)",
                                marginTop: 1,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {r.subtitle}
                            </div>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            color: "rgba(255,255,255,0.45)",
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 5,
                            padding: "3px 7px",
                            flexShrink: 0,
                          }}
                        >
                          {r.entityType.replace(/_/g, " ")}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
