"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type { PortalSessionContext } from "@/lib/portal-auth"

interface PortalNavProps {
  session: PortalSessionContext
}

const NAV_ITEMS = [
  { href: "/portal/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/portal/projects", label: "Projects", icon: FolderIcon },
  { href: "/portal/invoices", label: "Invoices", icon: InvoiceIcon },
  { href: "/portal/documents", label: "Documents", icon: DocIcon },
]

export function PortalNav({ session }: PortalNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch("/api/portal/auth/logout", { method: "POST" })
    router.replace("/portal/login")
  }

  return (
    <>
      {/* Top bar */}
      <header
        className="fixed inset-x-0 top-0 z-50 mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"
        style={{
          backdropFilter: "blur(48px)",
          WebkitBackdropFilter: "blur(48px)",
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-base font-bold tracking-tight text-white/95"
            style={{ letterSpacing: "-0.04em" }}
          >
            PRV
          </span>
          <div className="h-4 w-px" style={{ background: "rgba(255,255,255,0.12)" }} />
          <span className="text-sm text-white/40">Client Portal</span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 rounded-full px-3 py-1.5"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white/80"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              {session.name.slice(0, 1).toUpperCase()}
            </div>
            <span className="hidden text-xs text-white/60 sm:block">{session.name}</span>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-full px-3 py-1.5 text-xs text-white/35 transition-colors hover:text-white/60"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Floating bottom tab bar */}
      <nav
        className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-[100px] px-2 py-2"
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow:
            "0 24px 64px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.14)",
          backdropFilter: "blur(48px)",
          WebkitBackdropFilter: "blur(48px)",
        }}
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 rounded-[100px] px-4 py-2 transition-all"
              style={{
                background: active ? "rgba(255,255,255,0.12)" : "transparent",
                color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.40)",
              }}
            >
              <Icon size={18} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}

function HomeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 21V12h6v9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FolderIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function InvoiceIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="14 2 14 8 20 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="16"
        y1="13"
        x2="8"
        y2="13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="17"
        x2="8"
        y2="17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <polyline
        points="10 9 9 9 8 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function DocIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="13 2 13 9 20 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
