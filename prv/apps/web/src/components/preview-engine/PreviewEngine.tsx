"use client"

import { useState, useCallback, createContext, useContext } from "react"
import { useRouter } from "next/navigation"
import type { EntityType, SheetState } from "./types"
import { PreviewSheetRenderer } from "./PreviewSheetRenderer"

// ─── Context ──────────────────────────────────────────────────────────────────

interface PreviewEngineContextValue {
  open: (entityType: EntityType, entityId: string) => void
  close: () => void
}

const PreviewEngineContext = createContext<PreviewEngineContextValue | null>(null)

export function usePreviewEngine() {
  const ctx = useContext(PreviewEngineContext)
  if (!ctx) throw new Error("usePreviewEngine must be used inside <PreviewEngineProvider>")
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface ProviderProps {
  children: React.ReactNode
  onAction?: (actionId: string, entityType: EntityType, entityId: string) => void
}

export function PreviewEngineProvider({ children, onAction }: ProviderProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [sheetState, setSheetState] = useState<SheetState>("partial")
  const [entityType, setEntityType] = useState<EntityType | null>(null)
  const [entityId, setEntityId] = useState<string | null>(null)

  const open = useCallback((type: EntityType, id: string) => {
    setEntityType(type)
    setEntityId(id)
    setSheetState("partial")
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    // Delay clearing entity so exit animation completes
    setTimeout(() => {
      setEntityType(null)
      setEntityId(null)
    }, 350)
  }, [])

  const handleAction = useCallback(
    (actionId: string, type: EntityType, id: string) => {
      onAction?.(actionId, type, id)
    },
    [onAction]
  )

  const handleNavigate = useCallback(
    (href: string) => {
      close()
      setTimeout(() => router.push(href), 180)
    },
    [close, router]
  )

  return (
    <PreviewEngineContext.Provider value={{ open, close }}>
      {children}
      <PreviewSheetRenderer
        isOpen={isOpen}
        sheetState={sheetState}
        entityType={entityType}
        entityId={entityId}
        onStateChange={setSheetState}
        onClose={close}
        onAction={handleAction}
        onNavigate={handleNavigate}
      />
    </PreviewEngineContext.Provider>
  )
}
