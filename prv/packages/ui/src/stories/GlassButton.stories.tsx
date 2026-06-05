import type { Meta, StoryObj } from "@storybook/react"
import { GlassButton } from "../components/glass-button"

const meta: Meta<typeof GlassButton> = {
  title: "Glass Surfaces/GlassButton",
  component: GlassButton,
  argTypes: {
    variant: { control: "select", options: ["primary", "ghost", "glass", "destructive"] },
    size: { control: "select", options: ["sm", "md", "lg"] },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    variant: "glass",
    size: "md",
    loading: false,
    disabled: false,
    children: "Button",
  },
}

export default meta
type Story = StoryObj<typeof GlassButton>

export const Primary: Story = {
  name: "Primary",
  args: { variant: "primary", children: "Save Changes" },
}

export const Glass: Story = {
  name: "Glass",
  args: { variant: "glass", children: "View Report" },
}

export const Ghost: Story = {
  name: "Ghost",
  args: { variant: "ghost", children: "Cancel" },
}

export const Destructive: Story = {
  name: "Destructive",
  args: { variant: "destructive", children: "Delete Record" },
}

export const Loading: Story = {
  name: "Loading State",
  args: { loading: true, children: "Saving…" },
}

export const Disabled: Story = {
  name: "Disabled",
  args: { disabled: true, children: "Unavailable" },
}

export const AllVariants: Story = {
  name: "All Variants",
  render: () => (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <GlassButton variant="primary">Primary</GlassButton>
      <GlassButton variant="glass">Glass</GlassButton>
      <GlassButton variant="ghost">Ghost</GlassButton>
      <GlassButton variant="destructive">Destructive</GlassButton>
    </div>
  ),
}

export const AllSizes: Story = {
  name: "All Sizes",
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <GlassButton size="sm">Small</GlassButton>
      <GlassButton size="md">Medium</GlassButton>
      <GlassButton size="lg">Large</GlassButton>
    </div>
  ),
}
