import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassSkeleton } from "../components/glass-skeleton"

const meta: Meta<typeof GlassSkeleton> = {
  title: "Glass Feedback/GlassSkeleton",
  component: GlassSkeleton,
  argTypes: {
    variant: { control: "select", options: ["text", "block", "circle", "card"] },
    animated: { control: "boolean" },
  },
  args: { animated: true },
}

export default meta
type Story = StoryObj<typeof GlassSkeleton>

export const TextLines: Story = {
  name: "Text Lines",
  render: () => (
    <div style={{ maxWidth: 320, display: "flex", flexDirection: "column", gap: 8 }}>
      <GlassSkeleton variant="text" width="90%" />
      <GlassSkeleton variant="text" width="75%" />
      <GlassSkeleton variant="text" width="60%" />
    </div>
  ),
}

export const Block: Story = {
  name: "Block",
  args: { variant: "block", width: 320, height: 120 },
}

export const Circle: Story = {
  name: "Circle",
  render: () => (
    <div style={{ display: "flex", gap: 12 }}>
      <GlassSkeleton variant="circle" width={40} height={40} />
      <GlassSkeleton variant="circle" width={56} height={56} />
      <GlassSkeleton variant="circle" width={72} height={72} />
    </div>
  ),
}

export const Card: Story = {
  name: "Card",
  render: () => <GlassSkeleton variant="card" style={{ maxWidth: 320 }} />,
}

export const ListLoader: Story = {
  name: "List Loader",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 380 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <GlassSkeleton variant="circle" width={44} height={44} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <GlassSkeleton variant="text" width="70%" />
            <GlassSkeleton variant="text" width="45%" />
          </div>
        </div>
      ))}
    </div>
  ),
}
