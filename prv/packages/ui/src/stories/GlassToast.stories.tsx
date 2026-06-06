import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { ToastProvider, useToast } from "../components/glass-toast"
import { GlassButton } from "../components/glass-button"

const meta: Meta = {
  title: "Glass Feedback/GlassToast",
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj

function ToastDemo() {
  const { toast } = useToast()
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <GlassButton
        variant="glass"
        onClick={() => toast.success("Record saved", "Your changes have been saved.")}
      >
        Success
      </GlassButton>
      <GlassButton
        variant="glass"
        onClick={() => toast.error("Save failed", "Check your connection and try again.")}
      >
        Error
      </GlassButton>
      <GlassButton
        variant="glass"
        onClick={() => toast.warning("Low storage", "You are nearing your storage limit.")}
      >
        Warning
      </GlassButton>
      <GlassButton
        variant="glass"
        onClick={() => toast.info("Syncing data", "Latest records are being fetched.")}
      >
        Info
      </GlassButton>
    </div>
  )
}

export const AllSeverities: Story = {
  name: "All Severities",
  render: () => <ToastDemo />,
}

function ToastPersistent() {
  const { toast } = useToast()
  return (
    <GlassButton
      variant="glass"
      onClick={() =>
        toast.error("Session expired", "You have been logged out. Please sign in again.", {
          duration: 8000,
        })
      }
    >
      Long duration toast (8s)
    </GlassButton>
  )
}

export const LongDuration: Story = {
  name: "Long Duration",
  render: () => <ToastPersistent />,
}
