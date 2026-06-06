"use client"

import type { ReactNode } from "react"
import { CommandPaletteProvider } from "@prv/ui"
import { CommandPalettePanel } from "@/components/command-palette"

interface CommandPaletteClientProps {
  role: string
  children: ReactNode
}

export function CommandPaletteClient({ role, children }: CommandPaletteClientProps) {
  return (
    <CommandPaletteProvider>
      <CommandPalettePanel role={role} />
      {children}
    </CommandPaletteProvider>
  )
}
