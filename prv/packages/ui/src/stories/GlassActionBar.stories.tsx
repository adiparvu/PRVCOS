import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassActionBar } from "../components/glass-action-bar"
import { GlassButton } from "../components/glass-button"

const meta: Meta<typeof GlassActionBar> = {
  title: "Glass Display/GlassActionBar",
  component: GlassActionBar,
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj<typeof GlassActionBar>

export const Default: Story = {
  name: "Default",
  render: () => {
    const [selected, setSelected] = useState(3)
    return (
      <div style={{ position: "relative", minHeight: 80, display: "flex", alignItems: "flex-end" }}>
        {selected > 0 && (
          <GlassActionBar
            count={selected}
            label="employees"
            actions={[
              { label: "Export", onAction: () => console.log("export") },
              { label: "Archive", onAction: () => console.log("archive") },
              { label: "Delete", danger: true, onAction: () => setSelected(0) },
            ]}
            onClose={() => setSelected(0)}
          />
        )}
        {selected === 0 && (
          <GlassButton variant="glass" onClick={() => setSelected(3)}>
            Select 3 rows
          </GlassButton>
        )}
      </div>
    )
  },
}
