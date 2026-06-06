import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassStatusDot } from "../components/glass-status-dot"
import { GlassShimmer } from "../components/glass-shimmer"

const meta: Meta = {
  title: "Glass Display/StatusShimmer",
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj

export const StatusDots: Story = {
  name: "Status Dots",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {(["online", "away", "busy", "offline"] as const).map((status) => (
          <GlassStatusDot key={status} status={status} label={status} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <GlassStatusDot status="online" pulse label="Live sync" />
        <GlassStatusDot status="busy" variant="pill" label="In meeting" />
        <GlassStatusDot status="away" pulse size="lg" label="Away" />
      </div>
    </div>
  ),
}

export const Shimmer: Story = {
  name: "Shimmer Loading",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 380 }}>
      <GlassShimmer variant="text" lines={3} />
      <GlassShimmer variant="card" height={120} />
      <GlassShimmer variant="circle" width={48} height={48} />
      <div style={{ display: "flex", gap: 8 }}>
        <GlassShimmer variant="rect" width={80} height={28} />
        <GlassShimmer variant="rect" width={60} height={28} />
        <GlassShimmer variant="rect" width={100} height={28} />
      </div>
      <GlassShimmer variant="list" lines={4} />
    </div>
  ),
}
