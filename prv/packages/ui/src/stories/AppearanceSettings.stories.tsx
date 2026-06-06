import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { AppearanceSettings } from "../components/appearance-settings"
import { AppearanceProvider } from "../providers/appearance"

const meta: Meta<typeof AppearanceSettings> = {
  title: "Glass Specialized/AppearanceSettings",
  component: AppearanceSettings,
  decorators: [
    (Story) => (
      <AppearanceProvider>
        <Story />
      </AppearanceProvider>
    ),
  ],
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj<typeof AppearanceSettings>

export const Default: Story = {
  name: "Default",
  render: () => (
    <div style={{ maxWidth: 480 }}>
      <AppearanceSettings onSave={() => console.log("saved")} />
    </div>
  ),
}

export const Embedded: Story = {
  name: "Embedded in Settings Page",
  render: () => (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--prv-text-1)", marginBottom: 4 }}>
          Appearance
        </h2>
        <p style={{ fontSize: 14, color: "var(--prv-text-3)" }}>
          Customize how PRV looks on this device.
        </p>
      </div>
      <AppearanceSettings onSave={() => console.log("saved")} />
    </div>
  ),
}
