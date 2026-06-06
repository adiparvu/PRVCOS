"use client"

import { useState } from "react"
import Link from "next/link"
import { GlassSegmentedControl } from "@prv/ui"
import { ContactsDirectory } from "./ContactsDirectory"
import { OrgChartView } from "./OrgChartView"

interface PeopleViewsProps {
  companyId: string
  initialStatusFilter?: string
}

const LIST_ICON = (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <circle cx="3.5" cy="6" r="1" />
    <circle cx="3.5" cy="12" r="1" />
    <circle cx="3.5" cy="18" r="1" />
  </svg>
)

const ORG_ICON = (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <rect x="9" y="2" width="6" height="6" rx="1" />
    <rect x="3" y="16" width="6" height="6" rx="1" />
    <rect x="15" y="16" width="6" height="6" rx="1" />
    <path d="M12 8v4M6 16v-2h12v2" />
  </svg>
)

const HR_ICON = (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const HR_TILES = [
  {
    label: "Time-Off",
    detail: "3 pending",
    badge: "3",
    href: "/people/time-off",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: "Payroll",
    detail: "Jun · on track",
    badge: null,
    href: "/people/payroll",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    label: "Attendance",
    detail: "Today · 18/24",
    badge: null,
    href: "/people/attendance",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    label: "Performance",
    detail: "Q2 reviews",
    badge: null,
    href: "/people/performance",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
]

function HRView() {
  return (
    <div style={{ padding: "0 16px 100px" }}>
      {/* KPI strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Total Staff", value: "24" },
          { label: "On Leave", value: "2" },
          { label: "Open Roles", value: "3" },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              borderRadius: 16,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
              padding: "14px 12px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "var(--prv-text-1)",
                margin: "0 0 2px",
                letterSpacing: -0.5,
              }}
            >
              {value}
            </p>
            <p
              style={{
                fontSize: 11,
                color: "var(--prv-text-4)",
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                fontWeight: 600,
              }}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Action tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {HR_TILES.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              borderRadius: 20,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
              padding: "16px",
              textDecoration: "none",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "var(--prv-g2)",
                border: "1px solid var(--prv-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--prv-text-2)",
                marginBottom: 12,
              }}
            >
              {tile.icon}
            </div>
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--prv-text-1)",
                margin: "0 0 3px",
              }}
            >
              {tile.label}
            </p>
            <p style={{ fontSize: 12, color: "var(--prv-text-3)", margin: 0 }}>{tile.detail}</p>
            {tile.badge && (
              <div
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  width: 22,
                  height: 22,
                  borderRadius: 100,
                  background: "rgba(255,255,255,0.9)",
                  color: "#000",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {tile.badge}
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Upcoming leaves */}
      <div style={{ marginTop: 20 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--prv-text-3)",
            margin: "0 0 10px",
            textTransform: "uppercase",
            letterSpacing: 0.7,
          }}
        >
          Upcoming Leaves
        </p>
        {[
          { name: "Elena Badea", initials: "EB", period: "Jun 9–10", type: "Sick Leave" },
          { name: "George Stoica", initials: "GS", period: "Jun 12", type: "Personal Day" },
          { name: "Mihai Popescu", initials: "MP", period: "Jun 16–20", type: "Annual Leave" },
        ].map((leave) => (
          <div
            key={leave.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              borderRadius: 16,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "var(--prv-g3)",
                border: "1px solid var(--prv-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--prv-text-1)",
                flexShrink: 0,
              }}
            >
              {leave.initials}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--prv-text-1)", margin: 0 }}>
                {leave.name}
              </p>
              <p style={{ fontSize: 12, color: "var(--prv-text-3)", margin: "1px 0 0" }}>
                {leave.type} · {leave.period}
              </p>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ color: "var(--prv-text-4)", flexShrink: 0 }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PeopleViews({ companyId, initialStatusFilter = "" }: PeopleViewsProps) {
  const [view, setView] = useState<"directory" | "org" | "hr">("directory")

  return (
    <div>
      <div className="px-4 mb-4">
        <GlassSegmentedControl
          fullWidth
          items={[
            { id: "directory", label: "Directory", icon: LIST_ICON },
            { id: "org", label: "Org Chart", icon: ORG_ICON },
            { id: "hr", label: "HR", icon: HR_ICON },
          ]}
          activeId={view}
          onChange={(id) => setView(id as "directory" | "org" | "hr")}
        />
      </div>

      {view === "directory" ? (
        <ContactsDirectory companyId={companyId} initialStatusFilter={initialStatusFilter} />
      ) : view === "org" ? (
        <OrgChartView />
      ) : (
        <HRView />
      )}
    </div>
  )
}
