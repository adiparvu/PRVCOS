import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassQuickActionsPanel, type QAPAction } from "../components/glass-quick-actions-panel"

const meta: Meta<typeof GlassQuickActionsPanel> = {
  title: "Glass Overlay/GlassQuickActionsPanel",
  component: GlassQuickActionsPanel,
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj<typeof GlassQuickActionsPanel>

const ACTIONS: QAPAction[] = [
  { id: "new_employee", label: "New Employee", icon: "👤" },
  { id: "new_project", label: "New Project", icon: "📋" },
  { id: "new_task", label: "New Task", icon: "✓" },
  { id: "send_payslip", label: "Send Payslip", icon: "💰" },
  { id: "view_schedule", label: "View Schedule", icon: "📅" },
  { id: "export_report", label: "Export Report", icon: "📊" },
]

export const Default: Story = {
  name: "Quick Actions Panel",
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <div style={{ minHeight: 200, position: "relative" }}>
        <GlassQuickActionsPanel
          actions={ACTIONS}
          onSelect={(id) => {
            console.log("action:", id)
            setOpen(false)
          }}
          open={open}
          onOpenChange={setOpen}
          position="bottom-right"
        />
      </div>
    )
  },
}
