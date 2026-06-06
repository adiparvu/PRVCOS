import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassBreadcrumb } from "../components/glass-breadcrumb"
import { GlassBottomToolbar } from "../components/glass-bottom-toolbar"
import { GlassPagination } from "../components/glass-pagination"
import { GlassDivider } from "../components/glass-divider"

const meta: Meta = {
  title: "Glass Navigation/NavComponents",
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj

export const Breadcrumb: Story = {
  name: "Breadcrumb",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <GlassBreadcrumb
        items={[
          { label: "PRV Group" },
          { label: "PRV Renovations" },
          { label: "Projects" },
          { label: "Bathroom Remodel #142" },
        ]}
        onItemClick={(item, i) => console.log("nav to:", item.label, i)}
      />
      <GlassBreadcrumb
        variant="floating"
        items={[{ label: "Dashboard" }, { label: "Employees" }, { label: "Ion Popescu" }]}
      />
    </div>
  ),
}

export const BottomToolbar: Story = {
  name: "Bottom Toolbar",
  render: () => (
    <div style={{ position: "relative", height: 120, display: "flex", alignItems: "flex-end" }}>
      <GlassBottomToolbar
        items={[
          { icon: "✏️", label: "Edit", onClick: () => console.log("edit") },
          { icon: "↗", label: "Share", onClick: () => console.log("share") },
          { icon: "⊡", label: "Archive", onClick: () => console.log("archive") },
        ]}
        fab={{ icon: "＋", onClick: () => console.log("add"), ariaLabel: "Add" }}
      />
    </div>
  ),
}

export const Pagination: Story = {
  name: "Pagination",
  render: () => {
    const [page, setPage] = useState(1)
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <GlassPagination page={page} total={247} pageSize={10} onChange={setPage} />
        <GlassPagination page={page} total={247} pageSize={10} onChange={setPage} compact />
      </div>
    )
  },
}

export const Dividers: Story = {
  name: "Dividers",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: 300 }}>
      <GlassDivider />
      <GlassDivider label="or" />
      <GlassDivider variant="dashed" />
      <div style={{ display: "flex", gap: 12, height: 40, alignItems: "center" }}>
        <span style={{ color: "var(--prv-text-2)", fontSize: 13 }}>Left</span>
        <GlassDivider orientation="vertical" />
        <span style={{ color: "var(--prv-text-2)", fontSize: 13 }}>Right</span>
      </div>
    </div>
  ),
}
