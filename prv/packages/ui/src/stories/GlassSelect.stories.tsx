import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassSelect } from "../components/glass-select"

const ROLES = [
  { value: "ceo", label: "CEO" },
  { value: "operations_manager", label: "Operations Manager" },
  { value: "department_head", label: "Department Head" },
  { value: "team_leader", label: "Team Leader" },
  { value: "worker", label: "Worker" },
  { value: "project_director", label: "Project Director" },
  { value: "store_manager", label: "Store Manager" },
  { value: "data_analyst", label: "Data Analyst" },
]

const meta: Meta<typeof GlassSelect> = {
  title: "Glass Forms/GlassSelect",
  component: GlassSelect,
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    searchable: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: { size: "md", searchable: false, disabled: false },
}

export default meta
type Story = StoryObj<typeof GlassSelect>

export const Default: Story = {
  name: "Default",
  render: (args) => {
    const [value, setValue] = useState("")
    return (
      <div style={{ maxWidth: 280 }}>
        <GlassSelect
          {...args}
          items={ROLES}
          value={value}
          onChange={setValue}
          placeholder="Select role"
        />
      </div>
    )
  },
}

export const Searchable: Story = {
  name: "Searchable",
  render: () => {
    const [value, setValue] = useState("")
    return (
      <div style={{ maxWidth: 280 }}>
        <GlassSelect
          items={ROLES}
          value={value}
          onChange={setValue}
          searchable
          placeholder="Search role…"
        />
      </div>
    )
  },
}

export const AllSizes: Story = {
  name: "All Sizes",
  render: () => {
    const [vals, setVals] = useState({ sm: "", md: "ceo", lg: "" })
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 280 }}>
        {(["sm", "md", "lg"] as const).map((size) => (
          <GlassSelect
            key={size}
            size={size}
            items={ROLES}
            value={vals[size]}
            onChange={(v) => setVals((p) => ({ ...p, [size]: v }))}
            placeholder={`Size: ${size}`}
          />
        ))}
      </div>
    )
  },
}

export const Disabled: Story = {
  name: "Disabled",
  render: () => (
    <div style={{ maxWidth: 280 }}>
      <GlassSelect items={ROLES} value="ceo" onChange={() => {}} disabled />
    </div>
  ),
}
