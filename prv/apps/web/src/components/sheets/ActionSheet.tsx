"use client"

import React from "react"
import { useSheetStack } from "@prv/ui"

export interface ActionSheetAction {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  destructive?: boolean
}

export interface ActionSheetConfig {
  title?: string
  actions: ActionSheetAction[]
  onAction: (id: string) => void
}

export function useActionSheet() {
  const { openSheet } = useSheetStack()

  function openActionSheet(config: ActionSheetConfig): string {
    return openSheet({
      snapPoints: ["mid"],
      defaultSnap: "mid",
      title: config.title,
      render: (onClose) => (
        <ActionSheetContent
          actions={config.actions}
          onAction={(id) => {
            config.onAction(id)
            onClose()
          }}
        />
      ),
    })
  }

  return { openActionSheet }
}

function ActionSheetContent({
  actions,
  onAction,
}: {
  actions: ActionSheetAction[]
  onAction: (id: string) => void
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "4px 16px 32px" }}>
      {actions.map((action, i) => {
        const prevDestructive = i > 0 && actions[i - 1]?.destructive
        const showSep = action.destructive && !prevDestructive && i > 0
        return (
          <React.Fragment key={action.id}>
            {showSep && (
              <div
                role="separator"
                style={{ height: 1, margin: "4px 0", background: "var(--prv-border-subtle)" }}
              />
            )}
            <button
              onClick={() => onAction(action.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderRadius: 16,
                background: "transparent",
                border: "none",
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--prv-g2)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
              }}
            >
              {action.icon && (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    background: action.destructive ? "rgba(255,59,48,0.12)" : "var(--prv-g2)",
                    border: `1px solid ${action.destructive ? "rgba(255,59,48,0.2)" : "var(--prv-border)"}`,
                    color: action.destructive ? "rgba(255,99,90,0.9)" : "var(--prv-text-2)",
                  }}
                >
                  {action.icon}
                </div>
              )}
              <div>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: action.destructive ? "rgba(255,80,70,0.9)" : "var(--prv-text-1)",
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {action.label}
                </p>
                {action.description && (
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--prv-text-3)",
                      margin: "2px 0 0",
                      lineHeight: 1.4,
                    }}
                  >
                    {action.description}
                  </p>
                )}
              </div>
            </button>
          </React.Fragment>
        )
      })}
    </div>
  )
}
