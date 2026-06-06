import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassComboBox, type ComboBoxOption } from "../components/glass-combobox"
import { GlassColorPicker } from "../components/glass-color-picker"
import { GlassDatePicker } from "../components/glass-date-picker"
import { GlassNumberStepper } from "../components/glass-number-stepper"
import { GlassOTPInput } from "../components/glass-otp-input"
import { GlassRangeSlider } from "../components/glass-range-slider"
import { GlassRating } from "../components/glass-rating"
import { GlassQuantityStepper } from "../components/glass-quantity-stepper"
import { GlassTimeSlotPicker } from "../components/glass-time-slot-picker"

const meta: Meta = {
  title: "Glass Forms/Extended Inputs",
  parameters: { layout: "centered" },
}

export default meta
type Story = StoryObj

const DEPARTMENTS: ComboBoxOption[] = [
  { value: "leadership", label: "Leadership" },
  { value: "hr", label: "Human Resources" },
  { value: "operations", label: "Operations" },
  { value: "field_ops", label: "Field Ops" },
  { value: "projects", label: "Projects" },
  { value: "intelligence", label: "Intelligence" },
  { value: "sales", label: "Sales" },
]

export const ComboBox: Story = {
  name: "ComboBox",
  render: () => {
    const [val, setVal] = useState<string | null>(null)
    return (
      <div style={{ width: 280 }}>
        <GlassComboBox
          options={DEPARTMENTS}
          value={val}
          onChange={setVal}
          placeholder="Select department…"
        />
      </div>
    )
  },
}

export const ColorPicker: Story = {
  name: "Color Picker",
  render: () => {
    const [color, setColor] = useState("#0A84FF")
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <GlassColorPicker value={color} onChange={setColor} />
        <p style={{ color: "var(--prv-text-2)", fontSize: 13 }}>Selected: {color}</p>
      </div>
    )
  },
}

export const DatePicker: Story = {
  name: "Date Picker",
  render: () => {
    const [date, setDate] = useState<Date | null>(null)
    return (
      <div style={{ width: 260 }}>
        <GlassDatePicker value={date} onChange={setDate} placeholder="Select hire date…" />
      </div>
    )
  },
}

export const NumberStepper: Story = {
  name: "Number Stepper",
  render: () => {
    const [qty, setQty] = useState(5)
    const [budget, setBudget] = useState(1000)
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <p style={{ color: "var(--prv-text-2)", fontSize: 12, marginBottom: 8 }}>Team size</p>
          <GlassNumberStepper value={qty} onChange={setQty} min={1} max={50} />
        </div>
        <div>
          <p style={{ color: "var(--prv-text-2)", fontSize: 12, marginBottom: 8 }}>Budget</p>
          <GlassNumberStepper value={budget} onChange={setBudget} min={0} step={100} unit="€" />
        </div>
      </div>
    )
  },
}

export const OTPInput: Story = {
  name: "OTP Input",
  render: () => {
    const [otp, setOtp] = useState("")
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
        <GlassOTPInput
          length={6}
          value={otp}
          onChange={setOtp}
          onComplete={(v) => console.log("complete:", v)}
          autoFocus
        />
        <p style={{ color: "var(--prv-text-2)", fontSize: 13 }}>{otp || "Enter code…"}</p>
      </div>
    )
  },
}

export const RangeSlider: Story = {
  name: "Range Slider",
  render: () => {
    const [range, setRange] = useState<[number, number]>([2000, 8000])
    return (
      <div style={{ width: 320 }}>
        <GlassRangeSlider
          min={0}
          max={15000}
          value={range}
          onChange={setRange}
          formatLabel={(v) => `${(v / 1000).toFixed(0)}k €`}
          step={500}
        />
      </div>
    )
  },
}

export const Rating: Story = {
  name: "Rating",
  render: () => {
    const [val, setVal] = useState(4)
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <GlassRating value={val} onChange={setVal} showValue count={128} />
        <GlassRating value={3.5} readonly allowHalf showValue count={42} />
        <GlassRating value={5} readonly size="sm" />
      </div>
    )
  },
}

export const QuantityStepper: Story = {
  name: "Quantity Stepper",
  render: () => {
    const [qty, setQty] = useState(1)
    return (
      <GlassQuantityStepper
        value={qty}
        onChange={setQty}
        onRemove={() => console.log("remove")}
        max={10}
      />
    )
  },
}

export const TimeSlotPicker: Story = {
  name: "Time Slot Picker",
  render: () => {
    const [slot, setSlot] = useState<string | null>("10:00")
    const slots = [
      "08:00",
      "09:00",
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
    ]
    return (
      <div style={{ width: 360 }}>
        <GlassTimeSlotPicker
          slots={slots}
          value={slot}
          onChange={setSlot}
          takenSlots={["09:00", "13:00", "16:00"]}
        />
      </div>
    )
  },
}
