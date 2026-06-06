import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { DynamicIsland } from "../components/dynamic-island"

const meta: Meta<typeof DynamicIsland> = {
  title: "Glass Specialized/DynamicIsland",
  component: DynamicIsland,
  argTypes: {
    state: { control: "select", options: ["idle", "compact", "expanded"] },
    liveActivity: { control: "boolean" },
  },
  args: { state: "idle", liveActivity: false },
}

export default meta
type Story = StoryObj<typeof DynamicIsland>

export const Idle: Story = {
  name: "Idle",
  args: { state: "idle" },
}

export const Compact: Story = {
  name: "Compact",
  args: {
    state: "compact",
    compactContent: (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px" }}>
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.75)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          ↑ 47.200 RON
        </span>
      </div>
    ),
  },
}

export const Expanded: Story = {
  name: "Expanded",
  args: {
    state: "expanded",
    expandedContent: (
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.95)" }}>
          Revenue today
        </p>
        <p
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#fff",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          ₊ 47.200 RON
        </p>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.50)" }}>↑ 12.4% vs yesterday</p>
      </div>
    ),
  },
}

export const WorkerState: Story = {
  name: "Worker — Clock Timer",
  args: {
    state: "compact",
    compactContent: (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px" }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>⏱</span>
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.75)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          3h 24m
        </span>
      </div>
    ),
  },
}

export const StoreManagerState: Story = {
  name: "Store Manager — Revenue",
  args: {
    state: "compact",
    compactContent: (
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 12px" }}>
        <span style={{ fontSize: 11, color: "rgba(48,209,88,0.9)" }}>↑</span>
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.75)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          4.280 RON
        </span>
      </div>
    ),
  },
}

export const AllRoleStates: Story = {
  name: "All Role States",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
      {[
        { label: "CEO", text: "↑ 47K today" },
        { label: "Worker", text: "⏱ 3h 24m" },
        { label: "Team Leader", text: "8/10 on-site" },
        { label: "Store Manager", text: "↑ 4.280 RON" },
        { label: "Project OMS", text: "3 critical" },
        { label: "HR Manager", text: "2 pending" },
        { label: "Finance", text: "3 overdue" },
      ].map(({ label, text }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span
            style={{ fontSize: 12, color: "var(--prv-text-3)", width: 120, textAlign: "right" }}
          >
            {label}
          </span>
          <DynamicIsland
            state="compact"
            compactContent={
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.75)",
                  padding: "0 12px",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {text}
              </span>
            }
          />
        </div>
      ))}
    </div>
  ),
}

export const Interactive: Story = {
  name: "Interactive (click to expand)",
  render: () => {
    const [state, setState] = React.useState<"idle" | "compact" | "expanded">("compact")
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        <DynamicIsland
          state={state}
          onToggle={() => setState((s) => (s === "expanded" ? "compact" : "expanded"))}
          compactContent={
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", padding: "0 12px" }}>
              ↑ 47K today
            </span>
          }
          expandedContent={
            <div style={{ padding: "12px 16px" }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>₊ 47.200 RON</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.50)" }}>
                ↑ 12.4% vs yesterday · Tap to dismiss
              </p>
            </div>
          }
        />
        <p style={{ fontSize: 12, color: "var(--prv-text-3)" }}>Click the island to toggle</p>
      </div>
    )
  },
}
