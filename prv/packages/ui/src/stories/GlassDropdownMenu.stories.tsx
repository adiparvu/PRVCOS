import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassDropdownMenu } from "../components/glass-dropdown-menu"
import { GlassButton } from "../components/glass-button"

const EditIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const TrashIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
)

const meta: Meta = {
  title: "Glass Overlay/GlassDropdownMenu",
  parameters: { layout: "centered" },
}

export default meta
type Story = StoryObj

export const Default: Story = {
  name: "Default",
  render: () => (
    <GlassDropdownMenu
      trigger={<GlassButton variant="glass">Options ▾</GlassButton>}
      sections={[
        {
          items: [
            { id: "edit", label: "Edit", icon: <EditIcon /> },
            { id: "duplicate", label: "Duplicate", meta: "⌘D" },
            { id: "share", label: "Share…" },
          ],
        },
        {
          label: "Danger zone",
          items: [
            { id: "archive", label: "Archive", danger: false },
            { id: "delete", label: "Delete", icon: <TrashIcon />, danger: true },
          ],
        },
      ]}
      onSelect={(id) => console.log("selected:", id)}
    />
  ),
}

export const WithCheckmarks: Story = {
  name: "With Checkmarks",
  render: () => (
    <GlassDropdownMenu
      trigger={<GlassButton variant="glass">Filter ▾</GlassButton>}
      sections={[
        {
          label: "Status",
          items: [
            { id: "active", label: "Active", checked: true },
            { id: "pending", label: "Pending", checked: false },
            { id: "archived", label: "Archived", checked: true },
          ],
        },
      ]}
      onSelect={(id) => console.log("selected:", id)}
    />
  ),
}

export const Disabled: Story = {
  name: "With Disabled Item",
  render: () => (
    <GlassDropdownMenu
      trigger={<GlassButton variant="glass">Actions ▾</GlassButton>}
      sections={[
        {
          items: [
            { id: "view", label: "View details" },
            { id: "export", label: "Export data", disabled: true, meta: "No permission" },
            { id: "delete", label: "Delete", danger: true },
          ],
        },
      ]}
      onSelect={(id) => console.log("selected:", id)}
    />
  ),
}
