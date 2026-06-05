import type { Meta, StoryObj } from "@storybook/react"
import { GlassInput } from "../components/glass-input"

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

const meta: Meta<typeof GlassInput> = {
  title: "Glass Surfaces/GlassInput",
  component: GlassInput,
  argTypes: {
    label: { control: "text" },
    hint: { control: "text" },
    error: { control: "text" },
    disabled: { control: "boolean" },
  },
  args: {
    label: "Field label",
    placeholder: "Placeholder text…",
  },
}

export default meta
type Story = StoryObj<typeof GlassInput>

export const Default: Story = {
  name: "Default",
  args: { label: "Company name", placeholder: "PRV Renovations S.R.L." },
}

export const WithHint: Story = {
  name: "With Hint",
  args: {
    label: "Email address",
    placeholder: "you@company.com",
    hint: "Must be your corporate email",
  },
}

export const WithError: Story = {
  name: "Error State",
  args: {
    label: "Email address",
    value: "not-an-email",
    error: "Please enter a valid email address",
  },
}

export const WithIcon: Story = {
  name: "With Left Icon",
  args: {
    label: "Search",
    placeholder: "Search employees…",
    leftIcon: <SearchIcon />,
  },
}

export const Disabled: Story = {
  name: "Disabled",
  args: {
    label: "Read-only field",
    value: "Cannot edit this",
    disabled: true,
  },
}
