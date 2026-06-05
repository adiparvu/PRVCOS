"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMyBusinessCard } from "@/components/business-card/hooks/useBusinessCard"
import { BusinessCard } from "@/components/business-card/BusinessCard"
import { BusinessCardBack } from "@/components/business-card/BusinessCardBack"
import { BusinessCardEditor } from "@/components/business-card/BusinessCardEditor"

export function CardEditorClient() {
  const router = useRouter()
  const { data: card, isLoading } = useMyBusinessCard()
  const [flipped, setFlipped] = useState(false)
  const [showEditor, setShowEditor] = useState(false)

  return (
    <div className="min-h-svh" style={{ background: "var(--prv-bg)" }}>
      {/* Nav */}
      <div className="px-4 pt-14 pb-2 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.70)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <p className="text-white/45 text-[14px]">My Card</p>
      </div>

      <div className="px-4 pb-28 max-w-lg mx-auto flex flex-col items-center gap-8 pt-8">
        {isLoading ? (
          <div
            className="rounded-[20px]"
            style={{ width: 343, height: 200, background: "rgba(255,255,255,0.07)" }}
          />
        ) : card ? (
          flipped ? (
            <BusinessCardBack card={card} onFlip={() => setFlipped(false)} />
          ) : (
            <BusinessCard card={card} onFlip={() => setFlipped(true)} />
          )
        ) : null}

        {card && (
          <div className="w-full max-w-[343px] flex flex-col gap-3">
            <button
              onClick={() => setShowEditor(true)}
              className="w-full py-3.5 rounded-[16px] text-[15px] font-semibold text-black"
              style={{ background: "rgba(255,255,255,0.92)" }}
            >
              Edit Card
            </button>
            {card.publicSlug && card.isPublic && (
              <a
                href={`/card/${card.publicSlug}`}
                target="_blank"
                className="w-full py-3.5 rounded-[16px] text-[14px] font-medium text-white/55 text-center block"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  textDecoration: "none",
                }}
              >
                View Public Card
              </a>
            )}
          </div>
        )}
      </div>

      {showEditor && card && (
        <BusinessCardEditor card={card} onClose={() => setShowEditor(false)} />
      )}
    </div>
  )
}
