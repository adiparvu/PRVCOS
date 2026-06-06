import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassStatCard } from "../components/glass-stat-card"

const RevenueIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
)

const PeopleIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
)

const meta: Meta<typeof GlassStatCard> = {
  title: "Glass Display/GlassStatCard",
  component: GlassStatCard,
}

export default meta
type Story = StoryObj<typeof GlassStatCard>

export const Default: Story = {
  name: "Default",
  args: {
    value: "₊ 47.200 RON",
    label: "Revenue today",
    trend: { direction: "up", value: "+12.4%" },
    icon: <RevenueIcon />,
  },
}

export const TrendDown: Story = {
  name: "Trend Down",
  args: {
    value: "34",
    label: "Active projects",
    trend: { direction: "down", value: "-3" },
  },
}

export const Flat: Story = {
  name: "Flat Trend",
  args: {
    value: "99.8%",
    label: "Uptime",
    trend: { direction: "flat", value: "no change" },
  },
}

export const WithSparkline: Story = {
  name: "With Sparkline",
  args: {
    value: "1.248",
    label: "Monthly orders",
    trend: { direction: "up", value: "+8.2%" },
    sparkline: [40, 55, 48, 62, 70, 65, 80, 75, 88, 95, 92, 100],
  },
}

export const Wide: Story = {
  name: "Wide",
  args: {
    value: "₊ 284.750 RON",
    label: "Monthly revenue",
    trend: { direction: "up", value: "+22%" },
    sparkline: [50, 55, 70, 65, 80, 90, 85, 95, 100, 108, 115, 120],
    wide: true,
    icon: <RevenueIcon />,
  },
}

export const CEODashboard: Story = {
  name: "CEO Dashboard Grid",
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 12,
        maxWidth: 680,
      }}
    >
      <GlassStatCard
        value="₊ 47.200 RON"
        label="Revenue today"
        trend={{ direction: "up", value: "+12.4%" }}
        icon={<RevenueIcon />}
        sparkline={[40, 55, 48, 62, 70, 65, 80, 75, 88, 95, 92, 100]}
      />
      <GlassStatCard
        value="127"
        label="Active employees"
        trend={{ direction: "flat", value: "no change" }}
        icon={<PeopleIcon />}
      />
      <GlassStatCard
        value="34"
        label="Active projects"
        trend={{ direction: "down", value: "-2" }}
      />
      <GlassStatCard value="12" label="Pending invoices" trend={{ direction: "up", value: "+4" }} />
    </div>
  ),
}
