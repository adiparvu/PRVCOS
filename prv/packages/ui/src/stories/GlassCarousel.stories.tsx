import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassCarousel } from "../components/glass-carousel"

const meta: Meta<typeof GlassCarousel> = {
  title: "Glass Display/GlassCarousel",
  component: GlassCarousel,
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj<typeof GlassCarousel>

const SLIDES = [
  <div
    key="1"
    style={{
      height: "100%",
      background: "rgba(255,255,255,0.06)",
      borderRadius: 16,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--prv-text-1)",
      fontSize: 18,
      fontWeight: 600,
    }}
  >
    Slide 1 — Revenue Overview
  </div>,
  <div
    key="2"
    style={{
      height: "100%",
      background: "rgba(255,255,255,0.06)",
      borderRadius: 16,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--prv-text-1)",
      fontSize: 18,
      fontWeight: 600,
    }}
  >
    Slide 2 — Workforce Stats
  </div>,
  <div
    key="3"
    style={{
      height: "100%",
      background: "rgba(255,255,255,0.06)",
      borderRadius: 16,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--prv-text-1)",
      fontSize: 18,
      fontWeight: 600,
    }}
  >
    Slide 3 — Project Pipeline
  </div>,
]

export const Default: Story = {
  name: "Default",
  args: {
    slides: SLIDES,
    height: 200,
    showDots: true,
    showArrows: true,
  },
}

export const AutoPlay: Story = {
  name: "Auto Play",
  args: {
    slides: SLIDES,
    height: 200,
    autoPlay: 3000,
    loop: true,
  },
}
