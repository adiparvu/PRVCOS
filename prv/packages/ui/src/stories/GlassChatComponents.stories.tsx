import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassChatBubble } from "../components/glass-chat-bubble"
import { GlassChatComposer } from "../components/glass-chat-composer"
import { GlassTypingIndicator } from "../components/glass-typing-indicator"

const meta: Meta = {
  title: "Glass Display/Chat",
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj

export const ChatBubbles: Story = {
  name: "Chat Bubbles",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 480 }}>
      <GlassChatBubble role="assistant" meta="PRV AI · 10:42">
        Good morning! You have 3 critical alerts and 12 pending approvals. Revenue is up 8% vs last
        month.
      </GlassChatBubble>
      <GlassChatBubble role="user" status="read">
        What are the critical alerts?
      </GlassChatBubble>
      <GlassChatBubble role="assistant" meta="PRV AI · 10:42">
        1. Store #4 inventory below threshold · 2. Employee Livia Marin — shift uncovered tomorrow ·
        3. Project #142 delayed by 3 days
      </GlassChatBubble>
      <GlassTypingIndicator label="PRV AI is thinking…" />
    </div>
  ),
}

export const Composer: Story = {
  name: "Chat Composer",
  render: () => {
    const [val, setVal] = useState("")
    return (
      <div style={{ maxWidth: 480 }}>
        <GlassChatComposer
          value={val}
          onChange={setVal}
          onSend={(msg) => {
            console.log("send:", msg)
            setVal("")
          }}
          placeholder="Ask PRV AI anything…"
          attachable
          voice
        />
      </div>
    )
  },
}
