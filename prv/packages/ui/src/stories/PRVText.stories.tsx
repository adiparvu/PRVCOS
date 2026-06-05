import type { Meta, StoryObj } from "@storybook/react"
import { PRVText } from "../components/prv-text"
import type { TextVariant, TextColor } from "../components/prv-text"

const meta: Meta<typeof PRVText> = {
  title: "Typography/PRVText",
  component: PRVText,
  argTypes: {
    variant: {
      control: "select",
      options: [
        "largeTitle",
        "title1",
        "title2",
        "title3",
        "headline",
        "body",
        "callout",
        "subheadline",
        "footnote",
        "caption1",
        "caption2",
      ],
    },
    color: { control: "select", options: ["primary", "secondary", "tertiary", "disabled"] },
    truncate: { control: "boolean" },
  },
  args: {
    variant: "body",
    children: "The quick brown fox jumped over the lazy dog.",
  },
}

export default meta
type Story = StoryObj<typeof PRVText>

export const Body: Story = {
  args: { variant: "body", children: "This is body text at 17px regular weight." },
}

export const Headline: Story = {
  args: { variant: "headline", children: "Section Headline" },
}

export const LargeTitle: Story = {
  args: { variant: "largeTitle", children: "Command Center" },
}

export const FullScale: Story = {
  name: "Full HIG Scale",
  render: () => {
    const entries: Array<{ variant: TextVariant; label: string; text: string }> = [
      { variant: "largeTitle", label: "34 / Bold", text: "Command Center" },
      { variant: "title1", label: "28 / Bold", text: "Revenue Overview" },
      { variant: "title2", label: "22 / Bold", text: "Active Projects" },
      { variant: "title3", label: "20 / Semibold", text: "Employee Performance" },
      { variant: "headline", label: "17 / Semibold", text: "Store Cluj-Napoca · 14 employees" },
      {
        variant: "body",
        label: "17 / Regular",
        text: "The project is currently on track with all milestones.",
      },
      {
        variant: "callout",
        label: "16 / Regular",
        text: "Last updated 3 hours ago by Alexandru Ionescu",
      },
      {
        variant: "subheadline",
        label: "15 / Regular",
        text: "Contract value · 48,000 RON / Completion 87%",
      },
      {
        variant: "footnote",
        label: "13 / Regular",
        text: "Approved by CEO on 14 March 2026 · requires countersignature",
      },
      { variant: "caption1", label: "12 / Regular", text: "Updated 2 minutes ago" },
      { variant: "caption2", label: "11 / Regular", text: "STORE_ID: CLJ-001 · TIN: RO12345678" },
    ]

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {entries.map(({ variant, label, text }) => (
          <div
            key={variant}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 24,
              padding: "14px 0",
              borderBottom: "1px solid var(--prv-border)",
            }}
          >
            <div style={{ width: 140, flexShrink: 0 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--prv-text-2)",
                  marginBottom: 2,
                }}
              >
                {variant}
              </p>
              <p style={{ fontSize: 11, color: "var(--prv-text-3)" }}>{label}</p>
            </div>
            <PRVText variant={variant}>{text}</PRVText>
          </div>
        ))}
      </div>
    )
  },
}

export const ColorVariants: Story = {
  name: "Color Variants",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {(["primary", "secondary", "tertiary", "disabled"] as TextColor[]).map((color) => (
        <PRVText key={color} variant="body" color={color}>
          {color.charAt(0).toUpperCase() + color.slice(1)} — rgba opacity hierarchy
        </PRVText>
      ))}
    </div>
  ),
}

export const Truncated: Story = {
  name: "Truncated",
  render: () => (
    <div style={{ maxWidth: 280 }}>
      <PRVText variant="subheadline" truncate>
        This text is very long and will be truncated with an ellipsis at the container edge
      </PRVText>
    </div>
  ),
}
