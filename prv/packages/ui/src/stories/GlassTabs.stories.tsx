import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassTabs } from "../components/glass-tabs"

const meta: Meta<typeof GlassTabs> = {
  title: "Glass Navigation/GlassTabs",
  component: GlassTabs,
  argTypes: {
    variant: { control: "select", options: ["pill", "underline"] },
    animated: { control: "boolean" },
  },
  args: { variant: "pill", animated: true },
}

export default meta
type Story = StoryObj<typeof GlassTabs>

export const Pill: Story = {
  name: "Pill Variant",
  args: {
    variant: "pill",
    tabs: [
      {
        value: "overview",
        label: "Overview",
        content: <p style={{ color: "var(--prv-text-2)", padding: "20px 0" }}>Overview content</p>,
      },
      {
        value: "details",
        label: "Details",
        content: <p style={{ color: "var(--prv-text-2)", padding: "20px 0" }}>Details content</p>,
      },
      {
        value: "history",
        label: "History",
        content: <p style={{ color: "var(--prv-text-2)", padding: "20px 0" }}>History content</p>,
      },
    ],
    defaultValue: "overview",
  },
}

export const Underline: Story = {
  name: "Underline Variant",
  args: {
    variant: "underline",
    tabs: [
      { value: "employees", label: "Employees", badge: 48 },
      { value: "pending", label: "Pending", badge: 3 },
      { value: "archived", label: "Archived" },
    ],
    defaultValue: "employees",
  },
}

export const WithBadges: Story = {
  name: "With Badges",
  args: {
    tabs: [
      { value: "all", label: "All", badge: 127 },
      { value: "active", label: "Active", badge: 84 },
      { value: "onleave", label: "On leave", badge: 12 },
      { value: "inactive", label: "Inactive", badge: 31 },
    ],
    defaultValue: "all",
  },
}
