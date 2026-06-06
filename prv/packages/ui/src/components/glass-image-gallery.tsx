"use client"

import React, { useCallback, useEffect, useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GalleryImage {
  /** Image source URL. */
  src: string
  /** Alt text + lightbox caption. */
  caption?: string
  /** Optional separate thumbnail src (falls back to src). */
  thumb?: string
}

export interface GlassImageGalleryProps {
  images: GalleryImage[]
  /** Number of grid columns. Default 4. */
  columns?: number
  /** Max thumbnails to show before a "+N" overflow tile. */
  maxVisible?: number
  /** Enable the fullscreen lightbox on click. Default true. */
  lightbox?: boolean
  /** Fired when an image is opened. */
  onOpen?: (index: number) => void
  className?: string
  style?: React.CSSProperties
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassImageGallery({
  images,
  columns = 4,
  maxVisible,
  lightbox = true,
  onOpen,
  className,
  style,
}: GlassImageGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const visible = maxVisible ?? images.length
  const shown = images.slice(0, visible)
  const overflow = images.length - visible

  const open = useCallback(
    (i: number) => {
      onOpen?.(i)
      if (lightbox) setOpenIndex(i)
    },
    [lightbox, onOpen]
  )

  const close = useCallback(() => setOpenIndex(null), [])
  const move = useCallback(
    (delta: number) => {
      setOpenIndex((cur) => (cur === null ? cur : (cur + delta + images.length) % images.length))
    },
    [images.length]
  )

  // Keyboard nav for the lightbox
  useEffect(() => {
    if (openIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
      else if (e.key === "ArrowLeft") move(-1)
      else if (e.key === "ArrowRight") move(1)
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [openIndex, close, move])

  return (
    <>
      <div
        className={clsx(className)}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 10,
          ...style,
        }}
      >
        {shown.map((img, i) => {
          const isOverflowTile = overflow > 0 && i === visible - 1
          return (
            <button
              key={i}
              type="button"
              aria-label={img.caption ?? `Image ${i + 1}`}
              onClick={() => open(i)}
              style={{
                position: "relative",
                aspectRatio: "1",
                borderRadius: 12,
                overflow: "hidden",
                cursor: "pointer",
                border: "1px solid var(--prv-border-subtle)",
                padding: 0,
                background: "var(--prv-g1)",
              }}
              onMouseEnter={(e) => {
                const ph = e.currentTarget.querySelector("[data-ph]") as HTMLElement | null
                const cap = e.currentTarget.querySelector("[data-cap]") as HTMLElement | null
                if (ph) ph.style.transform = "scale(1.08)"
                if (cap) cap.style.opacity = "1"
              }}
              onMouseLeave={(e) => {
                const ph = e.currentTarget.querySelector("[data-ph]") as HTMLElement | null
                const cap = e.currentTarget.querySelector("[data-cap]") as HTMLElement | null
                if (ph) ph.style.transform = "scale(1)"
                if (cap) cap.style.opacity = "0"
              }}
            >
              <img
                data-ph
                src={img.thumb ?? img.src}
                alt={img.caption ?? ""}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transition: "transform 300ms cubic-bezier(0.4,0,0.2,1)",
                }}
              />
              {img.caption && !isOverflowTile && (
                <span
                  data-cap
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: "18px 10px 8px",
                    fontSize: 11,
                    color: "#fff",
                    textAlign: "left",
                    background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
                    opacity: 0,
                    transition: "opacity 200ms",
                  }}
                >
                  {img.caption}
                </span>
              )}
              {isOverflowTile && (
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.55)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  +{overflow + 1}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Lightbox */}
      {lightbox && openIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) close()
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <LightboxButton kind="close" onClick={close} />
          {images.length > 1 && <LightboxButton kind="prev" onClick={() => move(-1)} />}

          <div style={{ position: "relative", width: "min(80vw, 760px)" }}>
            <img
              src={images[openIndex]?.src}
              alt={images[openIndex]?.caption ?? ""}
              style={{
                width: "100%",
                aspectRatio: "16/10",
                objectFit: "cover",
                borderRadius: 16,
                boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
              }}
            />
            {images[openIndex]?.caption && (
              <div
                style={{
                  textAlign: "center",
                  marginTop: 14,
                  fontSize: 13,
                  color: "var(--prv-text-2)",
                }}
              >
                {images[openIndex]?.caption}
              </div>
            )}
            <div
              style={{
                textAlign: "center",
                marginTop: 4,
                fontSize: 12,
                color: "var(--prv-text-4)",
              }}
            >
              {openIndex + 1} / {images.length}
            </div>
          </div>

          {images.length > 1 && <LightboxButton kind="next" onClick={() => move(1)} />}
        </div>
      )}
    </>
  )
}

// ── Lightbox control ──────────────────────────────────────────────────────────

function LightboxButton({
  kind,
  onClick,
}: {
  kind: "prev" | "next" | "close"
  onClick: () => void
}) {
  const isClose = kind === "close"
  const positional: React.CSSProperties = isClose
    ? { top: 20, right: 20 }
    : {
        top: "50%",
        transform: "translateY(-50%)",
        [kind === "prev" ? "left" : "right"]: 20,
      }

  return (
    <button
      type="button"
      aria-label={kind === "close" ? "Close" : kind === "prev" ? "Previous image" : "Next image"}
      onClick={onClick}
      style={{
        position: "absolute",
        width: isClose ? 40 : 44,
        height: isClose ? 40 : 44,
        borderRadius: "50%",
        background: "rgba(22,22,22,0.6)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid var(--prv-border)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        zIndex: 2,
        ...positional,
      }}
    >
      <svg
        width={isClose ? 16 : 18}
        height={isClose ? 16 : 18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        aria-hidden="true"
      >
        {kind === "close" && (
          <>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </>
        )}
        {kind === "prev" && <polyline points="15 18 9 12 15 6" />}
        {kind === "next" && <polyline points="9 18 15 12 9 6" />}
      </svg>
    </button>
  )
}
