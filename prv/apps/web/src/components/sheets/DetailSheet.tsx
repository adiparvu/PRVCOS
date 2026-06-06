"use client"

import React from "react"
import { useSheetStack } from "@prv/ui"
import type { SnapPoint } from "@prv/ui"

export interface DetailSheetSection {
  label: string
  value: React.ReactNode
}

export interface DetailSheetConfig {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  sections?: DetailSheetSection[]
  actions?: Array<{
    label: string
    destructive?: boolean
    onClick: (onClose: () => void) => void
  }>
  snapPoints?: SnapPoint[]
  children?: React.ReactNode
}

export function useDetailSheet() {
  const { openSheet } = useSheetStack()

  function openDetailSheet(config: DetailSheetConfig): string {
    return openSheet({
      snapPoints: config.snapPoints ?? ["mid", "full"],
      defaultSnap: "mid",
      title: config.title,
      render: (onClose) => <DetailSheetContent config={config} onClose={onClose} />,
    })
  }

  return { openDetailSheet }
}

function DetailSheetContent({
  config,
  onClose,
}: {
  config: DetailSheetConfig
  onClose: () => void
}) {
  return (
    <div style={{ padding: "4px 20px 32px" }}>
      {(config.icon || config.subtitle) && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          {config.icon && (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--prv-g2)",
                border: "1px solid var(--prv-border)",
                color: "var(--prv-text-2)",
                flexShrink: 0,
              }}
            >
              {config.icon}
            </div>
          )}
          {config.subtitle && (
            <p style={{ fontSize: 13, color: "var(--prv-text-3)", margin: 0 }}>{config.subtitle}</p>
          )}
        </div>
      )}

      {config.sections && config.sections.length > 0 && (
        <div
          style={{
            borderRadius: 16,
            border: "1px solid var(--prv-border-subtle)",
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          {config.sections.map((section, i) => (
            <div
              key={section.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderBottom:
                  i < (config.sections?.length ?? 0) - 1
                    ? "1px solid var(--prv-border-subtle)"
                    : "none",
                background: "var(--prv-g1)",
              }}
            >
              <span style={{ fontSize: 14, color: "var(--prv-text-3)" }}>{section.label}</span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--prv-text-1)",
                  textAlign: "right",
                }}
              >
                {section.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {config.children}

      {config.actions && config.actions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          {config.actions.map((action, i) => (
            <button
              key={i}
              onClick={() => action.onClick(onClose)}
              style={{
                width: "100%",
                padding: "13px 16px",
                borderRadius: 14,
                background: action.destructive ? "rgba(255,59,48,0.10)" : "var(--prv-g2)",
                border: `1px solid ${action.destructive ? "rgba(255,59,48,0.2)" : "var(--prv-border)"}`,
                color: action.destructive ? "rgba(255,99,90,0.9)" : "var(--prv-text-1)",
                fontSize: 15,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
