import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassSparkline } from "../components/glass-sparkline"
import { GlassGauge } from "../components/glass-gauge"
import { GlassFunnel } from "../components/glass-funnel"

const meta: Meta = {
  title: "Glass Charts/SparklineGaugeFunnel",
  parameters: { layout: "centered" },
}

export default meta
type Story = StoryObj

export const Sparklines: Story = {
  name: "Sparklines",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <p style={{ color: "var(--prv-text-2)", fontSize: 12, marginBottom: 8 }}>
          Revenue (uptrend)
        </p>
        <GlassSparkline data={[42, 45, 41, 49, 52, 58, 61, 67, 71, 68]} trend="up" width={200} />
      </div>
      <div>
        <p style={{ color: "var(--prv-text-2)", fontSize: 12, marginBottom: 8 }}>
          Incidents (downtrend)
        </p>
        <GlassSparkline data={[18, 16, 15, 14, 12, 11, 9, 8, 7, 6]} trend="down" width={200} />
      </div>
      <div>
        <p style={{ color: "var(--prv-text-2)", fontSize: 12, marginBottom: 8 }}>
          Occupancy (neutral)
        </p>
        <GlassSparkline
          data={[72, 74, 71, 73, 75, 72, 74, 76, 73, 75]}
          trend="neutral"
          width={200}
        />
      </div>
    </div>
  ),
}

export const Gauges: Story = {
  name: "Gauges",
  render: () => (
    <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
      <GlassGauge value={87} label="CPU" unit="%" size={120} />
      <GlassGauge
        value={43}
        label="Memory"
        unit="%"
        size={120}
        thresholds={{ good: 70, warn: 40 }}
      />
      <GlassGauge value={21} label="Disk" unit="%" size={120} thresholds={{ good: 60, warn: 30 }} />
    </div>
  ),
}

export const Funnel: Story = {
  name: "Sales Funnel",
  render: () => (
    <GlassFunnel
      stages={[
        { label: "Leads", value: 1240 },
        { label: "Qualified", value: 820 },
        { label: "Proposal", value: 430 },
        { label: "Negotiation", value: 195 },
        { label: "Closed Won", value: 87 },
      ]}
      showDropoff
    />
  ),
}
