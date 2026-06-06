import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassSteps } from "../components/glass-steps"
import { GlassButton } from "../components/glass-button"

const ONBOARDING_STEPS = [
  { id: "account", label: "Account", sublabel: "Create account" },
  { id: "company", label: "Company", sublabel: "Set up your company" },
  { id: "roles", label: "Roles", sublabel: "Configure roles" },
  { id: "invite", label: "Invite", sublabel: "Invite team members" },
  { id: "done", label: "Done", sublabel: "Review & launch" },
]

const meta: Meta<typeof GlassSteps> = {
  title: "Glass Navigation/GlassSteps",
  component: GlassSteps,
  argTypes: {
    variant: { control: "select", options: ["h", "v"] },
    animated: { control: "boolean" },
    showNav: { control: "boolean" },
  },
  args: { variant: "h", animated: true },
}

export default meta
type Story = StoryObj<typeof GlassSteps>

export const Horizontal: Story = {
  name: "Horizontal",
  render: (args) => {
    const [step, setStep] = useState(1)
    return (
      <div style={{ maxWidth: 600, display: "flex", flexDirection: "column", gap: 32 }}>
        <GlassSteps
          {...args}
          steps={ONBOARDING_STEPS}
          currentStep={step}
          showNav
          onNext={() => setStep((s) => Math.min(s + 1, ONBOARDING_STEPS.length - 1))}
          onPrev={() => setStep((s) => Math.max(s - 1, 0))}
        />
        <p style={{ fontSize: 14, color: "var(--prv-text-2)" }}>
          Current step: {ONBOARDING_STEPS[step]?.label}
        </p>
      </div>
    )
  },
}

export const Vertical: Story = {
  name: "Vertical",
  render: () => {
    const [step, setStep] = useState(2)
    return (
      <div style={{ maxWidth: 280 }}>
        <GlassSteps variant="v" steps={ONBOARDING_STEPS} currentStep={step} onStepClick={setStep} />
      </div>
    )
  },
}

export const Complete: Story = {
  name: "All Completed",
  render: () => (
    <div style={{ maxWidth: 600 }}>
      <GlassSteps steps={ONBOARDING_STEPS} currentStep={ONBOARDING_STEPS.length} />
    </div>
  ),
}
