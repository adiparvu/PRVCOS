import type { Meta, StoryObj } from "@storybook/react"
import { GlassCard } from "../components/glass-card"

const meta: Meta<typeof GlassCard> = {
  title: "Glass Surfaces/GlassCard",
  component: GlassCard,
  argTypes: {
    level: { control: { type: "select" }, options: [1, 2, 3, 4] },
    specular: { control: "boolean" },
    borderless: { control: "boolean" },
    flat: { control: "boolean" },
  },
  args: {
    level: 1,
    specular: true,
    borderless: false,
    flat: false,
  },
}

export default meta
type Story = StoryObj<typeof GlassCard>

const CardContent = () => (
  <div style={{ padding: 24 }}>
    <p style={{ fontSize: 15, fontWeight: 600, color: "var(--prv-text-1)", marginBottom: 6 }}>
      Card title
    </p>
    <p style={{ fontSize: 13, color: "var(--prv-text-2)" }}>
      Secondary information rendered inside this glass card component.
    </p>
  </div>
)

export const Level1: Story = {
  name: "Level 1 · Cards",
  args: { level: 1 },
  render: (args) => (
    <GlassCard {...args} style={{ maxWidth: 340 }}>
      <CardContent />
    </GlassCard>
  ),
}

export const Level2: Story = {
  name: "Level 2 · Menus",
  args: { level: 2 },
  render: (args) => (
    <GlassCard {...args} style={{ maxWidth: 340 }}>
      <CardContent />
    </GlassCard>
  ),
}

export const Level3: Story = {
  name: "Level 3 · Modals",
  args: { level: 3 },
  render: (args) => (
    <GlassCard {...args} style={{ maxWidth: 340 }}>
      <CardContent />
    </GlassCard>
  ),
}

export const Level4: Story = {
  name: "Level 4 · Critical",
  args: { level: 4 },
  render: (args) => (
    <GlassCard {...args} style={{ maxWidth: 340 }}>
      <CardContent />
    </GlassCard>
  ),
}

export const AllLevels: Story = {
  name: "All Levels · Side by Side",
  render: () => (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      {([1, 2, 3, 4] as const).map((level) => (
        <GlassCard key={level} level={level} style={{ width: 200 }}>
          <div style={{ padding: 20 }}>
            <p style={{ fontSize: 12, color: "var(--prv-text-3)", marginBottom: 6 }}>
              Glass {level}
            </p>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--prv-text-1)" }}>
              Level {level}
            </p>
          </div>
        </GlassCard>
      ))}
    </div>
  ),
}

export const Flat: Story = {
  name: "Flat · No Shadow",
  args: { flat: true },
  render: (args) => (
    <GlassCard {...args} style={{ maxWidth: 340 }}>
      <CardContent />
    </GlassCard>
  ),
}

export const Borderless: Story = {
  name: "Borderless",
  args: { borderless: true },
  render: (args) => (
    <GlassCard {...args} style={{ maxWidth: 340 }}>
      <CardContent />
    </GlassCard>
  ),
}
