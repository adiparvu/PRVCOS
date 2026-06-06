"use client"

import React, { useState } from "react"
import { useSheetStack } from "@prv/ui"

export interface FilterOption {
  id: string
  label: string
}

export interface FilterSection {
  key: string
  label: string
  options: FilterOption[]
  multiple?: boolean
}

export interface FilterSheetConfig {
  title?: string
  sections: FilterSection[]
  initialValues?: Record<string, string[]>
  onApply: (values: Record<string, string[]>) => void
}

export function useFilterSheet() {
  const { openSheet } = useSheetStack()

  function openFilterSheet(config: FilterSheetConfig): string {
    return openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: config.title ?? "Filters",
      render: (onClose) => (
        <FilterSheetContent
          sections={config.sections}
          initialValues={config.initialValues ?? {}}
          onApply={(values) => {
            config.onApply(values)
            onClose()
          }}
          onClose={onClose}
        />
      ),
    })
  }

  return { openFilterSheet }
}

function FilterSheetContent({
  sections,
  initialValues,
  onApply,
}: {
  sections: FilterSection[]
  initialValues: Record<string, string[]>
  onApply: (values: Record<string, string[]>) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<Record<string, string[]>>(initialValues)

  const toggle = (key: string, optId: string, multiple: boolean) => {
    setSelected((prev) => {
      const current = prev[key] ?? []
      if (multiple) {
        return {
          ...prev,
          [key]: current.includes(optId) ? current.filter((x) => x !== optId) : [...current, optId],
        }
      }
      return { ...prev, [key]: current[0] === optId ? [] : [optId] }
    })
  }

  const activeCount = Object.values(selected).flat().length

  return (
    <div style={{ padding: "0 16px 32px" }}>
      {sections.map((section) => (
        <div
          key={section.key}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 0",
            borderBottom: "1px solid var(--prv-border-subtle)",
          }}
        >
          <span
            style={{ fontSize: 14, color: "var(--prv-text-1)", flexShrink: 0, marginRight: 12 }}
          >
            {section.label}
          </span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {section.options.map((opt) => {
              const active = selected[section.key]?.includes(opt.id) ?? false
              return (
                <button
                  key={opt.id}
                  onClick={() => toggle(section.key, opt.id, section.multiple ?? false)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 500,
                    background: active ? "rgba(255,255,255,0.92)" : "var(--prv-g1)",
                    border: `1px solid ${active ? "transparent" : "var(--prv-border)"}`,
                    color: active ? "rgba(0,0,0,0.9)" : "var(--prv-text-2)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button
          onClick={() => onApply(selected)}
          style={{
            flex: 1,
            padding: "13px 16px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.92)",
            border: "none",
            color: "rgba(0,0,0,0.9)",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {activeCount > 0 ? `Apply (${activeCount})` : "Apply"}
        </button>
        <button
          onClick={() => setSelected({})}
          style={{
            padding: "13px 16px",
            borderRadius: 14,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border)",
            color: "var(--prv-text-2)",
            fontSize: 15,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>
    </div>
  )
}
