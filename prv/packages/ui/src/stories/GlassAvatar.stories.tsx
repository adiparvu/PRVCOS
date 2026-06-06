import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassAvatar, GlassAvatarGroup } from "../components/glass-avatar"

const meta: Meta<typeof GlassAvatar> = {
  title: "Glass Display/GlassAvatar",
  component: GlassAvatar,
  argTypes: {
    size: { control: "select", options: ["xs", "sm", "md", "lg", "xl"] },
    presence: { control: "select", options: ["online", "away", "busy", "offline", undefined] },
    ring: { control: "boolean" },
  },
  args: { size: "md", ring: false },
}

export default meta
type Story = StoryObj<typeof GlassAvatar>

export const Initials: Story = {
  name: "Initials",
  args: { initials: "IP", size: "md" },
}

export const WithPresence: Story = {
  name: "With Presence",
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <GlassAvatar initials="IP" presence="online" size="md" />
      <GlassAvatar initials="AM" presence="away" size="md" />
      <GlassAvatar initials="GV" presence="busy" size="md" />
      <GlassAvatar initials="LM" presence="offline" size="md" />
    </div>
  ),
}

export const AllSizes: Story = {
  name: "All Sizes",
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
      {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
        <GlassAvatar key={size} initials="AB" size={size} presence="online" />
      ))}
    </div>
  ),
}

export const WithRing: Story = {
  name: "With Ring",
  render: () => (
    <div style={{ display: "flex", gap: 16 }}>
      <GlassAvatar initials="CEO" size="xl" ring />
      <GlassAvatar initials="PM" size="lg" ring presence="online" />
    </div>
  ),
}

export const AvatarGroupStory: Story = {
  name: "Avatar Group",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <GlassAvatarGroup
        size="md"
        avatars={[
          { initials: "IP" },
          { initials: "AM" },
          { initials: "GV" },
          { initials: "LM" },
          { initials: "BC" },
          { initials: "DF" },
          { initials: "EG" },
        ]}
        max={5}
      />
      <GlassAvatarGroup
        size="sm"
        avatars={[
          { initials: "A", presence: "online" },
          { initials: "B", presence: "busy" },
          { initials: "C", presence: "away" },
        ]}
        max={3}
      />
    </div>
  ),
}
