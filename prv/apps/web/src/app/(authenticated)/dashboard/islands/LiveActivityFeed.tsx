"use client"

import { GlassTimeline } from "@prv/ui"
import type { TimelineEntry } from "@prv/ui"
import { useActivityFeed } from "@/hooks/realtime"
import type { ActivityEventPayload } from "@prv/cache"
import { GlassCard, SectionLabel } from "../_shared"

function toEntry(e: ActivityEventPayload): TimelineEntry {
  return {
    id: e.id,
    type: e.type,
    title: e.title,
    description: e.description,
    timestamp: e.timestamp,
  }
}

interface Props {
  initialEntries: ActivityEventPayload[]
  companyId: string
}

export function LiveActivityFeed({ initialEntries, companyId }: Props) {
  const entries = useActivityFeed(initialEntries, companyId)

  return (
    <GlassCard>
      <SectionLabel>Recent Activity</SectionLabel>
      <GlassTimeline entries={entries.map(toEntry)} compact />
    </GlassCard>
  )
}
