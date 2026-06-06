import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassTabBar } from "../components/glass-tab-bar"

const HomeIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)

const GridIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
)

const PeopleIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
)

const ChartIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
)

const StarIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

const BUSINESS_TABS = [
  { id: "command", label: "Command", icon: <HomeIcon /> },
  { id: "operations", label: "Operations", icon: <GridIcon /> },
  { id: "people", label: "People", icon: <PeopleIcon /> },
  { id: "finance", label: "Finance", icon: <ChartIcon /> },
  { id: "intelligence", label: "Intelligence", icon: <StarIcon /> },
]

const meta: Meta<typeof GlassTabBar> = {
  title: "Glass Navigation/GlassTabBar",
  component: GlassTabBar,
}

export default meta
type Story = StoryObj<typeof GlassTabBar>

export const BusinessOS: Story = {
  name: "Business OS Navigation",
  render: () => {
    const [activeId, setActiveId] = useState("command")
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "40px 20px 80px" }}>
        <GlassTabBar items={BUSINESS_TABS} activeId={activeId} onChange={setActiveId} />
      </div>
    )
  },
}

export const WithBadge: Story = {
  name: "With Notification Badge",
  render: () => {
    const [activeId, setActiveId] = useState("command")
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "40px 20px 80px" }}>
        <GlassTabBar
          items={[
            { id: "command", label: "Command", icon: <HomeIcon /> },
            { id: "operations", label: "Operations", icon: <GridIcon />, badge: 3 },
            { id: "people", label: "People", icon: <PeopleIcon />, badge: true },
            { id: "finance", label: "Finance", icon: <ChartIcon /> },
            { id: "intelligence", label: "Intelligence", icon: <StarIcon /> },
          ]}
          activeId={activeId}
          onChange={setActiveId}
        />
      </div>
    )
  },
}
