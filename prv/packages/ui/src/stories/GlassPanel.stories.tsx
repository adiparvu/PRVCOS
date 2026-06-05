import type { Meta, StoryObj } from "@storybook/react"
import { GlassPanel } from "../components/glass-panel"

const meta: Meta<typeof GlassPanel> = {
  title: "Glass Surfaces/GlassPanel",
  component: GlassPanel,
  argTypes: {
    variant: { control: "select", options: ["default", "elevated"] },
    noPadding: { control: "boolean" },
  },
  args: {
    variant: "default",
    noPadding: false,
  },
}

export default meta
type Story = StoryObj<typeof GlassPanel>

const SectionContent = ({ title, value }: { title: string; value: string }) => (
  <>
    <p
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--prv-text-3)",
        marginBottom: 6,
      }}
    >
      {title}
    </p>
    <p style={{ fontSize: 14, color: "var(--prv-text-1)" }}>{value}</p>
  </>
)

export const Default: Story = {
  name: "Default",
  render: (args) => (
    <GlassPanel {...args} style={{ maxWidth: 360 }}>
      <SectionContent title="Employee" value="Alexandru Popescu" />
    </GlassPanel>
  ),
}

export const Elevated: Story = {
  name: "Elevated",
  args: { variant: "elevated" },
  render: (args) => (
    <GlassPanel {...args} style={{ maxWidth: 360 }}>
      <SectionContent title="Role" value="Store Manager · SCOPE_STORE" />
    </GlassPanel>
  ),
}

export const InsideSheet: Story = {
  name: "Inside Sheet Context",
  render: () => (
    <div
      style={{
        background: "var(--prv-g2)",
        borderRadius: 28,
        padding: "20px 20px 24px",
        maxWidth: 400,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        border: "1px solid var(--prv-border)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 4,
          borderRadius: 2,
          background: "var(--prv-border-strong)",
          margin: "0 auto 8px",
        }}
      />
      <p style={{ fontSize: 17, fontWeight: 600, color: "var(--prv-text-1)", marginBottom: 4 }}>
        Edit Employee
      </p>
      <GlassPanel variant="default">
        <SectionContent title="Personal Info" value="Alexandru Popescu · Cluj-Napoca" />
      </GlassPanel>
      <GlassPanel variant="elevated">
        <SectionContent title="Role" value="SCOPE_STORE · store_manager" />
      </GlassPanel>
    </div>
  ),
}

export const BothVariants: Story = {
  name: "Default vs Elevated",
  render: () => (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <GlassPanel variant="default" style={{ minWidth: 200 }}>
        <SectionContent title="Default" value="Glass 1 · Subtle border" />
      </GlassPanel>
      <GlassPanel variant="elevated" style={{ minWidth: 200 }}>
        <SectionContent title="Elevated" value="Glass 2 · Standard border" />
      </GlassPanel>
    </div>
  ),
}
