import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import {
  GlassScheduler,
  type SchedulerDay,
  type SchedulerShift,
} from "../components/glass-scheduler"
import { GlassShiftCard, type ShiftAssignee, type ShiftMeta } from "../components/glass-shift-card"

const meta: Meta = {
  title: "Glass Display/Scheduler",
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj

const DAYS: SchedulerDay[] = [
  { label: "Mon 28" },
  { label: "Tue 29" },
  { label: "Wed 30" },
  { label: "Thu 31" },
  { label: "Fri 01" },
]

const SHIFTS: SchedulerShift[] = [
  { id: "s1", day: 0, start: 8, end: 16, label: "Ion Popescu", color: "rgba(10,132,255,0.7)" },
  { id: "s2", day: 0, start: 10, end: 18, label: "Ana Moldovan", color: "rgba(48,209,88,0.7)" },
  { id: "s3", day: 1, start: 8, end: 14, label: "Gheorghe Vasile", color: "rgba(255,149,0,0.7)" },
  { id: "s4", day: 2, start: 12, end: 18, label: "Bogdan Costea", color: "rgba(10,132,255,0.7)" },
  { id: "s5", day: 3, start: 8, end: 16, label: "Elena Dragomir", color: "rgba(48,209,88,0.7)" },
]

export const WeekScheduler: Story = {
  name: "Week Scheduler",
  render: () => (
    <GlassScheduler
      days={DAYS}
      shifts={SHIFTS}
      startHour={8}
      endHour={18}
      onShiftClick={(shift) => console.log("shift:", shift.label)}
    />
  ),
}

const ASSIGNEES_A: ShiftAssignee[] = [{ initials: "IP" }, { initials: "BC" }]
const ASSIGNEES_B: ShiftAssignee[] = [{ initials: "LM" }]
const META_A: ShiftMeta[] = [{ label: "Store #1" }, { label: "Field Ops A" }]
const META_B: ShiftMeta[] = [{ label: "Store #4 — Piata Unirii" }]

export const ShiftCards: Story = {
  name: "Shift Cards",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 340 }}>
      <GlassShiftCard
        role="Field Operator"
        time="08:00 – 16:00"
        duration="8h"
        status="confirmed"
        assignees={ASSIGNEES_A}
        meta={META_A}
        onClick={() => console.log("view shift")}
      />
      <GlassShiftCard
        role="Store Manager"
        time="10:00 – 18:00"
        duration="8h"
        status="open"
        assignees={ASSIGNEES_B}
        meta={META_B}
      />
    </div>
  ),
}
