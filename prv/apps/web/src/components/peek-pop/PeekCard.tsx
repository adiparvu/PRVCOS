"use client"

import { useRouter } from "next/navigation"
import { useEntityData } from "@/components/preview-engine/hooks/useEntityData"
import { ENTITY_REGISTRY } from "@/components/preview-engine/registry"
import type { EntityType } from "@/components/preview-engine/types"
import type { PeekState } from "./types"

interface PeekCardProps {
  entityType: string
  entityId: string
  name?: string
  avatarUrl?: string | null
  state: PeekState
  anchorRect: DOMRect | null
  onDismiss: () => void
}

export function PeekCard({
  entityType,
  entityId,
  name,
  avatarUrl,
  state,
  anchorRect,
  onDismiss,
}: PeekCardProps) {
  const router = useRouter()
  const config = ENTITY_REGISTRY[entityType as EntityType]
  const { data, isLoading } = useEntityData(
    state === "peeking" ? (entityType as EntityType) : null,
    state === "peeking" ? entityId : null
  )

  const displayName = data?.name ?? name ?? "…"
  const displayAvatar = data?.avatarUrl ?? avatarUrl

  // Position card above or below the anchor element
  let top = 0
  let left = 0
  const cardW = 300
  const cardH = 260

  if (anchorRect) {
    left = anchorRect.left + anchorRect.width / 2 - cardW / 2
    const spaceAbove = anchorRect.top
    const spaceBelow = window.innerHeight - anchorRect.bottom
    if (spaceAbove >= cardH + 12) {
      top = anchorRect.top - cardH - 12
    } else if (spaceBelow >= cardH + 12) {
      top = anchorRect.bottom + 12
    } else {
      top = Math.max(8, window.innerHeight / 2 - cardH / 2)
    }
    left = Math.max(8, Math.min(left, window.innerWidth - cardW - 8))
  }

  const visible = state === "peeking"

  const primaryDest = config?.primaryDestination?.replace("[id]", entityId) ?? null

  const quickActions = config?.contextActions?.slice(0, 3) ?? []

  return (
    <div
      style={{
        position: "fixed",
        top,
        left,
        width: cardW,
        zIndex: 50,
        background: "rgba(255,255,255,0.16)",
        backdropFilter: "blur(64px) saturate(200%)",
        WebkitBackdropFilter: "blur(64px) saturate(200%)",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 24,
        boxShadow: "0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.32)",
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.88)",
        transition:
          "opacity 280ms cubic-bezier(0.34,1.56,0.64,1), transform 280ms cubic-bezier(0.34,1.56,0.64,1)",
        pointerEvents: visible ? "auto" : "none",
        overflow: "hidden",
      }}
    >
      {/* Entity header */}
      <div className="flex items-center gap-3 p-4 pb-3">
        <div
          className="w-12 h-12 rounded-[14px] overflow-hidden shrink-0"
          style={{ background: "rgba(255,255,255,0.10)" }}
        >
          {displayAvatar ? (
            <img src={displayAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/40 text-[20px] font-medium">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white/90 text-[15px] font-semibold leading-tight truncate">
            {isLoading && !name ? (
              <span
                className="inline-block h-3 w-28 rounded-full"
                style={{ background: "rgba(255,255,255,0.10)" }}
              />
            ) : (
              displayName
            )}
          </p>
          {(data?.subtitle || isLoading) && (
            <p className="text-white/45 text-[12px] leading-tight mt-0.5 truncate">
              {isLoading ? (
                <span
                  className="inline-block h-2 w-20 rounded-full"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                />
              ) : (
                data?.subtitle
              )}
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginInline: 16 }} />

      {/* Quick actions from registry */}
      <div className="p-2">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={() => {
              onDismiss()
              if (action.href) router.push(action.href.replace("[id]", entityId))
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] text-left"
            style={{ transition: "background 150ms" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span className="text-[13px] text-white/75">{action.label}</span>
          </button>
        ))}
        {primaryDest && (
          <button
            onClick={() => {
              onDismiss()
              router.push(primaryDest)
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] text-left"
            style={{ transition: "background 150ms" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span className="text-[13px] text-white/75">
              Open {config?.renderer === "person" ? "Profile" : "Details"}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
