import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassPullToRefresh } from "../components/glass-pull-to-refresh"

const meta: Meta<typeof GlassPullToRefresh> = {
  title: "Glass Display/GlassPullToRefresh",
  component: GlassPullToRefresh,
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj<typeof GlassPullToRefresh>

export const Default: Story = {
  name: "Pull to Refresh",
  render: () => {
    const [refreshing, setRefreshing] = useState(false)
    const [count, setCount] = useState(0)
    const handleRefresh = async () => {
      setRefreshing(true)
      await new Promise((r) => setTimeout(r, 1500))
      setCount((c) => c + 1)
      setRefreshing(false)
    }
    return (
      <GlassPullToRefresh onRefresh={handleRefresh} refreshing={refreshing} height={240}>
        <div style={{ padding: 16 }}>
          <p style={{ color: "var(--prv-text-2)", fontSize: 13 }}>
            Pull down to refresh · Refreshed {count}×
          </p>
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              style={{
                padding: "10px 0",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                color: "var(--prv-text-2)",
                fontSize: 13,
              }}
            >
              Employee {i + 1} · Active
            </div>
          ))}
        </div>
      </GlassPullToRefresh>
    )
  },
}
