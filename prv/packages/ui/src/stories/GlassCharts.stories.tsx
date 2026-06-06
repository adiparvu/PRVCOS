import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassAreaChart } from "../components/glass-area-chart"
import { GlassBarChart } from "../components/glass-bar-chart"
import { GlassLineChart } from "../components/glass-line-chart"
import { GlassDonutChart } from "../components/glass-donut-chart"
import { GlassRadarChart } from "../components/glass-radar-chart"

const meta: Meta = {
  title: "Glass Charts/Overview",
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]

export const AreaChart: Story = {
  name: "Area Chart",
  render: () => (
    <GlassAreaChart
      title="Revenue & Expenses"
      subtitle="Last 6 months"
      labels={MONTHS}
      series={[
        { label: "Revenue", data: [42000, 51000, 47000, 63000, 71000, 68000] },
        { label: "Expenses", data: [28000, 31000, 29000, 35000, 38000, 41000] },
      ]}
      height={260}
    />
  ),
}

export const BarChart: Story = {
  name: "Bar Chart",
  render: () => (
    <GlassBarChart
      title="New Employees per Month"
      subtitle="Hiring pipeline"
      labels={MONTHS}
      series={[
        { label: "Hired", data: [4, 7, 3, 9, 5, 11] },
        { label: "Departed", data: [1, 2, 1, 3, 2, 1] },
      ]}
      showValues
      height={260}
    />
  ),
}

export const LineChart: Story = {
  name: "Line Chart",
  render: () => (
    <GlassLineChart
      title="Active Projects"
      subtitle="Running count"
      labels={MONTHS}
      series={[
        { label: "Renovation", data: [12, 14, 13, 17, 19, 22] },
        { label: "Projects", data: [5, 6, 8, 7, 9, 10] },
      ]}
      showDots
      showGrid
      height={260}
    />
  ),
}

export const DonutChart: Story = {
  name: "Donut Chart",
  render: () => (
    <GlassDonutChart
      title="Workforce by Department"
      centerLabel="Total"
      centerValue="247"
      segments={[
        { label: "Field Ops", value: 98 },
        { label: "Projects", value: 64 },
        { label: "Admin", value: 35 },
        { label: "Sales", value: 28 },
        { label: "IT", value: 22 },
      ]}
      size={200}
    />
  ),
}

export const RadarChart: Story = {
  name: "Radar Chart",
  render: () => (
    <GlassRadarChart
      axes={["Speed", "Quality", "Safety", "Cost", "Satisfaction"]}
      series={[
        {
          label: "Q4 2024",
          values: [0.82, 0.91, 0.78, 0.65, 0.88],
          color: "rgba(255,255,255,0.9)",
        },
        { label: "Q3 2024", values: [0.74, 0.85, 0.72, 0.7, 0.8], color: "rgba(255,255,255,0.4)" },
      ]}
      size={280}
    />
  ),
}
