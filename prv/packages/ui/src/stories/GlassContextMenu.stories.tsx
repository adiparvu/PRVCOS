import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassContextMenu } from "../components/glass-context-menu"

const EditIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const CopyIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
)

const TrashIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
)

const meta: Meta = {
  title: "Glass Overlay/GlassContextMenu",
  parameters: { layout: "fullscreen" },
}

export default meta
type Story = StoryObj

export const RightClick: Story = {
  name: "Right-click Context Menu",
  render: () => {
    const [menu, setMenu] = useState<{ open: boolean; x: number; y: number }>({
      open: false,
      x: 0,
      y: 0,
    })

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          setMenu({ open: true, x: e.clientX, y: e.clientY })
        }}
      >
        <div
          style={{
            padding: "40px 60px",
            border: "1px dashed rgba(255,255,255,0.15)",
            borderRadius: 16,
            color: "var(--prv-text-3)",
            fontSize: 14,
            userSelect: "none",
          }}
        >
          Right-click anywhere in this area
        </div>
        <GlassContextMenu
          open={menu.open}
          onClose={() => setMenu((m) => ({ ...m, open: false }))}
          position={{ x: menu.x, y: menu.y }}
          items={[
            { id: "edit", label: "Edit", icon: <EditIcon />, shortcut: "⌘E" },
            { id: "copy", label: "Copy link", icon: <CopyIcon />, shortcut: "⌘C" },
            { id: "duplicate", label: "Duplicate" },
            { id: "sep1", label: "", separator: true },
            { id: "delete", label: "Delete", icon: <TrashIcon />, destructive: true },
          ]}
          onSelect={(id) => {
            console.log("action:", id)
            setMenu((m) => ({ ...m, open: false }))
          }}
        />
      </div>
    )
  },
}
