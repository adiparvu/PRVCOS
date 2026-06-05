"use client"

import { useEffect, useRef, useCallback } from "react"
import type { SheetState, EntityType } from "./types"
import { useEntityData } from "./hooks/useEntityData"
import { PersonPreviewContent } from "./renderers/PersonPreviewContent"
import { GenericPreviewContent } from "./renderers/GenericPreviewContent"
import { getEntityConfig } from "./registry"

interface Props {
  isOpen: boolean
  sheetState: SheetState
  entityType: EntityType | null
  entityId: string | null
  onStateChange: (state: SheetState) => void
  onClose: () => void
  onAction: (actionId: string, entityType: EntityType, entityId: string) => void
  onNavigate: (href: string) => void
}

const SHEET_HEIGHTS: Record<SheetState, string> = {
  closed: "0px",
  partial: "520px",
  full: "min(720px, 85svh)",
}

const PERSON_TYPES: EntityType[] = ["employee", "client", "supplier"]

export function PreviewSheetRenderer({
  isOpen,
  sheetState,
  entityType,
  entityId,
  onStateChange,
  onClose,
  onAction,
  onNavigate,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef<number | null>(null)
  const { data: payload, isLoading, isError } = useEntityData(entityType, entityId)

  const config = entityType ? getEntityConfig(entityType) : null
  const isPersonEntity = entityType ? PERSON_TYPES.includes(entityType) : false

  // Escape key dismissal
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen, onClose])

  // Drag-to-dismiss handle
  const onDragStart = useCallback((e: React.PointerEvent) => {
    dragStartY.current = e.clientY
  }, [])

  const onDragEnd = useCallback(
    (e: React.PointerEvent) => {
      if (dragStartY.current === null) return
      const delta = e.clientY - dragStartY.current
      dragStartY.current = null
      if (delta > 80) {
        if (sheetState === "full") onStateChange("partial")
        else onClose()
      } else if (delta < -80 && sheetState === "partial") {
        onStateChange("full")
      }
    },
    [sheetState, onStateChange, onClose]
  )

  const handleAction = useCallback(
    (actionId: string) => {
      if (!entityType || !entityId) return
      if (actionId === "view" && config) {
        onNavigate(config.primaryDestination.replace("[id]", entityId))
      } else {
        onAction(actionId, entityType, entityId)
      }
    },
    [entityType, entityId, config, onAction, onNavigate]
  )

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.6)",
          backdropFilter: isOpen ? "blur(12px) saturate(100%)" : "none",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
        aria-hidden
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-50 mx-auto"
        style={{
          maxWidth: "640px",
          height: isOpen ? SHEET_HEIGHTS[sheetState] : "0px",
          transition: "height 320ms cubic-bezier(0.4,0,0.2,1)",
          overflow: "hidden",
        }}
      >
        <div
          className="h-full rounded-t-[32px] flex flex-col"
          style={{
            background: "rgba(18,18,18,0.88)",
            backdropFilter: "blur(64px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderBottom: "none",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.14)",
          }}
        >
          {/* Drag handle */}
          <div
            className="flex items-center justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none shrink-0"
            onPointerDown={onDragStart}
            onPointerUp={onDragEnd}
          >
            <div
              className="rounded-full"
              style={{ width: 36, height: 4, background: "rgba(255,255,255,0.20)" }}
            />
          </div>

          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-3 shrink-0">
            <span className="text-[11px] font-medium text-white/30 uppercase tracking-widest">
              {entityType ?? ""}
            </span>
            <div className="flex items-center gap-2">
              {sheetState === "partial" && (
                <button
                  onClick={() => onStateChange("full")}
                  className="text-[12px] text-white/40 px-2.5 py-1 rounded-[8px] transition-colors hover:bg-white/[0.06]"
                >
                  Expand
                </button>
              )}
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.08]"
                style={{ background: "rgba(255,255,255,0.06)" }}
                aria-label="Close"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="text-white/50"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 pb-6">
            {isLoading && (
              <div className="flex flex-col gap-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-[18px]"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  />
                  <div className="flex-1 space-y-2">
                    <div
                      className="h-4 rounded-full w-2/3"
                      style={{ background: "rgba(255,255,255,0.10)" }}
                    />
                    <div
                      className="h-3 rounded-full w-1/2"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    />
                  </div>
                </div>
                <div
                  className="h-24 rounded-[14px]"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                />
              </div>
            )}

            {isError && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <p className="text-white/30 text-[14px]">Unable to load preview</p>
                <button
                  onClick={onClose}
                  className="text-white/50 text-[13px] underline underline-offset-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            {payload && !isLoading && (
              <>
                {isPersonEntity ? (
                  <PersonPreviewContent payload={payload} onAction={handleAction} />
                ) : (
                  <GenericPreviewContent payload={payload} onAction={handleAction} />
                )}

                {/* Footer — "View Full [EntityType]" CTA */}
                <div className="mt-6">
                  <button
                    onClick={() => {
                      if (config && entityId) {
                        onNavigate(config.primaryDestination.replace("[id]", entityId))
                      }
                    }}
                    className="w-full h-11 rounded-[14px] text-[14px] font-semibold text-black transition-all active:scale-[0.98]"
                    style={{ background: "#FFFFFF" }}
                  >
                    Open {payload.entityType.charAt(0).toUpperCase() + payload.entityType.slice(1)}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
