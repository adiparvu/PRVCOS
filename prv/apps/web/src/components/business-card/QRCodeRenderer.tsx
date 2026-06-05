"use client"

import { useEffect, useRef } from "react"

interface QRCodeRendererProps {
  data: string
  size?: number
}

/**
 * Renders a QR code using a canvas element.
 * Draws a minimal visual representation. For production use, install `qrcode` package:
 *   pnpm add qrcode && pnpm add -D @types/qrcode
 * Then replace the canvas drawing with: QRCode.toCanvas(canvas, data, { width: size })
 */
export function QRCodeRenderer({ data, size = 160 }: QRCodeRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Placeholder visual: deterministic grid pattern from data string
    const modules = 21 // QR version 1 uses 21×21 modules
    const cell = size / modules
    ctx.clearRect(0, 0, size, size)

    // Background
    ctx.fillStyle = "rgba(255,255,255,0.95)"
    ctx.fillRect(0, 0, size, size)

    // Draw a deterministic pattern seeded by the data string
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0
    }

    ctx.fillStyle = "#000000"

    // Finder patterns (top-left, top-right, bottom-left)
    const drawFinder = (x: number, y: number) => {
      // Outer 7×7
      ctx.fillRect(x * cell, y * cell, 7 * cell, 7 * cell)
      ctx.fillStyle = "rgba(255,255,255,0.95)"
      ctx.fillRect((x + 1) * cell, (y + 1) * cell, 5 * cell, 5 * cell)
      ctx.fillStyle = "#000000"
      ctx.fillRect((x + 2) * cell, (y + 2) * cell, 3 * cell, 3 * cell)
    }

    drawFinder(0, 0)
    drawFinder(modules - 7, 0)
    drawFinder(0, modules - 7)

    // Timing patterns
    for (let i = 8; i < modules - 8; i++) {
      if (i % 2 === 0) {
        ctx.fillRect(i * cell, 6 * cell, cell, cell)
        ctx.fillRect(6 * cell, i * cell, cell, cell)
      }
    }

    // Data modules — seeded from hash
    let seed = hash
    const lcg = () => {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff
      return (seed >>> 0) / 0xffffffff
    }

    for (let row = 0; row < modules; row++) {
      for (let col = 0; col < modules; col++) {
        // Skip finder pattern areas
        const inTL = row < 8 && col < 8
        const inTR = row < 8 && col >= modules - 8
        const inBL = row >= modules - 8 && col < 8
        const onTiming = row === 6 || col === 6
        if (inTL || inTR || inBL || onTiming) {
          lcg() // consume rng to keep seed consistent
          continue
        }
        if (lcg() > 0.5) {
          ctx.fillStyle = "#000000"
          ctx.fillRect(col * cell, row * cell, cell, cell)
        }
      }
    }
  }, [data, size])

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        overflow: "hidden",
        background: "rgba(255,255,255,0.95)",
        padding: 6,
        boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
      }}
    >
      <canvas ref={canvasRef} width={size - 12} height={size - 12} />
    </div>
  )
}
