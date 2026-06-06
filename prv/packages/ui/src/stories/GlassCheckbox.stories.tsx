import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassCheckbox, GlassRadioGroup } from "../components/glass-checkbox"

const meta: Meta<typeof GlassCheckbox> = {
  title: "Glass Forms/GlassCheckbox",
  component: GlassCheckbox,
  argTypes: {
    disabled: { control: "boolean" },
    indeterminate: { control: "boolean" },
  },
  args: { checked: false, disabled: false },
}

export default meta
type Story = StoryObj<typeof GlassCheckbox>

export const Default: Story = {
  name: "Checkbox",
  render: (args) => {
    const [checked, setChecked] = useState(false)
    return <GlassCheckbox {...args} checked={checked} onChange={setChecked} label="Accept terms" />
  },
}

export const Indeterminate: Story = {
  name: "Indeterminate",
  render: () => {
    const [checked, setChecked] = useState(false)
    return (
      <GlassCheckbox
        checked={checked}
        indeterminate={true}
        onChange={setChecked}
        label="Select all"
        hint="3 of 7 items selected"
      />
    )
  },
}

export const Disabled: Story = {
  name: "Disabled States",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <GlassCheckbox checked={true} onChange={() => {}} disabled label="Checked (disabled)" />
      <GlassCheckbox checked={false} onChange={() => {}} disabled label="Unchecked (disabled)" />
    </div>
  ),
}

export const CheckboxGroup: Story = {
  name: "Checkbox Group",
  render: () => {
    const [selected, setSelected] = useState<string[]>(["analytics"])
    const items = [
      { id: "analytics", label: "Analytics", hint: "View reports and dashboards" },
      { id: "exports", label: "Data exports", hint: "Download CSV/Excel reports" },
      { id: "invoices", label: "Invoices", hint: "Create and send invoices" },
      { id: "employees", label: "Employee management", hint: "Add and edit team members" },
    ]
    const toggle = (id: string) =>
      setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 340 }}>
        <p
          style={{
            fontSize: 11,
            color: "var(--prv-text-3)",
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Module access
        </p>
        {items.map((item) => (
          <GlassCheckbox
            key={item.id}
            checked={selected.includes(item.id)}
            onChange={() => toggle(item.id)}
            label={item.label}
            hint={item.hint}
          />
        ))}
      </div>
    )
  },
}

export const RadioGroupDefault: Story = {
  name: "Radio Group",
  render: () => {
    const [value, setValue] = useState("ceo")
    return (
      <GlassRadioGroup
        items={[
          { value: "ceo", label: "CEO", description: "Full company access" },
          {
            value: "operations_manager",
            label: "Operations Manager",
            description: "Company-wide operations",
          },
          { value: "team_leader", label: "Team Leader", description: "Team-level visibility" },
          { value: "worker", label: "Worker", description: "Own records only" },
        ]}
        value={value}
        onChange={setValue}
      />
    )
  },
}

export const RadioGroupDisabled: Story = {
  name: "Radio Group · Disabled",
  render: () => (
    <GlassRadioGroup
      items={[
        { value: "a", label: "Option A" },
        { value: "b", label: "Option B" },
        { value: "c", label: "Option C" },
      ]}
      value="a"
      onChange={() => {}}
      disabled
    />
  ),
}
