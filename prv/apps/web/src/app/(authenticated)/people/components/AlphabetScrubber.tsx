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
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border)",
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
            color: active === letter ? "var(--prv-text-1)" : "var(--prv-text-3)",
            background: active === letter ? "var(--prv-border)" : "transparent",
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
