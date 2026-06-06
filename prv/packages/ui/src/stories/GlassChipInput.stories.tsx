import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassChipInput } from "../components/glass-chip-input"

const meta: Meta<typeof GlassChipInput> = {
  title: "Glass Forms/GlassChipInput",
  component: GlassChipInput,
  argTypes: {
    max: { control: "number" },
    allowDuplicates: { control: "boolean" },
    disabled: { control: "boolean" },
  },
}

export default meta
type Story = StoryObj<typeof GlassChipInput>

export const Default: Story = {
  name: "Default",
  render: (args) => {
    const [value, setValue] = useState<string[]>(["javascript", "typescript"])
    return (
      <div style={{ maxWidth: 400 }}>
        <GlassChipInput
          {...args}
          value={value}
          onChange={setValue}
          placeholder="Add tags…"
          suggestions={["javascript", "typescript", "react", "nextjs", "node", "python", "rust"]}
        />
      </div>
    )
  },
}

export const WithMax: Story = {
  name: "With Max (3 chips)",
  render: () => {
    const [value, setValue] = useState<string[]>(["design", "development"])
    return (
      <div style={{ maxWidth: 400 }}>
        <GlassChipInput
          value={value}
          onChange={setValue}
          max={3}
          placeholder="Add up to 3 skills…"
          showCount
        />
      </div>
    )
  },
}

export const EmailInput: Story = {
  name: "Email Input Pattern",
  render: () => {
    const [value, setValue] = useState<string[]>([])
    return (
      <div style={{ maxWidth: 400 }}>
        <GlassChipInput
          value={value}
          onChange={setValue}
          placeholder="Add email addresses…"
          delimiters={[",", " ", "Enter"]}
        />
      </div>
    )
  },
}

export const Disabled: Story = {
  name: "Disabled",
  render: () => (
    <div style={{ maxWidth: 400 }}>
      <GlassChipInput value={["react", "typescript"]} onChange={() => {}} disabled />
    </div>
  ),
}
