"use client"

interface PeekScrimProps {
  visible: boolean
  onClick: () => void
}

export function PeekScrim({ visible, onClick }: PeekScrimProps) {
  return (
    <div
      role="presentation"
      onClick={onClick}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 49,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: visible ? "blur(12px) saturate(100%)" : "none",
        WebkitBackdropFilter: visible ? "blur(12px) saturate(100%)" : "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms ease, backdrop-filter 200ms ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    />
  )
}
