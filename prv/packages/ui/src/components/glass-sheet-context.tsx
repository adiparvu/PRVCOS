"use client"

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { SnapSheet } from "./glass-snap-sheet"
import type { SnapPoint } from "./glass-snap-sheet"

export interface SheetConfig {
  snapPoints?: SnapPoint[]
  defaultSnap?: SnapPoint
  title?: string
  render: (onClose: () => void) => React.ReactNode
}

interface SheetEntry {
  id: string
  open: boolean
  snapPoints: SnapPoint[]
  defaultSnap: SnapPoint
  title?: string
  render: (onClose: () => void) => React.ReactNode
}

interface SheetStackContextValue {
  openSheet: (config: SheetConfig) => string
  closeSheet: (id: string) => void
  closeAll: () => void
}

const SheetStackContext = createContext<SheetStackContextValue>({
  openSheet: () => "",
  closeSheet: () => {},
  closeAll: () => {},
})

export function useSheetStack(): SheetStackContextValue {
  return useContext(SheetStackContext)
}

let _uid = 0
function nextId(): string {
  return `prv-sheet-${++_uid}`
}

export function SheetStackProvider({ children }: { children: React.ReactNode }) {
  const [sheets, setSheets] = useState<SheetEntry[]>([])
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const openSheet = useCallback((config: SheetConfig): string => {
    const id = nextId()
    const entry: SheetEntry = {
      id,
      open: false,
      snapPoints: config.snapPoints ?? ["mid"],
      defaultSnap: config.defaultSnap ?? config.snapPoints?.[0] ?? "mid",
      title: config.title,
      render: config.render,
    }
    setSheets((prev) => [...prev, entry])
    // Double RAF so CSS transition plays on entrance
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        setSheets((prev) => prev.map((s) => (s.id === id ? { ...s, open: true } : s)))
      })
    })
    return id
  }, [])

  const closeSheet = useCallback((id: string): void => {
    // Mark closing → play exit animation, then remove
    setSheets((prev) => prev.map((s) => (s.id === id ? { ...s, open: false } : s)))
    setTimeout(() => {
      setSheets((prev) => prev.filter((s) => s.id !== id))
    }, 460)
  }, [])

  const closeAll = useCallback((): void => {
    setSheets((prev) => prev.map((s) => ({ ...s, open: false })))
    setTimeout(() => setSheets([]), 460)
  }, [])

  const openSheets = sheets.filter((s) => s.open)
  const hasOpen = openSheets.length > 0

  return (
    <SheetStackContext.Provider value={{ openSheet, closeSheet, closeAll }}>
      {children}

      {sheets.length > 0 && (
        <>
          {/* Single shared scrim — avoids stacking multiple backdrops */}
          <div
            aria-hidden="true"
            onClick={() => {
              const top = [...sheets].reverse().find((s) => s.open)
              if (top) closeSheet(top.id)
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 59,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: hasOpen ? "blur(4px)" : "none",
              WebkitBackdropFilter: hasOpen ? "blur(4px)" : "none",
              opacity: hasOpen ? 1 : 0,
              transition: "opacity 0.3s ease",
              pointerEvents: hasOpen ? "auto" : "none",
            }}
          />

          {sheets.map((sheet, idx) => {
            const openIdx = openSheets.findIndex((s) => s.id === sheet.id)
            // Closing sheets render from the topmost position
            const stackOffset = openIdx >= 0 ? openSheets.length - 1 - openIdx : 0
            return (
              <SnapSheet
                key={sheet.id}
                open={sheet.open}
                onClose={() => closeSheet(sheet.id)}
                snapPoints={sheet.snapPoints}
                defaultSnap={sheet.defaultSnap}
                title={sheet.title}
                stackOffset={stackOffset}
                zIndex={60 + idx}
              >
                {sheet.render(() => closeSheet(sheet.id))}
              </SnapSheet>
            )
          })}
        </>
      )}
    </SheetStackContext.Provider>
  )
}
