import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassTimeline, type TimelineEntry } from "../components/glass-timeline"

const meta: Meta<typeof GlassTimeline> = {
  title: "Glass Display/GlassTimeline",
  component: GlassTimeline,
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj<typeof GlassTimeline>

const ENTRIES: TimelineEntry[] = [
  {
    id: "1",
    type: "success",
    title: "Project #142 completed",
    description: "Bathroom remodel signed off by client",
    timestamp: "Today, 14:22",
    actor: { name: "Ion Popescu", initials: "IP" },
  },
  {
    id: "2",
    type: "warning",
    title: "Shift uncovered",
    description: "Field Ops · Thu 31 · 08:00–16:00",
    timestamp: "Today, 10:15",
  },
  {
    id: "3",
    type: "info",
    title: "New employee onboarded",
    description: "Elena Dragomir joined Field Ops",
    timestamp: "Yesterday, 09:00",
    actor: { name: "Ana Moldovan", initials: "AM" },
  },
  {
    id: "4",
    type: "info",
    title: "Inventory alert resolved",
    description: "Store #4 tiles restocked",
    timestamp: "Mon 28, 17:34",
  },
  {
    id: "5",
    type: "info",
    title: "Payroll processed",
    description: "42 employees · October 2024",
    timestamp: "Mon 28, 09:00",
    actor: { name: "Ana Moldovan", initials: "AM" },
  },
]

export const Default: Story = {
  name: "Audit Timeline",
  args: {
    entries: ENTRIES,
    onEntryClick: (id) => console.log("entry:", id),
  },
}

export const Compact: Story = {
  name: "Compact",
  args: {
    entries: ENTRIES,
    compact: true,
    maxVisible: 3,
    onEntryClick: (id) => console.log("entry:", id),
  },
}
