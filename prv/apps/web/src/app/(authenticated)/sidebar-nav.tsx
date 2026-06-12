"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import type { SystemRole } from "@prv/auth"
import { resolveShell } from "@/lib/shell-config"

interface SidebarNavProps {
  role: SystemRole
  companyName?: string
}

export function SidebarNav({ role, companyName = "PRV" }: SidebarNavProps) {
  const pathname = usePathname()
  const { tabs, diLabel } = resolveShell(role)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-40 hidden md:flex flex-col"
      style={{
        width: collapsed ? 68 : 220,
        transition: "width 300ms cubic-bezier(0.34,1.56,0.64,1)",
        background: "rgba(8,8,10,0.85)",
        backdropFilter: "blur(48px) saturate(200%)",
        WebkitBackdropFilter: "blur(48px) saturate(200%)",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "inset -1px 0 0 rgba(255,255,255,0.04), 4px 0 32px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center px-3 pt-4 pb-3 mb-1"
        style={{ minHeight: 64, borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Logo mark */}
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-[14px]"
          style={{
            width: 38,
            height: 38,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L3 7v5c0 5.25 3.75 10.14 9 11.25C17.25 22.14 21 17.25 21 12V7l-9-5z"
              stroke="rgba(255,255,255,0.90)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {!collapsed && (
          <div className="ml-3 min-w-0 flex-1">
            <p
              className="text-[13px] font-bold tracking-tight truncate"
              style={{ color: "rgba(255,255,255,0.90)", letterSpacing: "-0.3px" }}
            >
              {companyName}
            </p>
            <p
              className="text-[10px] font-medium uppercase tracking-widest truncate"
              style={{ color: "rgba(255,255,255,0.30)" }}
            >
              {diLabel}
            </p>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex-shrink-0 flex items-center justify-center rounded-[8px] ml-auto"
          style={{
            width: 28,
            height: 28,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.35)",
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            style={{
              transform: collapsed ? "rotate(180deg)" : "none",
              transition: "transform 300ms cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-2 flex flex-col gap-[2px]" aria-label="Sidebar navigation">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/")

          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className="relative flex items-center rounded-[12px] overflow-hidden"
              style={{
                height: 44,
                padding: collapsed ? "0 13px" : "0 12px",
                gap: 10,
                color: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.40)",
                background: isActive ? "rgba(255,255,255,0.10)" : "transparent",
                boxShadow: isActive ? "inset 0 1px 0 rgba(255,255,255,0.14)" : "none",
                border: isActive ? "1px solid rgba(255,255,255,0.10)" : "1px solid transparent",
                transition:
                  "color 200ms ease, background 200ms ease, box-shadow 200ms ease, border-color 200ms ease",
                justifyContent: collapsed ? "center" : "flex-start",
              }}
            >
              <span className="flex-shrink-0" style={{ width: 22, height: 22 }}>
                {tab.icon}
              </span>
              {!collapsed && (
                <span
                  className="text-[13px] font-medium tracking-tight truncate"
                  style={{ letterSpacing: "-0.2px" }}
                >
                  {tab.label}
                </span>
              )}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
                  style={{
                    height: 20,
                    background: "rgba(255,255,255,0.70)",
                    boxShadow: "0 0 8px rgba(255,255,255,0.4)",
                  }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer — version / user hint */}
      {!collapsed && (
        <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p
            className="text-[10px] font-medium uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.18)" }}
          >
            PRV OS · 2026
          </p>
        </div>
      )}
    </aside>
  )
}
