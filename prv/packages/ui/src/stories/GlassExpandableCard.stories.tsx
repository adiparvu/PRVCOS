import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassExpandableCard } from "../components/glass-expandable-card"

const meta: Meta<typeof GlassExpandableCard> = {
  title: "Glass Display/GlassExpandableCard",
  component: GlassExpandableCard,
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj<typeof GlassExpandableCard>

export const Default: Story = {
  name: "Default",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
      <GlassExpandableCard title="PRV Renovations" subtitle="32 active employees">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ color: "var(--prv-text-2)", fontSize: 13 }}>Revenue: €142,000 / month</p>
          <p style={{ color: "var(--prv-text-2)", fontSize: 13 }}>Active projects: 14</p>
          <p style={{ color: "var(--prv-text-2)", fontSize: 13 }}>Open tasks: 87</p>
        </div>
      </GlassExpandableCard>
      <GlassExpandableCard title="PRV Projects" subtitle="18 active employees">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ color: "var(--prv-text-2)", fontSize: 13 }}>Revenue: €89,000 / month</p>
          <p style={{ color: "var(--prv-text-2)", fontSize: 13 }}>Active projects: 8</p>
          <p style={{ color: "var(--prv-text-2)", fontSize: 13 }}>Open tasks: 43</p>
        </div>
      </GlassExpandableCard>
    </div>
  ),
}
