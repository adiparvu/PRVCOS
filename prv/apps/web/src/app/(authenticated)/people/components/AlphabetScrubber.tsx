"use client"

import { useState } from "react"

interface AlphabetScrubberProps {
  letters: string[]
  onJump: (letter: string) => void
}

export function AlphabetScrubber({ letters, onJump }: AlphabetScrubberProps) {
  const [active, setActive] = useState<string | null>(null)

  const handlePointer = (letter: string) => {
    setActive(letter)
    onJump(letter)
  }

  return (
    <div
      className="fixed right-2 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center py-2 px-1 rounded-full select-none"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        gap: 1,
      }}
    >
      {letters.map((letter) => (
        <button
          key={letter}
          onPointerDown={() => handlePointer(letter)}
          onPointerEnter={(e) => {
            if (e.buttons === 1) handlePointer(letter) // drag support
          }}
          onPointerUp={() => setActive(null)}
          className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-medium"
          style={{
            color: active === letter ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.35)",
            background: active === letter ? "rgba(255,255,255,0.14)" : "transparent",
            transition: "color 100ms, background 100ms",
            lineHeight: 1,
          }}
        >
          {letter}
        </button>
      ))}
    </div>
  )
}
