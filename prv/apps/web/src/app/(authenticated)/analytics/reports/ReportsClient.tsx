"use client"

import { useState } from "react"
import { toCsv, type CsvColumn } from "@/lib/csv"

interface Dataset {
  id: string
  label: string
  description: string
  endpoint: string
  arrayKey: string // key in the response holding the row array
  columns: CsvColumn[]
}

const DATASETS: Dataset[] = [
  {
    id: "employee-roi",
    label: "Employee ROI",
    description: "Payroll cost vs completed tasks, cost-per-task and output band, per employee.",
    endpoint: "/api/analytics/employee-roi",
    arrayKey: "employees",
    columns: [
      { key: "name", label: "Employee" },
      { key: "payrollCost", label: "Payroll cost" },
      { key: "tasksCompleted", label: "Tasks completed" },
      { key: "costPerTask", label: "Cost per task" },
      { key: "band", label: "Band" },
      { key: "userId", label: "User ID" },
    ],
  },
  {
    id: "inventory-efficiency",
    label: "Inventory Efficiency",
    description: "On-hand value, sell-through, turnover and days-on-hand per product.",
    endpoint: "/api/analytics/inventory-efficiency",
    arrayKey: "products",
    columns: [
      { key: "name", label: "Product" },
      { key: "currentStock", label: "On hand" },
      { key: "unitsSold", label: "Units sold" },
      { key: "inventoryValue", label: "Inventory value" },
      { key: "cogs", label: "COGS" },
      { key: "turnover", label: "Turnover" },
      { key: "daysOnHand", label: "Days on hand" },
      { key: "band", label: "Band" },
    ],
  },
  {
    id: "demand-forecast",
    label: "Demand Forecast",
    description: "Velocity, days of cover and suggested reorder quantity/value per product.",
    endpoint: "/api/analytics/demand-forecast",
    arrayKey: "products",
    columns: [
      { key: "name", label: "Product" },
      { key: "currentStock", label: "On hand" },
      { key: "dailyVelocity", label: "Daily velocity" },
      { key: "daysOfCover", label: "Days of cover" },
      { key: "projectedDemand", label: "Projected demand" },
      { key: "reorderPoint", label: "Reorder point" },
      { key: "suggestedReorderQty", label: "Suggested qty" },
      { key: "suggestedReorderValue", label: "Suggested value" },
      { key: "band", label: "Plan" },
    ],
  },
  {
    id: "project-profitability",
    label: "Project Profitability",
    description: "Revenue, cost, profit, margin and budget usage per project.",
    endpoint: "/api/analytics/project-profitability",
    arrayKey: "projects",
    columns: [
      { key: "name", label: "Project" },
      { key: "revenue", label: "Revenue" },
      { key: "cost", label: "Cost" },
      { key: "profit", label: "Profit" },
      { key: "marginPct", label: "Margin %" },
      { key: "budgetUsedPct", label: "Budget used %" },
      { key: "band", label: "Band" },
    ],
  },
  {
    id: "safety",
    label: "Safety — by type",
    description: "Incident counts broken down by incident type.",
    endpoint: "/api/analytics/safety",
    arrayKey: "byType",
    columns: [
      { key: "type", label: "Incident type" },
      { key: "count", label: "Count" },
    ],
  },
  {
    id: "attendance-watchlist",
    label: "Attendance Watchlist",
    description: "Employees under 95% attendance — scheduled days, absences, rate and band.",
    endpoint: "/api/analytics/attendance",
    arrayKey: "watchlist",
    columns: [
      { key: "name", label: "Employee" },
      { key: "scheduledDays", label: "Scheduled days" },
      { key: "present", label: "Present" },
      { key: "late", label: "Late" },
      { key: "absent", label: "Absent" },
      { key: "attendanceRate", label: "Attendance %" },
      { key: "band", label: "Band" },
    ],
  },
]

function download(filename: string, csv: string): void {
  // Prepend a UTF-8 BOM so Excel detects encoding correctly.
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function ReportCard({ ds }: { ds: Dataset }) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle")

  async function onDownload() {
    setState("loading")
    try {
      const res = await fetch(ds.endpoint)
      if (!res.ok) throw new Error("fetch failed")
      const json = (await res.json()) as Record<string, unknown>
      const rows = (json[ds.arrayKey] as Record<string, unknown>[] | undefined) ?? []
      download(`${ds.id}.csv`, toCsv(rows, ds.columns))
      setState("idle")
    } catch {
      setState("error")
    }
  }

  return (
    <div
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border)",
        borderRadius: 20,
        padding: "18px 20px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 24px 64px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <h2 style={{ fontSize: 15, fontWeight: 600 }}>{ds.label}</h2>
      <p style={{ color: "var(--prv-text-3)", fontSize: 12.5, lineHeight: 1.5, flex: 1 }}>
        {ds.description}
      </p>
      <div style={{ color: "var(--prv-text-3)", fontSize: 11, marginTop: 2 }}>
        {ds.columns.length} columns
      </div>
      <button
        onClick={onDownload}
        disabled={state === "loading"}
        style={{
          marginTop: 12,
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          background: state === "error" ? "transparent" : "#fff",
          color: state === "error" ? "rgba(255,105,97,0.95)" : "#000",
          border: state === "error" ? "1px solid rgba(255,105,97,0.36)" : "0",
          borderRadius: 10,
          padding: "8px 14px",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: state === "loading" ? "default" : "pointer",
          opacity: state === "loading" ? 0.6 : 1,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
        }}
      >
        {state === "loading"
          ? "Preparing…"
          : state === "error"
            ? "Retry download"
            : "⭳ Download CSV"}
      </button>
    </div>
  )
}

export function ReportsClient() {
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Reports</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · export any dataset as CSV
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          marginTop: 26,
        }}
      >
        {DATASETS.map((ds) => (
          <ReportCard key={ds.id} ds={ds} />
        ))}
      </div>
    </div>
  )
}
