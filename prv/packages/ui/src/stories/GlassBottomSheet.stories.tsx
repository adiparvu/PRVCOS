import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import {
  ActionSheet,
  ConfirmationSheet,
  FilterSheet,
  FormSheet,
  PreviewSheet,
} from "../components/glass-bottom-sheet"
import { GlassButton } from "../components/glass-button"

const meta: Meta = {
  title: "Glass Overlay/GlassBottomSheet",
  parameters: { layout: "centered" },
}

export default meta
type Story = StoryObj

export const Action: Story = {
  name: "Action Sheet",
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <GlassButton variant="glass" onClick={() => setOpen(true)}>
          Open Action Sheet
        </GlassButton>
        <ActionSheet
          open={open}
          onClose={() => setOpen(false)}
          title="Employee Actions"
          items={[
            { id: "edit", label: "Edit Profile" },
            { id: "schedule", label: "View Schedule" },
            { id: "payslip", label: "Download Payslip" },
            { id: "archive", label: "Archive Employee", destructive: true },
          ]}
          onSelect={(id) => {
            console.log("selected:", id)
            setOpen(false)
          }}
        />
      </>
    )
  },
}

export const Confirmation: Story = {
  name: "Confirmation Sheet",
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <GlassButton variant="destructive" onClick={() => setOpen(true)}>
          Delete Project
        </GlassButton>
        <ConfirmationSheet
          open={open}
          onClose={() => setOpen(false)}
          title="Delete Project?"
          description="This action will permanently delete the project and all associated data. This cannot be undone."
          confirmLabel="Delete"
          destructive
          onConfirm={() => {
            console.log("confirmed")
            setOpen(false)
          }}
        />
      </>
    )
  },
}

export const Filter: Story = {
  name: "Filter Sheet",
  render: () => {
    const [open, setOpen] = useState(false)
    const [selected, setSelected] = useState<Record<string, string[]>>({
      Status: [],
      Department: [],
    })
    return (
      <>
        <GlassButton variant="glass" onClick={() => setOpen(true)}>
          Filter Employees
        </GlassButton>
        <FilterSheet
          open={open}
          onClose={() => setOpen(false)}
          sections={[
            {
              label: "Status",
              options: [
                { id: "active", label: "Active" },
                { id: "on_leave", label: "On Leave" },
                { id: "suspended", label: "Suspended" },
              ],
            },
            {
              label: "Department",
              options: [
                { id: "operations", label: "Operations" },
                { id: "field_ops", label: "Field Ops" },
                { id: "projects", label: "Projects" },
                { id: "hr", label: "Human Resources" },
              ],
            },
          ]}
          selected={selected}
          onChange={(sectionLabel, values) =>
            setSelected((prev) => ({ ...prev, [sectionLabel]: values }))
          }
          onApply={() => {
            console.log("applied:", selected)
            setOpen(false)
          }}
          onReset={() => setSelected({ Status: [], Department: [] })}
        />
      </>
    )
  },
}

export const Form: Story = {
  name: "Form Sheet",
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <GlassButton variant="primary" onClick={() => setOpen(true)}>
          Invite Member
        </GlassButton>
        <FormSheet
          open={open}
          onClose={() => setOpen(false)}
          title="Invite Team Member"
          onSave={() => {
            console.log("saved")
            setOpen(false)
          }}
          saveLabel="Send Invite"
        >
          <input
            placeholder="Email address"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "var(--prv-text-1)",
              fontSize: 14,
              outline: "none",
            }}
          />
        </FormSheet>
      </>
    )
  },
}

export const Preview: Story = {
  name: "Preview Sheet",
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <GlassButton variant="glass" onClick={() => setOpen(true)}>
          Preview Document
        </GlassButton>
        <PreviewSheet
          open={open}
          onClose={() => setOpen(false)}
          title="Contract_2024_Q4.pdf"
          actions={[
            { id: "download", label: "Download" },
            { id: "share", label: "Share" },
          ]}
          onAction={(id) => console.log("action:", id)}
        >
          <div
            style={{
              height: 200,
              background: "rgba(255,255,255,0.04)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--prv-text-3)",
              fontSize: 14,
            }}
          >
            Document preview area
          </div>
        </PreviewSheet>
      </>
    )
  },
}
