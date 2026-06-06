import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassProgressBar } from "../components/glass-progress-bar"
import { GlassProgressRing } from "../components/glass-progress-ring"

const meta: Meta = {
  title: "Glass Display/GlassProgress",
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj

export const ProgressBarDefault: Story = {
  name: "ProgressBar · Default",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 400 }}>
      <GlassProgressBar value={25} label="Project A" showValue />
      <GlassProgressBar value={60} label="Project B" showValue />
      <GlassProgressBar value={90} label="Project C" showValue />
    </div>
  ),
}

export const ProgressBarColors: Story = {
  name: "ProgressBar · Colors",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 400 }}>
      {(["white", "green", "orange", "red"] as const).map((color) => (
        <GlassProgressBar key={color} value={65} color={color} label={color} showValue />
      ))}
    </div>
  ),
}

export const ProgressBarSizes: Story = {
  name: "ProgressBar · Sizes",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 400 }}>
      <GlassProgressBar value={65} size="sm" label="Small" />
      <GlassProgressBar value={65} size="md" label="Medium" />
      <GlassProgressBar value={65} size="lg" label="Large" />
    </div>
  ),
}

export const ProgressBarVariants: Story = {
  name: "ProgressBar · Variants",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 400 }}>
      <GlassProgressBar value={65} variant="default" label="Default" />
      <GlassProgressBar value={65} variant="gradient" label="Gradient" />
      <GlassProgressBar value={65} variant="striped" label="Striped" animated />
      <GlassProgressBar variant="indeterminate" label="Indeterminate" animated />
    </div>
  ),
}

export const ProgressBarSegmented: Story = {
  name: "ProgressBar · Segmented",
  render: () => (
    <div style={{ maxWidth: 400 }}>
      <GlassProgressBar
        variant="segmented"
        label="Budget allocation"
        segments={[
          { value: 45, color: "rgba(255,255,255,0.82)", label: "Operations" },
          { value: 30, color: "rgba(255,255,255,0.50)", label: "Marketing" },
          { value: 25, color: "rgba(255,255,255,0.25)", label: "Admin" },
        ]}
      />
    </div>
  ),
}

export const ProgressRingDefault: Story = {
  name: "ProgressRing · Default",
  render: () => (
    <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
      <GlassProgressRing value={25} sublabel="Q1" />
      <GlassProgressRing value={60} sublabel="Target" />
      <GlassProgressRing value={88} sublabel="Score" />
    </div>
  ),
}

export const ProgressRingSizes: Story = {
  name: "ProgressRing · Sizes",
  render: () => (
    <div style={{ display: "flex", gap: 32, alignItems: "flex-end" }}>
      {(["xs", "sm", "md", "lg"] as const).map((size) => (
        <GlassProgressRing key={size} value={72} size={size} sublabel={size} />
      ))}
    </div>
  ),
}
