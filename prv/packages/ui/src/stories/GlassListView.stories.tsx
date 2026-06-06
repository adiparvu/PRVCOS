import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassListView } from "../components/glass-list-view"

const PersonIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const LockIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
)

const meta: Meta<typeof GlassListView> = {
  title: "Glass Display/GlassListView",
  component: GlassListView,
  argTypes: {
    size: { control: "select", options: ["sm", "md"] },
  },
  args: { size: "md" },
}

export default meta
type Story = StoryObj<typeof GlassListView>

export const Settings: Story = {
  name: "Settings Menu",
  args: {
    sections: [
      {
        label: "Account",
        items: [
          {
            id: "profile",
            title: "Profile",
            subtitle: "Name, photo, job title",
            icon: <PersonIcon />,
            chevron: true,
          },
          {
            id: "security",
            title: "Security",
            subtitle: "Password, 2FA",
            icon: <LockIcon />,
            chevron: true,
          },
        ],
      },
      {
        label: "Preferences",
        items: [
          { id: "appearance", title: "Appearance", value: "Dark", chevron: true },
          { id: "language", title: "Language", value: "Romanian", chevron: true },
          { id: "timezone", title: "Timezone", value: "Europe/Bucharest", chevron: true },
        ],
      },
    ],
  },
}

export const WithBadges: Story = {
  name: "With Badges",
  args: {
    sections: [
      {
        label: "Notifications",
        items: [
          {
            id: "inbox",
            title: "Inbox",
            badge: (
              <span
                style={{
                  fontSize: 11,
                  padding: "1px 7px",
                  borderRadius: 100,
                  background: "rgba(255,59,48,0.85)",
                  color: "#fff",
                }}
              >
                12
              </span>
            ),
            chevron: true,
          },
          {
            id: "mentions",
            title: "Mentions",
            badge: (
              <span
                style={{
                  fontSize: 11,
                  padding: "1px 7px",
                  borderRadius: 100,
                  background: "rgba(255,149,0,0.85)",
                  color: "#fff",
                }}
              >
                3
              </span>
            ),
            chevron: true,
          },
          { id: "updates", title: "Updates", chevron: true },
        ],
      },
    ],
  },
}

export const Compact: Story = {
  name: "Compact",
  args: {
    size: "sm",
    sections: [
      {
        items: [
          { id: "a", title: "Option A" },
          { id: "b", title: "Option B" },
          { id: "c", title: "Option C" },
          { id: "d", title: "Option D" },
        ],
      },
    ],
  },
}
