import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassVideoPlayer } from "../components/glass-video-player"

const meta: Meta<typeof GlassVideoPlayer> = {
  title: "Glass Display/GlassVideoPlayer",
  component: GlassVideoPlayer,
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj<typeof GlassVideoPlayer>

export const Default: Story = {
  name: "Video Player",
  render: () => (
    <div style={{ maxWidth: 560 }}>
      <GlassVideoPlayer
        src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        poster="https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=450&fit=crop"
        muted
        onTimeUpdate={(current, duration) =>
          console.log(`${current.toFixed(0)}/${duration.toFixed(0)}s`)
        }
      />
    </div>
  ),
}

export const Autoplay: Story = {
  name: "Autoplay Muted Loop",
  render: () => (
    <div style={{ maxWidth: 400 }}>
      <GlassVideoPlayer
        src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
        autoPlay
        muted
        loop
      />
    </div>
  ),
}
