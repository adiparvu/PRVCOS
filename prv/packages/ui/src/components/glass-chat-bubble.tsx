"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChatRole = "user" | "assistant"
export type ChatStatus = "sending" | "sent" | "read"

export interface GlassChatBubbleProps {
  role: ChatRole
  children: React.ReactNode
  /** Avatar node, or a short string rendered as initials. */
  avatar?: React.ReactNode
  /** Hide the avatar (e.g. for consecutive messages). */
  hideAvatar?: boolean
  /** Sender name / timestamp line under the bubble. */
  meta?: React.ReactNode
  /** Delivery status (user messages only). */
  status?: ChatStatus
  className?: string
  style?: React.CSSProperties
}

// ── Status text ───────────────────────────────────────────────────────────────

function statusText(status: ChatStatus): string {
  if (status === "sending") return "Sending…"
  if (status === "read") return "✓✓ Read"
  return "✓ Sent"
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassChatBubble({
  role,
  children,
  avatar,
  hideAvatar = false,
  meta,
  status,
  className,
  style,
}: GlassChatBubbleProps) {
  const isUser = role === "user"

  return (
    <div
      className={clsx(className)}
      style={{
        display: "flex",
        gap: 10,
        maxWidth: "78%",
        alignSelf: isUser ? "flex-end" : "flex-start",
        flexDirection: isUser ? "row-reverse" : "row",
        ...style,
      }}
    >
      {!hideAvatar && (
        <div
          aria-hidden="true"
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            ...(isUser
              ? {
                  background: "var(--prv-g3)",
                  border: "1px solid var(--prv-border)",
                  color: "var(--prv-text-2)",
                }
              : {
                  background: "linear-gradient(135deg,#0A84FF,#5E5CE6)",
                  color: "#fff",
                }),
          }}
        >
          {avatar ?? (isUser ? "Me" : "AI")}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            padding: "11px 14px",
            fontSize: 14,
            lineHeight: 1.5,
            borderRadius: 18,
            ...(isUser
              ? {
                  background: "var(--prv-accent, rgba(10,132,255,0.9))",
                  color: "#fff",
                  borderTopRightRadius: 6,
                }
              : {
                  background: "var(--prv-g2)",
                  border: "1px solid var(--prv-border-subtle)",
                  color: "var(--prv-text-1)",
                  borderTopLeftRadius: 6,
                }),
          }}
        >
          {children}
        </div>

        {(meta || (isUser && status)) && (
          <div
            style={{
              fontSize: 11,
              color: "var(--prv-text-4)",
              padding: "0 6px",
              textAlign: isUser ? "right" : "left",
            }}
          >
            {meta}
            {isUser && status && (
              <>
                {meta ? " · " : ""}
                <span
                  style={{
                    color:
                      status === "read"
                        ? "var(--prv-accent, rgba(10,132,255,0.9))"
                        : "var(--prv-text-4)",
                  }}
                >
                  {statusText(status)}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
