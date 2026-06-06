import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassSpinner } from "../components/glass-spinner"

const meta: Meta<typeof GlassSpinner> = {
  title: "Glass Feedback/GlassSpinner",
  component: GlassSpinner,
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    variant: { control: "select", options: ["ring", "dots"] },
    accent: { control: "boolean" },
  },
  args: { size: "md", variant: "ring", accent: false },
}

export default meta
type Story = StoryObj<typeof GlassSpinner>

export const Ring: Story = {
  name: "Ring",
  args: { variant: "ring" },
}

export const Dots: Story = {
  name: "Dots",
  args: { variant: "dots" },
}

export const AllSizes: Story = {
  name: "All Sizes",
  render: () => (
    <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
      <GlassSpinner size="sm" />
      <GlassSpinner size="md" />
      <GlassSpinner size="lg" />
    </div>
  ),
}

export const WithLabel: Story = {
  name: "With Label",
  args: { label: "Loading…" },
}

export const FullPageLoader: Story = {
  name: "Full-page Loader Pattern",
  render: () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 240,
        gap: 16,
      }}
    >
      <GlassSpinner size="lg" />
      <p style={{ fontSize: 15, color: "var(--prv-text-2)" }}>Fetching records…</p>
    </div>
  ),
}
