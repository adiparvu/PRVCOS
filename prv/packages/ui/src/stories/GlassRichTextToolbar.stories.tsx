import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassRichTextToolbar } from "../components/glass-rich-text-toolbar"

const meta: Meta<typeof GlassRichTextToolbar> = {
  title: "Glass Forms/GlassRichTextToolbar",
  component: GlassRichTextToolbar,
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj<typeof GlassRichTextToolbar>

export const Default: Story = {
  name: "Rich Text Toolbar",
  render: () => {
    const [active, setActive] = useState<string[]>(["bold"])
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 600 }}>
        <GlassRichTextToolbar
          activeCommands={active}
          onCommand={(cmd) => {
            setActive((prev) =>
              prev.includes(cmd) ? prev.filter((c) => c !== cmd) : [...prev, cmd]
            )
          }}
        />
        <div
          style={{
            minHeight: 120,
            padding: 16,
            background: "rgba(255,255,255,0.04)",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.08)",
            color: "var(--prv-text-2)",
            fontSize: 14,
          }}
        >
          Rich text editor content area…
        </div>
      </div>
    )
  },
}
