"use client"

import { QRCodeRenderer } from "./QRCodeRenderer"
import type { BusinessCardData } from "./BusinessCard"
import { buildVCard } from "./vCardBuilder"

interface BusinessCardBackProps {
  card: BusinessCardData
  companyName?: string | null
  onFlip?: () => void
}

const W = 343
const H = 200

export function BusinessCardBack({ card, companyName, onFlip }: BusinessCardBackProps) {
  const publicUrl = card.publicSlug ? `https://prv.app/card/${card.publicSlug}` : null

  const vcardData = buildVCard({
    firstName: card.fullName.split(" ")[0] ?? "",
    lastName: card.fullName.split(" ").slice(1).join(" "),
    fullName: card.fullName,
    jobTitle: card.jobTitle,
    company: companyName ?? null,
    phone: card.phone,
    email: card.email,
    linkedInUrl: card.linkedInUrl,
    publicCardUrl: publicUrl,
  })

  return (
    <div
      onClick={onFlip}
      style={{
        width: W,
        height: H,
        borderRadius: 20,
        position: "relative",
        overflow: "hidden",
        cursor: onFlip ? "pointer" : "default",
        background: "rgba(255,255,255,0.10)",
        backdropFilter: "blur(48px) saturate(180%)",
        WebkitBackdropFilter: "blur(48px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.18)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.32)",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      {/* Top-edge specular */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: "rgba(255,255,255,0.32)",
        }}
      />

      <QRCodeRenderer data={vcardData} size={148} />

      <div style={{ maxWidth: 140 }}>
        <p className="text-white/60 text-[13px] font-medium leading-tight mb-1">
          Scan to save contact
        </p>
        {publicUrl && (
          <p className="text-white/30 text-[10px] break-all leading-snug">{publicUrl}</p>
        )}
        <p className="text-white/20 text-[10px] mt-2 leading-snug">Tap to flip card</p>
      </div>
    </div>
  )
}
