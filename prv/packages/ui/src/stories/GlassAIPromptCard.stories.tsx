import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassAIPromptCard } from "../components/glass-ai-prompt-card"

const meta: Meta<typeof GlassAIPromptCard> = {
  title: "Glass Display/GlassAIPromptCard",
  component: GlassAIPromptCard,
  parameters: { layout: "centered" },
}

export default meta
type Story = StoryObj<typeof GlassAIPromptCard>

export const Cards: Story = {
  name: "AI Prompt Cards",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 380 }}>
      <GlassAIPromptCard
        title="Summarize this month's performance"
        description="Generate a full KPI summary for October 2024"
        onSelect={(t) => console.log("selected:", t)}
      />
      <GlassAIPromptCard
        title="Draft payroll adjustment email"
        description="Write a professional email to HR about salary review"
        onSelect={(t) => console.log("selected:", t)}
      />
      <GlassAIPromptCard
        title="Predict next quarter revenue"
        description="AI forecast based on last 12 months of data"
        onSelect={(t) => console.log("selected:", t)}
      />
    </div>
  ),
}

export const Chips: Story = {
  name: "AI Prompt Chips",
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {["Summarize", "Draft email", "Analyze trends", "Generate report", "Predict"].map((label) => (
        <GlassAIPromptCard
          key={label}
          variant="chip"
          title={label}
          onSelect={(t) => console.log("selected:", t)}
        />
      ))}
    </div>
  ),
}
