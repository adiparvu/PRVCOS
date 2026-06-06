import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassDrawer } from "../components/glass-drawer"
import { GlassButton } from "../components/glass-button"

const meta: Meta = {
  title: "Glass Overlay/GlassDrawer",
  parameters: { layout: "fullscreen" },
}

export default meta
type Story = StoryObj

function DrawerDemo({
  side,
  size,
}: {
  side?: "left" | "right" | "top" | "bottom"
  size?: "sm" | "md" | "lg" | "full"
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div style={{ padding: 40 }}>
        <GlassButton variant="glass" onClick={() => setOpen(true)}>
          Open {side ?? "right"} drawer ({size ?? "md"})
        </GlassButton>
      </div>
      <GlassDrawer
        open={open}
        onClose={() => setOpen(false)}
        side={side}
        size={size}
        title="Drawer title"
        subtitle="Supporting text"
        footer={
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <GlassButton variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton variant="primary" onClick={() => setOpen(false)}>
              Save
            </GlassButton>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: 15, color: "var(--prv-text-2)" }}>Drawer content goes here.</p>
          <p style={{ fontSize: 13, color: "var(--prv-text-3)" }}>
            Use drawers for settings panels, filters, and secondary workflows.
          </p>
        </div>
      </GlassDrawer>
    </>
  )
}

export const Right: Story = {
  name: "Right (default)",
  render: () => <DrawerDemo side="right" />,
}

export const Left: Story = {
  name: "Left",
  render: () => <DrawerDemo side="left" />,
}

export const Bottom: Story = {
  name: "Bottom",
  render: () => <DrawerDemo side="bottom" />,
}

export const Large: Story = {
  name: "Large",
  render: () => <DrawerDemo side="right" size="lg" />,
}

export const Full: Story = {
  name: "Full",
  render: () => <DrawerDemo side="right" size="full" />,
}
