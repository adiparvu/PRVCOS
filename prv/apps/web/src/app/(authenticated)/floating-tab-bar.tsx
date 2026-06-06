"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { SystemRole } from "@prv/auth"
import { resolveShell } from "@/lib/shell-config"

export function FloatingTabBar({ role }: { role: SystemRole }) {
  const pathname = usePathname()
  const { tabs } = resolveShell(role)

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
      style={{ width: "min(calc(100vw - 32px), 480px)" }}
    >
      <nav
        className="flex items-center justify-around px-2 py-2 rounded-[32px]"
        style={{
          background: "rgba(20,20,20,0.82)",
          border: "1px solid rgba(255,255,255,0.10)",
          backdropFilter: "blur(48px) saturate(200%)",
          WebkitBackdropFilter: "blur(48px) saturate(200%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.14), 0 24px 64px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.4)",
        }}
        aria-label="Main navigation"
      >
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/")
          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className="relative flex flex-col items-center justify-center gap-[3px] min-w-[56px] h-14 px-2 rounded-[24px]"
              style={{
                color: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.40)",
                background: isActive ? "rgba(255,255,255,0.10)" : "transparent",
                boxShadow: isActive ? "inset 0 1px 0 rgba(255,255,255,0.18)" : "none",
                transition:
                  "color 300ms cubic-bezier(0.34,1.56,0.64,1), background 300ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 300ms cubic-bezier(0.34,1.56,0.64,1)",
              }}
            >
              {tab.icon}
              <span
                className="text-[9px] font-medium tracking-tight leading-none whitespace-nowrap"
                style={{ opacity: isActive ? 0.9 : 0.5 }}
              >
                {tab.label}
              </span>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-[18px] h-[3px] rounded-full"
                  style={{
                    background: "rgba(255,255,255,0.65)",
                    boxShadow: "0 0 6px rgba(255,255,255,0.5)",
                  }}
                />
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
