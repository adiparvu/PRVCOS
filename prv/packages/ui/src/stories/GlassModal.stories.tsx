"use client"

import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassModal, type ModalSize } from "../components/glass-modal"
import { GlassButton } from "../components/glass-button"

const meta: Meta<typeof GlassModal> = {
  title: "Overlays/GlassModal",
  component: GlassModal,
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg", "xl"] },
    persistent: { control: "boolean" },
    title: { control: "text" },
    description: { control: "text" },
  },
}

export default meta
type Story = StoryObj<typeof GlassModal>

const ModalDemo = ({
  size = "md",
  title = "Confirm Action",
  description = "This action cannot be undone.",
  persistent = false,
}: {
  size?: ModalSize
  title?: string
  description?: string
  persistent?: boolean
}) => {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <GlassButton onClick={() => setOpen(true)}>Open modal</GlassButton>
      <GlassModal
        open={open}
        onClose={() => setOpen(false)}
        size={size}
        title={title}
        description={description}
        persistent={persistent}
        footer={
          <>
            <GlassButton variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton variant="primary" onClick={() => setOpen(false)}>
              Confirm
            </GlassButton>
          </>
        }
      >
        <p style={{ color: "var(--prv-text-2)", fontSize: 15 }}>
          Are you sure you want to proceed? This will permanently affect all associated records.
        </p>
      </GlassModal>
    </div>
  )
}

export const Default: Story = {
  name: "Default · Medium",
  render: () => <ModalDemo />,
}

export const Small: Story = {
  name: "Small",
  render: () => <ModalDemo size="sm" title="Quick Confirm" description="" />,
}

export const Large: Story = {
  name: "Large",
  render: () => (
    <ModalDemo
      size="lg"
      title="Employee Review"
      description="Review and confirm all changes before saving."
    />
  ),
}

export const Persistent: Story = {
  name: "Persistent · No Backdrop Close",
  render: () => (
    <ModalDemo
      persistent
      title="Required Action"
      description="You must complete this form to continue."
    />
  ),
}

export const Destructive: Story = {
  name: "Destructive Confirmation",
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <div>
        <GlassButton variant="destructive" onClick={() => setOpen(true)}>
          Delete record
        </GlassButton>
        <GlassModal
          open={open}
          onClose={() => setOpen(false)}
          title="Delete Employee Record"
          description="This action is permanent and cannot be reversed."
          footer={
            <>
              <GlassButton variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </GlassButton>
              <GlassButton variant="destructive" onClick={() => setOpen(false)}>
                Delete
              </GlassButton>
            </>
          }
        >
          <p style={{ color: "var(--prv-text-2)", fontSize: 15 }}>
            All data associated with this employee will be permanently removed from the system.
          </p>
        </GlassModal>
      </div>
    )
  },
}
