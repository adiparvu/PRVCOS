"use client"

import React from "react"
import { GlassSheet } from "./glass-sheet"
import { GlassButton } from "./glass-button"

// ── StandardSheet ─────────────────────────────────────────────────────────────
// General-purpose bottom sheet — content passed as children.

export { GlassSheet as StandardSheet }
export type { GlassSheetProps as StandardSheetProps } from "./glass-sheet"

// ── ActionSheet ───────────────────────────────────────────────────────────────

export interface ActionSheetItem {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  destructive?: boolean
}

export interface ActionSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  items: ActionSheetItem[]
  onSelect: (id: string) => void
}

export function ActionSheet({ open, onClose, title, items, onSelect }: ActionSheetProps) {
  return (
    <GlassSheet open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-0.5 px-4 pt-2 pb-8">
        {items.map((item, i) => {
          const prevDestructive = i > 0 && (items[i - 1] as ActionSheetItem).destructive
          const showSep = item.destructive && !prevDestructive && i > 0
          return (
            <React.Fragment key={item.id}>
              {showSep && (
                <div
                  className="h-px my-1"
                  style={{ background: "var(--prv-border-subtle)" }}
                  role="separator"
                />
              )}
              <button
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left w-full transition-colors"
                style={{ background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--prv-g2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                onClick={() => {
                  onSelect(item.id)
                  onClose()
                }}
              >
                {item.icon && (
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center border shrink-0"
                    style={{
                      background: item.destructive ? "rgba(255,50,50,0.08)" : "var(--prv-g2)",
                      borderColor: item.destructive
                        ? "rgba(255,50,50,0.15)"
                        : "var(--prv-border-subtle)",
                      color: item.destructive ? "rgba(255,90,90,0.85)" : "var(--prv-text-2)",
                    }}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </div>
                )}
                <div>
                  <p
                    className="text-[15px] font-medium leading-tight"
                    style={{
                      color: item.destructive ? "rgba(255,80,80,0.85)" : "var(--prv-text-1)",
                    }}
                  >
                    {item.label}
                  </p>
                  {item.description && (
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--prv-text-3)" }}>
                      {item.description}
                    </p>
                  )}
                </div>
              </button>
            </React.Fragment>
          )
        })}
      </div>
    </GlassSheet>
  )
}

// ── ConfirmationSheet ─────────────────────────────────────────────────────────

export interface ConfirmationSheetProps {
  open: boolean
  onClose: () => void
  icon?: React.ReactNode
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
}

export function ConfirmationSheet({
  open,
  onClose,
  icon,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
}: ConfirmationSheetProps) {
  return (
    <GlassSheet open={open} onClose={onClose}>
      <div className="flex flex-col items-center text-center gap-3 px-5 pt-2 pb-8">
        {icon && (
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center border"
            style={{ background: "var(--prv-g2)", borderColor: "var(--prv-border)" }}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
        <div>
          <p className="text-[17px] font-semibold" style={{ color: "var(--prv-text-1)" }}>
            {title}
          </p>
          {description && (
            <p className="mt-1.5 text-[14px] leading-snug" style={{ color: "var(--prv-text-3)" }}>
              {description}
            </p>
          )}
        </div>
        <div className="flex gap-2.5 w-full mt-2">
          <GlassButton variant="ghost" style={{ flex: 1 }} onClick={onClose}>
            {cancelLabel}
          </GlassButton>
          <GlassButton
            variant={destructive ? "destructive" : "primary"}
            style={{ flex: 1 }}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </GlassButton>
        </div>
      </div>
    </GlassSheet>
  )
}

// ── FormSheet ─────────────────────────────────────────────────────────────────

export interface FormSheetProps {
  open: boolean
  onClose: () => void
  title: string
  onSave?: () => void
  saveLabel?: string
  children: React.ReactNode
}

export function FormSheet({
  open,
  onClose,
  title,
  onSave,
  saveLabel = "Save",
  children,
}: FormSheetProps) {
  return (
    <GlassSheet open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-3 px-5 pt-2 pb-8">
        {children}
        <div className="flex gap-2.5 pt-2">
          <GlassButton
            variant="primary"
            style={{ flex: 1 }}
            onClick={() => {
              onSave?.()
              onClose()
            }}
          >
            {saveLabel}
          </GlassButton>
          <GlassButton variant="ghost" onClick={onClose}>
            Cancel
          </GlassButton>
        </div>
      </div>
    </GlassSheet>
  )
}

// ── FilterSheet ───────────────────────────────────────────────────────────────

export interface FilterSection {
  label: string
  options: { id: string; label: string }[]
  multiple?: boolean
}

export interface FilterSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  sections: FilterSection[]
  selected: Record<string, string[]>
  onChange: (sectionLabel: string, values: string[]) => void
  onApply?: () => void
  onReset?: () => void
}

export function FilterSheet({
  open,
  onClose,
  title = "Filters",
  sections,
  selected,
  onChange,
  onApply,
  onReset,
}: FilterSheetProps) {
  return (
    <GlassSheet open={open} onClose={onClose} title={title}>
      <div className="px-5 pt-1 pb-8">
        {sections.map((section) => (
          <div
            key={section.label}
            className="flex items-center justify-between py-3 border-b"
            style={{ borderColor: "var(--prv-border-subtle)" }}
          >
            <span className="text-[14px] shrink-0 mr-3" style={{ color: "var(--prv-text-1)" }}>
              {section.label}
            </span>
            <div className="flex gap-1.5 flex-wrap justify-end">
              {section.options.map((opt) => {
                const active = selected[section.label]?.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    className="px-3 py-1 rounded-full border text-[12px] font-medium transition-all duration-200"
                    style={{
                      background: active ? "var(--prv-text-1)" : "var(--prv-g1)",
                      borderColor: active ? "transparent" : "var(--prv-border)",
                      color: active ? "var(--prv-bg)" : "var(--prv-text-2)",
                    }}
                    onClick={() => {
                      const current = selected[section.label] ?? []
                      const next = section.multiple
                        ? current.includes(opt.id)
                          ? current.filter((x) => x !== opt.id)
                          : [...current, opt.id]
                        : current[0] === opt.id
                          ? []
                          : [opt.id]
                      onChange(section.label, next)
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        <div className="flex gap-2.5 pt-5">
          <GlassButton
            variant="primary"
            style={{ flex: 1 }}
            onClick={() => {
              onApply?.()
              onClose()
            }}
          >
            Apply Filters
          </GlassButton>
          {onReset && (
            <GlassButton variant="ghost" onClick={onReset}>
              Reset
            </GlassButton>
          )}
        </div>
      </div>
    </GlassSheet>
  )
}

// ── PreviewSheet ──────────────────────────────────────────────────────────────

export interface PreviewAction {
  id: string
  label: string
  destructive?: boolean
}

export interface PreviewSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  actions?: PreviewAction[]
  onAction?: (id: string) => void
}

export function PreviewSheet({
  open,
  onClose,
  title,
  children,
  actions,
  onAction,
}: PreviewSheetProps) {
  return (
    <GlassSheet open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4 px-5 pt-2 pb-8">
        {children}
        {actions && actions.length > 0 && (
          <div className="flex gap-2.5">
            {actions.map((action) => (
              <GlassButton
                key={action.id}
                variant={action.destructive ? "destructive" : "glass"}
                style={{ flex: 1 }}
                onClick={() => {
                  onAction?.(action.id)
                  onClose()
                }}
              >
                {action.label}
              </GlassButton>
            ))}
          </div>
        )}
      </div>
    </GlassSheet>
  )
}

// ── OverlaySheet ──────────────────────────────────────────────────────────────

export interface OverlaySheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function OverlaySheet({ open, onClose, title, children }: OverlaySheetProps) {
  return (
    <GlassSheet open={open} onClose={onClose} title={title}>
      <div className="px-5 pt-2 pb-8">{children}</div>
    </GlassSheet>
  )
}

// ── FullscreenSheet ───────────────────────────────────────────────────────────

export interface FullscreenSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function FullscreenSheet({
  open,
  onClose,
  title,
  children,
  className,
}: FullscreenSheetProps) {
  return (
    <GlassSheet
      open={open}
      onClose={onClose}
      title={title}
      className={className}
      panelStyle={{ maxHeight: "100dvh" }}
    >
      <div className="px-5 pt-2 pb-8 overflow-y-auto">{children}</div>
    </GlassSheet>
  )
}
