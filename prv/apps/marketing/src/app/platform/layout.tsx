import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "PRV — The Company Operating System",
  description:
    "PRV unifies 18 platforms — projects, workforce, finance, AI — into a single Apple-grade experience.",
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return children
}
