import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassEmptyState } from "../components/glass-empty-state"

const BoxIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
)

const PeopleIcon = () => (
  <svg
    width="28"
    height="28"
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

const meta: Meta<typeof GlassEmptyState> = {
  title: "Glass Feedback/GlassEmptyState",
  component: GlassEmptyState,
  argTypes: {
    compact: { control: "boolean" },
  },
}

export default meta
type Story = StoryObj<typeof GlassEmptyState>

export const Default: Story = {
  name: "Default",
  args: {
    title: "No records found",
    description: "When records are created they will appear here.",
    icon: <BoxIcon />,
  },
}

export const WithAction: Story = {
  name: "With Action",
  render: () => (
    <GlassEmptyState
      title="No employees yet"
      description="Invite your first team member to get started."
      icon={<PeopleIcon />}
      action={{ label: "Invite employee", onClick: () => {} }}
    />
  ),
}

export const Compact: Story = {
  name: "Compact",
  render: () => (
    <GlassEmptyState compact title="No results" description="Try adjusting your search filters." />
  ),
}

export const NoDescription: Story = {
  name: "No Description",
  args: {
    title: "Nothing here yet",
    icon: <BoxIcon />,
  },
}
