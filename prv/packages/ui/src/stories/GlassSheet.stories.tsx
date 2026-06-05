"use client"

import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassSheet, type SheetSide } from "../components/glass-sheet"
import { GlassButton } from "../components/glass-button"
import { GlassPanel } from "../components/glass-panel"

const meta: Meta<typeof GlassSheet> = {
  title: "Overlays/GlassSheet",
  component: GlassSheet,
  argTypes: {
    side: { control: "select", options: ["bottom", "left", "right"] },
    title: { control: "text" },
  },
}

export default meta
type Story = StoryObj<typeof GlassSheet>

const SheetDemo = ({
  side = "bottom",
  title = "Edit Employee",
}: {
  side?: SheetSide
  title?: string
}) => {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <GlassButton onClick={() => setOpen(true)}>Open {side} sheet</GlassButton>
      <GlassSheet open={open} onClose={() => setOpen(false)} side={side} title={title}>
        <div
          style={{ padding: "12px 20px 32px", display: "flex", flexDirection: "column", gap: 12 }}
        >
          <GlassPanel variant="default">
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
              Personal Info
            </p>
            <p style={{ fontSize: 14, color: "var(--prv-text-1)" }}>Alexandru Popescu</p>
            <p style={{ fontSize: 12, color: "var(--prv-text-3)", marginTop: 2 }}>
              Store Manager · Cluj-Napoca
            </p>
          </GlassPanel>
          <GlassPanel variant="elevated">
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
              Role
            </p>
            <p style={{ fontSize: 14, color: "var(--prv-text-1)" }}>SCOPE_STORE · store_manager</p>
          </GlassPanel>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <GlassButton variant="primary" style={{ flex: 1 }}>
              Save Changes
            </GlassButton>
            <GlassButton variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </GlassButton>
          </div>
        </div>
      </GlassSheet>
    </div>
  )
}

export const Bottom: Story = {
  name: "Bottom Sheet",
  render: () => <SheetDemo side="bottom" title="Edit Employee" />,
}

export const Right: Story = {
  name: "Right Drawer",
  render: () => <SheetDemo side="right" title="Employee Details" />,
}

export const Left: Story = {
  name: "Left Drawer",
  render: () => <SheetDemo side="left" title="Navigation" />,
}

export const NoTitle: Story = {
  name: "No Title",
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <div>
        <GlassButton onClick={() => setOpen(true)}>Open sheet</GlassButton>
        <GlassSheet open={open} onClose={() => setOpen(false)}>
          <div style={{ padding: "12px 20px 32px" }}>
            <p style={{ color: "var(--prv-text-2)", fontSize: 15 }}>
              Sheet without a title bar — content fills the space below the drag handle.
            </p>
          </div>
        </GlassSheet>
      </div>
    )
  },
}
