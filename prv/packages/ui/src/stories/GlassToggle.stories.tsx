import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassToggle } from "../components/glass-toggle"

const meta: Meta<typeof GlassToggle> = {
  title: "Glass Forms/GlassToggle",
  component: GlassToggle,
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    disabled: { control: "boolean" },
    checked: { control: "boolean" },
  },
  args: { checked: false, size: "md", disabled: false },
}

export default meta
type Story = StoryObj<typeof GlassToggle>

export const Default: Story = {
  name: "Default",
  render: (args) => {
    const [checked, setChecked] = useState(args.checked ?? false)
    return <GlassToggle {...args} checked={checked} onChange={setChecked} />
  },
}

export const WithLabel: Story = {
  name: "With Label",
  render: () => {
    const [checked, setChecked] = useState(false)
    return (
      <GlassToggle
        checked={checked}
        onChange={setChecked}
        label="Enable notifications"
        description="Receive alerts when something requires attention"
      />
    )
  },
}

export const AllSizes: Story = {
  name: "All Sizes",
  render: () => {
    const [vals, setVals] = useState({ sm: true, md: true, lg: true })
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {(["sm", "md", "lg"] as const).map((size) => (
          <GlassToggle
            key={size}
            size={size}
            checked={vals[size]}
            onChange={(v) => setVals((p) => ({ ...p, [size]: v }))}
            label={`Size: ${size}`}
          />
        ))}
      </div>
    )
  },
}

export const Disabled: Story = {
  name: "Disabled",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <GlassToggle checked={true} onChange={() => {}} disabled label="Enabled (disabled)" />
      <GlassToggle checked={false} onChange={() => {}} disabled label="Disabled (disabled)" />
    </div>
  ),
}

export const SettingsList: Story = {
  name: "Settings List",
  render: () => {
    const [vals, setVals] = useState({
      mfa: true,
      sessions: false,
      audit: true,
      notifications: false,
    })
    const toggle = (k: keyof typeof vals) => setVals((p) => ({ ...p, [k]: !p[k] }))
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 380 }}>
        {[
          {
            id: "mfa" as const,
            label: "Two-factor authentication",
            description: "Require TOTP on login",
          },
          {
            id: "sessions" as const,
            label: "Single session mode",
            description: "Log out all other devices on login",
          },
          {
            id: "audit" as const,
            label: "Audit log enabled",
            description: "Track all actions in the audit trail",
          },
          {
            id: "notifications" as const,
            label: "Push notifications",
            description: "Receive real-time alerts",
          },
        ].map((item) => (
          <GlassToggle
            key={item.id}
            checked={vals[item.id]}
            onChange={() => toggle(item.id)}
            label={item.label}
            description={item.description}
          />
        ))}
      </div>
    )
  },
}
