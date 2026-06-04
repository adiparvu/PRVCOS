import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs))
}

// Glass surface class builders
export const glassCard = cn(
  "bg-white/[0.06] backdrop-blur-md",
  "border border-white/[0.12]",
  "shadow-[0_24px_64px_rgba(0,0,0,0.7),0_8px_24px_rgba(0,0,0,0.4)]",
  "[box-shadow:inset_0_1px_0_rgba(255,255,255,0.25)]",
  "rounded-[20px]"
)

export const glassSheet = cn(
  "bg-white/[0.10] backdrop-blur-xl",
  "border border-white/[0.12]",
  "shadow-[0_24px_64px_rgba(0,0,0,0.7),0_8px_24px_rgba(0,0,0,0.4)]",
  "[box-shadow:inset_0_1px_0_rgba(255,255,255,0.25)]",
  "rounded-t-[32px]"
)

export const glassModal = cn(
  "bg-white/[0.16] backdrop-blur-2xl",
  "border border-white/[0.12]",
  "shadow-[0_24px_64px_rgba(0,0,0,0.7),0_8px_24px_rgba(0,0,0,0.4)]",
  "[box-shadow:inset_0_1px_0_rgba(255,255,255,0.25)]",
  "rounded-[32px]"
)

export const glassNav = cn(
  "bg-white/[0.10] backdrop-blur-xl",
  "border border-white/[0.12]",
  "shadow-[0_24px_64px_rgba(0,0,0,0.7),0_8px_24px_rgba(0,0,0,0.4)]",
  "[box-shadow:inset_0_1px_0_rgba(255,255,255,0.25)]",
  "rounded-[100px]"
)
