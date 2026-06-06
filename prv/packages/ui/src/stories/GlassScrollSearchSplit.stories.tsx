import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassScrollArea } from "../components/glass-scroll-area"
import { GlassSearchOverlay, GlassSearchBar } from "../components/glass-search-overlay"
import { GlassSplitView } from "../components/glass-split-view"

const meta: Meta = {
  title: "Glass Navigation/ScrollSearchSplit",
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj

export const ScrollArea: Story = {
  name: "Scroll Area",
  render: () => (
    <GlassScrollArea maxHeight={200} axis="vertical">
      {Array.from({ length: 20 }, (_, i) => (
        <div
          key={i}
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            color: "var(--prv-text-2)",
            fontSize: 13,
          }}
        >
          Row {i + 1} — Employee record
        </div>
      ))}
    </GlassScrollArea>
  ),
}

export const SearchOverlay: Story = {
  name: "Search Overlay",
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <GlassSearchBar
          onOpen={() => setOpen(true)}
          placeholder="Search employees, stores, documents…"
        />
        <GlassSearchOverlay
          open={open}
          onClose={() => setOpen(false)}
          scopes={[
            { id: "all", label: "All" },
            { id: "employees", label: "Employees" },
            { id: "projects", label: "Projects" },
            { id: "documents", label: "Documents" },
          ]}
          sections={[
            {
              id: "employees",
              title: "Employees",
              items: [
                { id: "1", label: "Ion Popescu", meta: "CEO · Leadership" },
                { id: "2", label: "Ana Moldovan", meta: "HR & Payroll" },
              ],
            },
            {
              id: "projects",
              title: "Projects",
              items: [{ id: "3", label: "Bathroom Remodel #142", meta: "In Progress · €12,400" }],
            },
          ]}
          onSelect={(item) => {
            console.log("selected:", item)
            setOpen(false)
          }}
        />
      </>
    )
  },
}

export const SplitView: Story = {
  name: "Split View",
  render: () => (
    <div style={{ height: 300 }}>
      <GlassSplitView
        left={
          <div style={{ padding: 16 }}>
            <p
              style={{
                color: "var(--prv-text-1)",
                fontWeight: 600,
                fontSize: 14,
                marginBottom: 12,
              }}
            >
              Employees
            </p>
            {["Ion Popescu", "Ana Moldovan", "Gheorghe Vasile", "Livia Marin"].map((name) => (
              <div
                key={name}
                style={{
                  padding: "8px 0",
                  color: "var(--prv-text-2)",
                  fontSize: 13,
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {name}
              </div>
            ))}
          </div>
        }
        right={
          <div style={{ padding: 16 }}>
            <p
              style={{
                color: "var(--prv-text-1)",
                fontWeight: 600,
                fontSize: 14,
                marginBottom: 12,
              }}
            >
              Ion Popescu
            </p>
            <p style={{ color: "var(--prv-text-2)", fontSize: 13, marginBottom: 6 }}>Role: CEO</p>
            <p style={{ color: "var(--prv-text-2)", fontSize: 13, marginBottom: 6 }}>
              Department: Leadership
            </p>
            <p style={{ color: "var(--prv-text-2)", fontSize: 13 }}>Joined: Jan 2021</p>
          </div>
        }
      />
    </div>
  ),
}
