import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassSegmentedControl } from "../components/glass-segmented-control"

const meta: Meta<typeof GlassSegmentedControl> = {
  title: "Glass Navigation/GlassSegmentedControl",
  component: GlassSegmentedControl,
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    fullWidth: { control: "boolean" },
  },
  args: { size: "md", fullWidth: false },
}

export default meta
type Story = StoryObj<typeof GlassSegmentedControl>

export const Default: Story = {
  name: "Default",
  render: (args) => {
    const [activeId, setActiveId] = useState("day")
    return (
      <GlassSegmentedControl
        {...args}
        items={[
          { id: "day", label: "Day" },
          { id: "week", label: "Week" },
          { id: "month", label: "Month" },
          { id: "year", label: "Year" },
        ]}
        activeId={activeId}
        onChange={setActiveId}
      />
    )
  },
}

export const AllSizes: Story = {
  name: "All Sizes",
  render: () => {
    const [vals, setVals] = useState({ sm: "a", md: "a", lg: "a" })
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {(["sm", "md", "lg"] as const).map((size) => (
          <GlassSegmentedControl
            key={size}
            size={size}
            items={[
              { id: "a", label: "Option A" },
              { id: "b", label: "Option B" },
              { id: "c", label: "Option C" },
            ]}
            activeId={vals[size]}
            onChange={(id) => setVals((p) => ({ ...p, [size]: id }))}
          />
        ))}
      </div>
    )
  },
}

export const FullWidth: Story = {
  name: "Full Width",
  render: () => {
    const [activeId, setActiveId] = useState("list")
    return (
      <div style={{ maxWidth: 400 }}>
        <GlassSegmentedControl
          fullWidth
          items={[
            { id: "list", label: "List" },
            { id: "grid", label: "Grid" },
            { id: "calendar", label: "Calendar" },
          ]}
          activeId={activeId}
          onChange={setActiveId}
        />
      </div>
    )
  },
}
