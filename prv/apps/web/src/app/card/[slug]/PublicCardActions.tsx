"use client"

import { downloadVCard } from "@/components/business-card/vCardBuilder"
import type { BusinessCardData } from "@/components/business-card/BusinessCard"

interface PublicCardActionsProps {
  card: BusinessCardData & { companyName?: string | null; linkedInUrl?: string | null }
}

export function PublicCardActions({ card }: PublicCardActionsProps) {
  const handleSave = () => {
    downloadVCard({
      firstName: card.fullName.split(" ")[0] ?? "",
      lastName: card.fullName.split(" ").slice(1).join(" "),
      fullName: card.fullName,
      jobTitle: card.jobTitle,
      company: card.companyName ?? null,
      phone: card.phone,
      email: card.email,
      linkedInUrl: card.linkedInUrl,
      publicCardUrl: card.publicSlug ? `https://prv.app/card/${card.publicSlug}` : null,
    })
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-[343px]">
      <button
        onClick={handleSave}
        className="w-full py-3.5 rounded-[16px] text-[15px] font-semibold text-black"
        style={{ background: "rgba(255,255,255,0.92)" }}
      >
        Save to Contacts
      </button>

      {card.linkedInUrl && (
        <a
          href={card.linkedInUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3.5 rounded-[16px] text-[14px] font-medium text-white/60 text-center block"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          Connect on LinkedIn
        </a>
      )}
    </div>
  )
}
