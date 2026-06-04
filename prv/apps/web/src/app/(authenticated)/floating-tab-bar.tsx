"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { SystemRole } from "@prv/auth"

// SF Symbol-style SVG icons — stroke-width 1.6, round caps
const CommandIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="6" height="6" rx="1" />
    <path d="M9 9V6a3 3 0 1 0-3 3h3" />
    <path d="M15 9h3a3 3 0 1 0-3-3v3" />
    <path d="M9 15H6a3 3 0 1 0 3 3v-3" />
    <path d="M15 15v3a3 3 0 1 0 3-3h-3" />
  </svg>
)

const OperationsIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
)

const PeopleIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="9" cy="7" r="3" />
    <path d="M3 20v-1a6 6 0 0 1 6-6" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M13 20v-1a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v1" />
  </svg>
)

const FinanceIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 20h18" />
    <path d="M5 20V10l4-4 4 4 4-6v16" />
  </svg>
)

const IntelligenceIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2a6 6 0 0 1 6 6c0 2.5-1.5 4.7-3.7 5.7L14 16H10l-.3-2.3A6.01 6.01 0 0 1 6 8a6 6 0 0 1 6-6z" />
    <path d="M10 19h4" />
    <path d="M11 22h2" />
  </svg>
)

const tabs = [
  { href: "/dashboard", label: "Command", Icon: CommandIcon },
  { href: "/operations", label: "Operations", Icon: OperationsIcon },
  { href: "/people", label: "People", Icon: PeopleIcon },
  { href: "/finance", label: "Finance", Icon: FinanceIcon },
  { href: "/intelligence", label: "Intelligence", Icon: IntelligenceIcon },
]

export function FloatingTabBar({ role }: { role: SystemRole }) {
  const pathname = usePathname()

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
      style={{ width: "min(calc(100vw - 32px), 480px)" }}
    >
      <nav
        className="flex items-center justify-around px-2 py-2 rounded-[28px]"
        style={{
          background: "rgba(255,255,255,0.09)",
          border: "1px solid rgba(255,255,255,0.13)",
          backdropFilter: "blur(48px)",
          WebkitBackdropFilter: "blur(48px)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.20), 0 24px 64px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.4)",
        }}
        aria-label="Main navigation"
      >
        {tabs.map(({ href, label, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className="relative flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-[20px] transition-all duration-200"
              style={{
                color: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.35)",
                background: isActive ? "rgba(255,255,255,0.10)" : "transparent",
              }}
            >
              <Icon />
              <span className="text-[10px] font-medium tracking-tight leading-none">{label}</span>
              {isActive && (
                <span
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/70"
                  aria-hidden="true"
                />
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
