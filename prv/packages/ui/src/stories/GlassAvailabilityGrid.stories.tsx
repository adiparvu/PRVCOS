import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassAvailabilityGrid, type Availability } from "../components/glass-availability-grid"

const meta: Meta<typeof GlassAvailabilityGrid> = {
  title: "Glass Display/GlassAvailabilityGrid",
  component: GlassAvailabilityGrid,
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj<typeof GlassAvailabilityGrid>

const PEOPLE = ["Ion Popescu", "Ana Moldovan", "Gheorghe Vasile", "Livia Marin", "Bogdan Costea"]
const DAYS = ["Mon 28", "Tue 29", "Wed 30", "Thu 31", "Fri 01"]

function buildDefault(): Record<string, Availability> {
  const val: Record<string, Availability> = {}
  PEOPLE.forEach((p) =>
    DAYS.forEach((d) => {
      val[`${p}__${d}`] = Math.random() < 0.7 ? "yes" : Math.random() < 0.5 ? "maybe" : "no"
    })
  )
  return val
}

export const Default: Story = {
  name: "Team Availability",
  render: () => {
    const [val, setVal] = useState<Record<string, Availability>>(buildDefault)
    return (
      <GlassAvailabilityGrid
        people={PEOPLE}
        days={DAYS}
        value={val}
        onChange={(row, col, next) => setVal((prev) => ({ ...prev, [`${row}__${col}`]: next }))}
        showLegend
      />
    )
  },
}
