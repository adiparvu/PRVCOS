import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassCalendar, type DateRange } from "../components/glass-calendar"

const meta: Meta<typeof GlassCalendar> = {
  title: "Glass Forms/GlassCalendar",
  component: GlassCalendar,
  parameters: { layout: "centered" },
}

export default meta
type Story = StoryObj<typeof GlassCalendar>

export const SingleSelect: Story = {
  name: "Single Date",
  render: () => {
    const [val, setVal] = useState<string | null>(null)
    return (
      <GlassCalendar
        mode="single"
        value={val}
        onChange={(v) => setVal(v as string | null)}
        events={["2024-10-15", "2024-10-22", "2024-10-28"]}
      />
    )
  },
}

export const RangeSelect: Story = {
  name: "Date Range",
  render: () => {
    const [val, setVal] = useState<DateRange | null>(null)
    return (
      <GlassCalendar mode="range" value={val} onChange={(v) => setVal(v as DateRange | null)} />
    )
  },
}
