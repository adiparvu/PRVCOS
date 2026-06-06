"use client"

import React from "react"
import { useSheetStack } from "@prv/ui"

export interface ConfirmSheetConfig {
  icon?: React.ReactNode
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel?: () => void
}

export function useConfirmSheet() {
  const { openSheet } = useSheetStack()

  function openConfirmSheet(config: ConfirmSheetConfig): string {
    return openSheet({
      snapPoints: ["peek"],
      defaultSnap: "peek",
      render: (onClose) => (
        <ConfirmSheetContent
          {...config}
          onConfirm={() => {
            config.onConfirm()
            onClose()
          }}
          onCancel={() => {
            config.onCancel?.()
            onClose()
          }}
        />
      ),
    })
  }

  return { openConfirmSheet }
}

function ConfirmSheetContent({
  icon,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmSheetConfig & { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 12,
        padding: "8px 20px 32px",
      }}
    >
      {icon && (
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: destructive ? "rgba(255,59,48,0.12)" : "var(--prv-g2)",
            border: `1px solid ${destructive ? "rgba(255,59,48,0.2)" : "var(--prv-border)"}`,
            color: destructive ? "rgba(255,99,90,0.9)" : "var(--prv-text-2)",
          }}
        >
          {icon}
        </div>
      )}
      <div>
        <p style={{ fontSize: 17, fontWeight: 600, color: "var(--prv-text-1)", margin: 0 }}>
          {title}
        </p>
        {description && (
          <p
            style={{
              fontSize: 14,
              color: "var(--prv-text-3)",
              margin: "6px 0 0",
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        )}
      </div>
      <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 4 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: 14,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border)",
            color: "var(--prv-text-1)",
            fontSize: 15,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: 14,
            background: destructive ? "rgba(255,59,48,0.80)" : "rgba(255,255,255,0.92)",
            border: "none",
            color: destructive ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.9)",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}
