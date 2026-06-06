"use client"

import { useState } from "react"
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

/**
 * Hosts the two People views. The Directory (search, A-Z, presence, peek) is the
 * existing working component; Org Chart is the new tree view. A segmented control
 * switches between them.
 */
export function PeopleViews({ companyId, initialStatusFilter = "" }: PeopleViewsProps) {
  const [view, setView] = useState<"directory" | "org">("directory")

  return (
    <div>
      <div className="px-4 mb-4">
        <GlassSegmentedControl
          fullWidth
          items={[
            { id: "directory", label: "Directory", icon: LIST_ICON },
            { id: "org", label: "Org Chart", icon: ORG_ICON },
          ]}
          activeId={view}
          onChange={(id) => setView(id as "directory" | "org")}
        />
      </div>

      {view === "directory" ? (
        <ContactsDirectory companyId={companyId} initialStatusFilter={initialStatusFilter} />
      ) : (
        <OrgChartView />
      )}
    </div>
  )
}
