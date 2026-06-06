import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassTreeView, type TreeNode } from "../components/glass-tree-view"

const meta: Meta<typeof GlassTreeView> = {
  title: "Glass Display/GlassTreeView",
  component: GlassTreeView,
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj<typeof GlassTreeView>

const ORG_TREE: TreeNode[] = [
  {
    id: "group",
    label: "PRV Group",
    children: [
      {
        id: "renovations",
        label: "PRV Renovations",
        children: [
          {
            id: "field_ops",
            label: "Field Ops",
            children: [
              { id: "team_a", label: "Team A" },
              { id: "team_b", label: "Team B" },
            ],
          },
          { id: "projects", label: "Projects" },
        ],
      },
      {
        id: "shop",
        label: "PRV Shop",
        children: [
          { id: "store_1", label: "Store #1 — Victoriei" },
          { id: "store_4", label: "Store #4 — Unirii" },
        ],
      },
    ],
  },
]

export const OrgTree: Story = {
  name: "Org Structure",
  render: () => {
    const [selected, setSelected] = useState<string | null>("renovations")
    return (
      <div style={{ width: 300 }}>
        <GlassTreeView
          nodes={ORG_TREE}
          selectedId={selected}
          onSelect={(id) => setSelected(id)}
          defaultExpanded={["group", "renovations"]}
        />
      </div>
    )
  },
}
