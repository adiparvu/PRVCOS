import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassKanban, type KanbanColumn } from "../components/glass-kanban"

const meta: Meta<typeof GlassKanban> = {
  title: "Glass Display/GlassKanban",
  component: GlassKanban,
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj<typeof GlassKanban>

const COLUMNS: KanbanColumn[] = [
  {
    id: "backlog",
    title: "Backlog",
    cards: [
      { id: "c1", title: "Source tiles for bathroom #142" },
      { id: "c2", title: "Client approval for floor plan" },
      { id: "c3", title: "Order cement mixer rental" },
    ],
  },
  {
    id: "in_progress",
    title: "In Progress",
    color: "rgba(10,132,255,0.6)",
    cards: [
      { id: "c4", title: "Demolition — bathroom #142" },
      { id: "c5", title: "Plumbing rough-in — unit 3B" },
    ],
  },
  {
    id: "review",
    title: "Review",
    color: "rgba(255,149,0,0.6)",
    cards: [{ id: "c6", title: "Electrical inspection sign-off" }],
  },
  {
    id: "done",
    title: "Done",
    color: "rgba(48,209,88,0.6)",
    cards: [
      { id: "c7", title: "Site survey — kitchen remodel" },
      { id: "c8", title: "Material delivery confirmation" },
    ],
  },
]

export const Default: Story = {
  name: "Project Kanban",
  args: {
    columns: COLUMNS,
    onCardMove: (cardId, from, to) => console.log("move:", cardId, from, "→", to),
    onAddCard: (colId) => console.log("add card to:", colId),
  },
}
