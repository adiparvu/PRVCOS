import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { NavigationShell, HeaderIconButton } from "../components/navigation-shell"

const meta: Meta<typeof NavigationShell> = {
  title: "Glass Navigation/NavigationShell",
  component: NavigationShell,
  parameters: { layout: "fullscreen" },
}

export default meta
type Story = StoryObj<typeof NavigationShell>

const TABS = [
  { id: "command", label: "Command", icon: "⌂" },
  { id: "operations", label: "Operations", icon: "⊞" },
  { id: "people", label: "People", icon: "◎" },
  { id: "finance", label: "Finance", icon: "⟁" },
  { id: "intelligence", label: "Intelligence", icon: "✦" },
]

export const Default: Story = {
  name: "Business OS Shell",
  render: () => {
    const [activeTab, setActiveTab] = useState("command")
    return (
      <NavigationShell
        tabs={TABS}
        activeTabId={activeTab}
        onTabChange={setActiveTab}
        title="PRV Group"
        headerActions={
          <>
            <HeaderIconButton aria-label="Search">⌕</HeaderIconButton>
            <HeaderIconButton aria-label="Notifications">🔔</HeaderIconButton>
          </>
        }
      >
        <div style={{ padding: 24 }}>
          <p style={{ color: "var(--prv-text-1)", fontWeight: 600, fontSize: 18, marginBottom: 8 }}>
            {TABS.find((t) => t.id === activeTab)?.label} Tab
          </p>
          <p style={{ color: "var(--prv-text-2)", fontSize: 14 }}>
            Content for the {activeTab} section.
          </p>
        </div>
      </NavigationShell>
    )
  },
}
