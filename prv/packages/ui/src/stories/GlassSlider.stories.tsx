import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassSlider } from "../components/glass-slider"

const meta: Meta = {
  title: "Glass Forms/GlassSlider",
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj

export const Single: Story = {
  name: "Single Value",
  render: () => {
    const [value, setValue] = useState(40)
    return (
      <div style={{ maxWidth: 340 }}>
        <GlassSlider
          value={value}
          onChange={setValue}
          min={0}
          max={100}
          label="Volume"
          formatValue={(v) => `${v}%`}
        />
      </div>
    )
  },
}

export const Range: Story = {
  name: "Range",
  render: () => {
    const [value, setValue] = useState<[number, number]>([20, 80])
    return (
      <div style={{ maxWidth: 340 }}>
        <GlassSlider
          range
          value={value}
          onChange={setValue}
          min={0}
          max={100}
          label="Salary range"
          formatValue={(v) => `${v}K RON`}
        />
      </div>
    )
  },
}

export const Steps: Story = {
  name: "With Steps",
  render: () => {
    const [value, setValue] = useState(3)
    return (
      <div style={{ maxWidth: 340 }}>
        <GlassSlider
          value={value}
          onChange={setValue}
          min={1}
          max={5}
          step={1}
          label="Priority level"
          formatValue={(v) => ["", "Critical", "High", "Medium", "Low", "Minimal"][v] ?? `${v}`}
        />
      </div>
    )
  },
}

export const Disabled: Story = {
  name: "Disabled",
  render: () => (
    <div style={{ maxWidth: 340 }}>
      <GlassSlider value={65} onChange={() => {}} label="Locked" disabled />
    </div>
  ),
}
