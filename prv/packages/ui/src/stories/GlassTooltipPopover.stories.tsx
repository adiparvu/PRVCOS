import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassTooltip } from "../components/glass-tooltip"
import { GlassPopover } from "../components/glass-popover"
import { GlassButton } from "../components/glass-button"

const meta: Meta = {
  title: "Glass Overlay/GlassTooltipPopover",
  parameters: { layout: "centered" },
}

export default meta
type Story = StoryObj

export const TooltipDefault: Story = {
  name: "Tooltip · Default",
  render: () => (
    <GlassTooltip content="Save your changes">
      <GlassButton variant="glass">Hover me</GlassButton>
    </GlassTooltip>
  ),
}

export const TooltipWithShortcut: Story = {
  name: "Tooltip · With Shortcut",
  render: () => (
    <GlassTooltip content="Save" shortcut="⌘S">
      <GlassButton variant="primary">Save</GlassButton>
    </GlassTooltip>
  ),
}

export const TooltipSides: Story = {
  name: "Tooltip · All Sides",
  render: () => (
    <div style={{ display: "flex", gap: 16 }}>
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <GlassTooltip key={side} content={`Side: ${side}`} side={side}>
          <GlassButton variant="glass" size="sm">
            {side}
          </GlassButton>
        </GlassTooltip>
      ))}
    </div>
  ),
}

export const PopoverDefault: Story = {
  name: "Popover · Default",
  render: () => (
    <GlassPopover
      trigger={<GlassButton variant="glass">Open popover</GlassButton>}
      content={
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--prv-text-1)" }}>Invite member</p>
          <p style={{ fontSize: 13, color: "var(--prv-text-2)" }}>
            Send an invitation link to a new team member.
          </p>
          <GlassButton variant="primary" size="sm">
            Send invite
          </GlassButton>
        </div>
      }
    />
  ),
}

export const PopoverSides: Story = {
  name: "Popover · Sides",
  render: () => (
    <div style={{ display: "flex", gap: 12 }}>
      {(["top", "bottom", "left", "right"] as const).map((side) => (
        <GlassPopover
          key={side}
          side={side}
          trigger={
            <GlassButton variant="glass" size="sm">
              {side}
            </GlassButton>
          }
          content={
            <div style={{ padding: 12, color: "var(--prv-text-1)", fontSize: 13 }}>
              Popover on {side}
            </div>
          }
        />
      ))}
    </div>
  ),
}
