import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassAlertBanner } from "../components/glass-alert-banner"

const meta: Meta<typeof GlassAlertBanner> = {
  title: "Glass Feedback/GlassAlertBanner",
  component: GlassAlertBanner,
  argTypes: {
    type: { control: "select", options: ["info", "success", "warning", "error"] },
    dismissable: { control: "boolean" },
  },
  args: { type: "info", dismissable: false },
}

export default meta
type Story = StoryObj<typeof GlassAlertBanner>

export const Info: Story = {
  name: "Info",
  args: {
    type: "info",
    title: "New update available",
    description: "PRV 2.4 introduces shift scheduling improvements. Reload to apply.",
    action: { label: "Reload", onClick: () => {} },
  },
}

export const Success: Story = {
  name: "Success",
  args: {
    type: "success",
    title: "Employee onboarded",
    description: "Ion Popescu has accepted the invitation and completed setup.",
  },
}

export const Warning: Story = {
  name: "Warning",
  args: {
    type: "warning",
    title: "Storage limit approaching",
    description: "You've used 87% of your document storage. Consider archiving old files.",
    action: { label: "Manage storage", onClick: () => {} },
    dismissable: true,
  },
}

export const Error: Story = {
  name: "Error",
  args: {
    type: "error",
    title: "Sync failed",
    description: "Could not sync attendance data. Last successful sync: 2 hours ago.",
    action: { label: "Retry", onClick: () => {} },
    dismissable: true,
  },
}

export const AllTypes: Story = {
  name: "All Types",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <GlassAlertBanner
        type="info"
        title="Information"
        description="This is an informational message."
      />
      <GlassAlertBanner
        type="success"
        title="Success"
        description="The operation completed successfully."
      />
      <GlassAlertBanner
        type="warning"
        title="Warning"
        description="Please review before proceeding."
      />
      <GlassAlertBanner
        type="error"
        title="Error"
        description="Something went wrong. Please retry."
      />
    </div>
  ),
}
