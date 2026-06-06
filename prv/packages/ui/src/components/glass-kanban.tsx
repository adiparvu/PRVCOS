"use client"

import React, { useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KanbanCard {
  id: string
  /** Default card title (used when no renderCard is provided). */
  title?: string
  /** Arbitrary payload passed back to renderCard. */
  data?: unknown
}

export interface KanbanColumn {
  id: string
  title: string
  /** Dot color for the column header. */
  color?: string
  cards: KanbanCard[]
}

export interface GlassKanbanProps {
  columns: KanbanColumn[]
  /** Fired when a card is dropped into a column. */
  onCardMove?: (cardId: string, fromColumnId: string, toColumnId: string) => void
  /** Custom card renderer. Falls back to the card title. */
  renderCard?: (card: KanbanCard, columnId: string) => React.ReactNode
  /** Fired when a column's add button is pressed (button hidden if omitted). */
  onAddCard?: (columnId: string) => void
  className?: string
  style?: React.CSSProperties
}

interface DragState {
  cardId: string
  fromColumnId: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassKanban({
  columns,
  onCardMove,
  renderCard,
  onAddCard,
  className,
  style,
}: GlassKanbanProps) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const [dropCol, setDropCol] = useState<string | null>(null)

  const handleDrop = (toColumnId: string) => {
    setDropCol(null)
    if (!drag) return
    if (drag.fromColumnId !== toColumnId) {
      onCardMove?.(drag.cardId, drag.fromColumnId, toColumnId)
    }
    setDrag(null)
  }

  return (
    <div
      className={clsx(className)}
      style={{
        display: "flex",
        gap: 14,
        padding: 18,
        overflowX: "auto",
        ...style,
      }}
    >
      {columns.map((col) => {
        const isDropTarget = dropCol === col.id
        return (
          <div
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault()
              setDropCol(col.id)
            }}
            onDragLeave={(e) => {
              // Only clear when leaving the column entirely.
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setDropCol((c) => (c === col.id ? null : c))
              }
            }}
            onDrop={() => handleDrop(col.id)}
            style={{
              flex: "0 0 240px",
              display: "flex",
              flexDirection: "column",
              background: isDropTarget ? "rgba(10,132,255,0.06)" : "var(--prv-g1)",
              border: `1px solid ${isDropTarget ? "var(--prv-accent, rgba(10,132,255,0.9))" : "var(--prv-border-subtle)"}`,
              borderRadius: 16,
              minHeight: 320,
              transition: "background 150ms, border-color 150ms",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 14px 10px",
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: col.color ?? "var(--prv-text-3)",
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--prv-text-1)",
                  flex: 1,
                }}
              >
                {col.title}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--prv-text-3)",
                  background: "var(--prv-g2)",
                  borderRadius: 100,
                  padding: "2px 8px",
                }}
              >
                {col.cards.length}
              </span>
            </div>

            {/* Cards */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: "4px 10px 10px",
              }}
            >
              {col.cards.map((card) => {
                const isDragging = drag?.cardId === card.id
                return (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => setDrag({ cardId: card.id, fromColumnId: col.id })}
                    onDragEnd={() => {
                      setDrag(null)
                      setDropCol(null)
                    }}
                    style={{
                      position: "relative",
                      background: "var(--prv-g2)",
                      border: "1px solid var(--prv-border-subtle)",
                      borderRadius: 12,
                      padding: "11px 12px",
                      cursor: "grab",
                      opacity: isDragging ? 0.4 : 1,
                      transition: "transform 150ms, box-shadow 150ms, opacity 150ms",
                    }}
                    onMouseEnter={(e) => {
                      if (isDragging) return
                      const el = e.currentTarget as HTMLDivElement
                      el.style.transform = "translateY(-2px)"
                      el.style.boxShadow = "0 6px 20px rgba(0,0,0,0.4)"
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLDivElement
                      el.style.transform = "translateY(0)"
                      el.style.boxShadow = "none"
                    }}
                  >
                    {/* Top specular edge */}
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: "0 0 auto",
                        height: 1,
                        background:
                          "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)",
                        pointerEvents: "none",
                      }}
                    />
                    {renderCard ? (
                      renderCard(card, col.id)
                    ) : (
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--prv-text-1)",
                        }}
                      >
                        {card.title}
                      </div>
                    )}
                  </div>
                )
              })}

              {onAddCard && (
                <button
                  type="button"
                  onClick={() => onAddCard(col.id)}
                  style={{
                    marginTop: 2,
                    padding: "9px 12px",
                    borderRadius: 10,
                    background: "transparent",
                    border: "1px dashed var(--prv-border)",
                    color: "var(--prv-text-3)",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "background 150ms, color 150ms",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.background = "var(--prv-g2)"
                    el.style.color = "var(--prv-text-1)"
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.background = "transparent"
                    el.style.color = "var(--prv-text-3)"
                  }}
                >
                  + Add card
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
