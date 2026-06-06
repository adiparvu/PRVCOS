import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassFeatureGrid } from "../components/glass-feature-grid"
import { GlassHero } from "../components/glass-hero"

const meta: Meta = {
  title: "Glass Marketing/FeatureHero",
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj

export const FeatureGrid: Story = {
  name: "Feature Grid",
  render: () => (
    <GlassFeatureGrid
      columns={3}
      features={[
        {
          title: "Zero Trust Security",
          description: "Every action validated through a 9-gate chain. No shortcuts.",
        },
        {
          title: "Role-Based Views",
          description:
            "CEO sees KPIs. Workers see their tasks. Every role gets the right interface.",
        },
        {
          title: "Real-Time Sync",
          description: "Live updates via Supabase Realtime. Always current, never stale.",
        },
        {
          title: "AI Assistant",
          description: "PRV AI answers questions, drafts emails, and predicts trends.",
        },
        {
          title: "Multi-Company",
          description: "Manage PRV Group, Renovations, Projects, and Shop from one OS.",
        },
        {
          title: "Mobile First",
          description: "Designed for iPhone. Dynamic Island, Face ID, and native gestures.",
        },
      ]}
    />
  ),
}

export const Hero: Story = {
  name: "Hero Section",
  render: () => (
    <GlassHero
      eyebrow="PRV Business OS"
      title="The operating system for your entire company"
      description="Manage people, projects, finances, and analytics from a single unified platform. Built for enterprise, designed like Apple."
      actions={[
        { label: "Get Started", variant: "primary", onClick: () => console.log("start") },
        { label: "Learn More", variant: "ghost", onClick: () => console.log("learn") },
      ]}
      align="center"
    />
  ),
}
