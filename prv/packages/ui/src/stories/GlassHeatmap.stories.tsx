import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassHeatmap, type HeatmapValue } from "../components/glass-heatmap"

const meta: Meta<typeof GlassHeatmap> = {
  title: "Glass Charts/GlassHeatmap",
  component: GlassHeatmap,
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj<typeof GlassHeatmap>

function generateValues(weeks = 26): HeatmapValue[] {
  const values: HeatmapValue[] = []
  const today = new Date()
  for (let i = weeks * 7; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const count = Math.random() < 0.3 ? 0 : Math.floor(Math.random() * 12)
    values.push({ date: d.toISOString().split("T")[0]!, count })
  }
  return values
}

export const Default: Story = {
  name: "Attendance Heatmap",
  render: () => <GlassHeatmap values={generateValues()} weeks={26} showLegend />,
}

export const Compact: Story = {
  name: "Compact (13 weeks)",
  render: () => <GlassHeatmap values={generateValues(13)} weeks={13} cellSize={10} gap={3} />,
}
