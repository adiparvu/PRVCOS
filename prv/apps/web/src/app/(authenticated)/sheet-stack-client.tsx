"use client"

import type { ReactNode } from "react"
import { SheetStackProvider } from "@prv/ui"

export function SheetStackClient({ children }: { children: ReactNode }) {
  return <SheetStackProvider>{children}</SheetStackProvider>
}
