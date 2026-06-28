"use client"

import { useRef } from "react"
import { createPortal } from "react-dom"
import { usePreviewEngine } from "@/components/preview-engine/PreviewEngine"
import type { EntityType } from "@/components/preview-engine/types"
import type { PeekPopContainerProps } from "./types"
import { usePeekGesture } from "./usePeekGesture"
import { PeekScrim } from "./PeekScrim"
import { PeekCard } from "./PeekCard"

export function PeekPopContainer({
  entityType,
  entityId,
  name,
  avatarUrl,
  onPop,
  children,
  disabled = false,
}: PeekPopContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const anchorRectRef = useRef<DOMRect | null>(null)
  const { open: openPreview } = usePreviewEngine()

  const { state, dismiss, pointerHandlers } = usePeekGesture({
    onPeek: () => {
      anchorRectRef.current = containerRef.current?.getBoundingClientRect() ?? null
    },
    onDismiss: () => {
      anchorRectRef.current = null
    },
  })

  const handlePop = () => {
    dismiss()
    if (onPop) {
      onPop()
    } else {
      openPreview(entityType as EntityType, entityId)
    }
  }

  if (disabled) return <>{children}</>

  const isPeeking = state === "peeking"
  // The anchor rect is captured at gesture start and stays static while the peek
  // is open, so reading it during render is intentional here.
  // eslint-disable-next-line react-hooks/refs
  const anchorRect = anchorRectRef.current
  const overlay =
    typeof document !== "undefined" ? (
      <>
        <PeekScrim visible={isPeeking} onClick={dismiss} />
        <PeekCard
          entityType={entityType}
          entityId={entityId}
          name={name}
          avatarUrl={avatarUrl}
          state={state}
          anchorRect={anchorRect}
          onDismiss={dismiss}
        />
        {/* Swipe-up hint when peeking */}
        {isPeeking && (
          <div
            style={{
              position: "fixed",
              bottom: 48,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 51,
              padding: "6px 14px",
              borderRadius: 100,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.18)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <span
              className="text-[12px] text-white/60"
              style={{ cursor: "pointer" }}
              onClick={handlePop}
            >
              Swipe up to view
            </span>
          </div>
        )}
      </>
    ) : null

  return (
    <>
      <div
        ref={containerRef}
        {...(isPeeking ? {} : pointerHandlers)}
        style={{ userSelect: "none", WebkitUserSelect: "none", touchAction: "manipulation" }}
      >
        {children}
      </div>
      {overlay && createPortal(overlay, document.body)}
    </>
  )
}
