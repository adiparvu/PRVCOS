import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassAspectRatio } from "../components/glass-aspect-ratio"

const meta: Meta<typeof GlassAspectRatio> = {
  title: "Glass Display/GlassAspectRatio",
  component: GlassAspectRatio,
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj<typeof GlassAspectRatio>

export const Widescreen: Story = {
  name: "16:9 Widescreen",
  render: () => (
    <div style={{ width: 480 }}>
      <GlassAspectRatio ratio={16 / 9}>
        <img
          src="https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=450&fit=crop"
          alt="Kitchen renovation"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </GlassAspectRatio>
    </div>
  ),
}

export const Square: Story = {
  name: "1:1 Square",
  render: () => (
    <div style={{ width: 240 }}>
      <GlassAspectRatio ratio={1}>
        <img
          src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop"
          alt="Tiles"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </GlassAspectRatio>
    </div>
  ),
}
