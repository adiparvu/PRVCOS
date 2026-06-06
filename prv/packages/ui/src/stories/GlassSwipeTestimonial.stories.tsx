import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassSwipeActions } from "../components/glass-swipe-actions"
import { GlassTestimonial } from "../components/glass-testimonial"

const meta: Meta = {
  title: "Glass Display/SwipeTestimonial",
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj

export const SwipeActions: Story = {
  name: "Swipe Actions",
  render: () => (
    <div style={{ maxWidth: 400 }}>
      {["Ion Popescu — CEO", "Ana Moldovan — HR & Payroll", "Bogdan Costea — Worker"].map(
        (name) => (
          <GlassSwipeActions
            key={name}
            actions={[
              {
                label: "Edit",
                color: "rgba(10,132,255,0.8)",
                onAction: () => console.log("edit", name),
              },
              {
                label: "Delete",
                color: "rgba(255,59,48,0.8)",
                onAction: () => console.log("delete", name),
              },
            ]}
            actionWidth={72}
          >
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(255,255,255,0.06)",
                borderRadius: 12,
                marginBottom: 8,
                color: "var(--prv-text-1)",
                fontSize: 14,
              }}
            >
              {name}
            </div>
          </GlassSwipeActions>
        )
      )}
    </div>
  ),
}

export const Testimonials: Story = {
  name: "Testimonials",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
      <GlassTestimonial
        quote="PRV transformed how we manage our renovation teams. We went from spreadsheets to a full operating system in weeks."
        author="Ion Popescu"
        role="CEO, PRV Renovations"
        rating={5}
      />
      <GlassTestimonial
        quote="The HR module alone saved us 20 hours per week. Payroll is automated, attendance is real-time, and the app is beautiful."
        author="Ana Moldovan"
        role="HR & Payroll Manager"
        rating={5}
      />
    </div>
  ),
}
