import type { Meta, StoryObj } from "@storybook/react"
import { GlassBadge } from "../components/glass-badge"

const meta: Meta<typeof GlassBadge> = {
  title: "Feedback/GlassBadge",
  component: GlassBadge,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "success", "warning", "error", "info", "purple"],
    },
    dot: { control: "boolean" },
  },
  args: {
    variant: "default",
    dot: false,
    children: "Badge",
  },
}

export default meta
type Story = StoryObj<typeof GlassBadge>

export const Default: Story = { args: { variant: "default", children: "Default" } }
export const Success: Story = { args: { variant: "success", children: "Active", dot: true } }
export const Warning: Story = { args: { variant: "warning", children: "Pending", dot: true } }
export const Error: Story = { args: { variant: "error", children: "Inactive", dot: true } }
export const Info: Story = { args: { variant: "info", children: "Info" } }
export const Purple: Story = { args: { variant: "purple", children: "Premium" } }

export const AllVariants: Story = {
  name: "All Variants",
  render: () => (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <GlassBadge variant="default">Default</GlassBadge>
      <GlassBadge variant="success" dot>
        Active
      </GlassBadge>
      <GlassBadge variant="warning" dot>
        Pending
      </GlassBadge>
      <GlassBadge variant="error" dot>
        Inactive
      </GlassBadge>
      <GlassBadge variant="info">Info</GlassBadge>
      <GlassBadge variant="purple">Premium</GlassBadge>
    </div>
  ),
}

export const WithDots: Story = {
  name: "All Variants With Dots",
  render: () => (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {(["default", "success", "warning", "error", "info", "purple"] as const).map((v) => (
        <GlassBadge key={v} variant={v} dot>
          {v.charAt(0).toUpperCase() + v.slice(1)}
        </GlassBadge>
      ))}
    </div>
  ),
}
