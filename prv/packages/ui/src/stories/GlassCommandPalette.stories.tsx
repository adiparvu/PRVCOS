import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassCommandPalette } from "../components/glass-command-palette"
import { GlassButton } from "../components/glass-button"

const meta: Meta = {
  title: "Glass Specialized/GlassCommandPalette",
  parameters: { layout: "fullscreen" },
}

export default meta
type Story = StoryObj

const COMMANDS = [
  {
    id: "people",
    title: "People",
    items: [
      {
        id: "add-employee",
        label: "Add employee",
        keywords: ["invite", "create", "new"],
        shortcut: "⌘N",
      },
      {
        id: "view-directory",
        label: "View employee directory",
        keywords: ["list", "all", "staff"],
      },
      { id: "attendance", label: "Today's attendance", keywords: ["who", "present", "checkin"] },
    ],
  },
  {
    id: "finance",
    title: "Finance",
    items: [
      {
        id: "new-invoice",
        label: "Create invoice",
        keywords: ["bill", "send", "charge"],
        shortcut: "⌘I",
      },
      { id: "reports", label: "Open financial reports", keywords: ["revenue", "p&l", "analytics"] },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    items: [
      { id: "appearance", label: "Appearance settings", keywords: ["theme", "dark", "glass"] },
      { id: "security", label: "Security settings", keywords: ["mfa", "2fa", "password"] },
      { id: "roles", label: "Manage roles", keywords: ["permissions", "access"] },
    ],
  },
]

export const Default: Story = {
  name: "Default",
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <div style={{ padding: 40 }}>
        <GlassButton variant="glass" onClick={() => setOpen(true)}>
          Open Command Palette (⌘K)
        </GlassButton>
        <GlassCommandPalette
          open={open}
          onClose={() => setOpen(false)}
          sections={COMMANDS}
          onSelect={(id) => {
            console.log("command:", id)
            setOpen(false)
          }}
          placeholder="Search commands…"
        />
      </div>
    )
  },
}

export const OpenByDefault: Story = {
  name: "Open (for preview)",
  render: () => {
    const [open, setOpen] = useState(true)
    return (
      <div style={{ padding: 40 }}>
        <GlassCommandPalette
          open={open}
          onClose={() => setOpen(false)}
          sections={COMMANDS}
          onSelect={(id) => {
            console.log("command:", id)
            setOpen(false)
          }}
          placeholder="Search commands…"
        />
        {!open && (
          <GlassButton variant="glass" onClick={() => setOpen(true)}>
            Reopen
          </GlassButton>
        )}
      </div>
    )
  },
}
