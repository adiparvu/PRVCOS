"use client"

import { useState } from "react"
import { useBusinessCard } from "@/components/business-card/hooks/useBusinessCard"
import { BusinessCard } from "@/components/business-card/BusinessCard"
import { ShareSheet } from "@/components/business-card/ShareSheet"

interface ContactBusinessCardProps {
  userId: string
  companyName?: string | null
}

export function ContactBusinessCard({ userId, companyName }: ContactBusinessCardProps) {
  const [showShare, setShowShare] = useState(false)
  const { data: card, isLoading } = useBusinessCard(userId)

  if (isLoading) {
    return (
      <div
        className="w-full h-[56px] rounded-[16px]"
        style={{ background: "rgba(255,255,255,0.05)" }}
      />
    )
  }

  if (!card) return null

  return (
    <div>
      <p className="text-[11px] font-medium text-white/30 uppercase tracking-wider mb-3">
        Business Card
      </p>
      <div className="flex gap-3 items-start">
        <div
          style={{
            transform: "scale(0.75)",
            transformOrigin: "top left",
            width: 257,
            height: 150,
            overflow: "visible",
          }}
        >
          <BusinessCard card={card} />
        </div>
        <button
          onClick={() => setShowShare(true)}
          className="shrink-0 mt-2 px-4 py-2.5 rounded-[12px] text-[13px] font-medium text-white/65"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          Share
        </button>
      </div>

      {showShare && (
        <ShareSheet card={card} companyName={companyName} onClose={() => setShowShare(false)} />
      )}
    </div>
  )
}
