import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassAccordion } from "../components/glass-accordion"

const meta: Meta<typeof GlassAccordion> = {
  title: "Glass Display/GlassAccordion",
  component: GlassAccordion,
  argTypes: {
    multiple: { control: "boolean" },
    animated: { control: "boolean" },
  },
  args: { multiple: false, animated: true },
}

export default meta
type Story = StoryObj<typeof GlassAccordion>

const FAQ_ITEMS = [
  {
    id: "mfa",
    title: "What is two-factor authentication?",
    content: (
      <p style={{ fontSize: 14, color: "var(--prv-text-2)", lineHeight: 1.6 }}>
        Two-factor authentication (2FA) adds an extra layer of security to your account by requiring
        a one-time code from an authenticator app in addition to your password.
      </p>
    ),
  },
  {
    id: "roles",
    title: "How are roles and permissions managed?",
    content: (
      <p style={{ fontSize: 14, color: "var(--prv-text-2)", lineHeight: 1.6 }}>
        Roles define what a user can see and do. System roles are predefined (CEO, Worker, etc.).
        Company admins can create custom roles with granular permissions per module.
      </p>
    ),
  },
  {
    id: "audit",
    title: "Where can I view audit logs?",
    content: (
      <p style={{ fontSize: 14, color: "var(--prv-text-2)", lineHeight: 1.6 }}>
        Navigate to Settings → Security → Audit Logs. All actions (create, update, delete, login)
        are recorded with actor, timestamp and IP address.
      </p>
    ),
  },
  {
    id: "session",
    title: "How long does a session last?",
    content: (
      <p style={{ fontSize: 14, color: "var(--prv-text-2)", lineHeight: 1.6 }}>
        Session length depends on the security level: L2 lasts 8 hours, L3 lasts 4 hours, L4 lasts 2
        hours, and L5 (critical) lasts 1 hour. Sessions require re-authentication for sensitive
        actions.
      </p>
    ),
  },
]

export const Default: Story = {
  name: "Default (single open)",
  args: {
    items: FAQ_ITEMS,
    defaultOpen: "mfa",
    multiple: false,
  },
}

export const MultipleOpen: Story = {
  name: "Multiple Open",
  args: {
    items: FAQ_ITEMS,
    defaultOpen: ["mfa", "roles"],
    multiple: true,
  },
}

export const AllClosed: Story = {
  name: "All Closed",
  args: { items: FAQ_ITEMS },
}
