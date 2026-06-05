"use client"

import { useState } from "react"
import { downloadVCard, buildVCard } from "./vCardBuilder"
import type { BusinessCardData } from "./BusinessCard"

interface ShareSheetProps {
  card: BusinessCardData
  companyName?: string | null
  onClose: () => void
}

export function ShareSheet({ card, companyName, onClose }: ShareSheetProps) {
  const [copied, setCopied] = useState(false)

  const publicUrl = card.publicSlug ? `https://prv.app/card/${card.publicSlug}` : null

  const handleCopyLink = async () => {
    if (!publicUrl) return
    await navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveContact = () => {
    downloadVCard({
      firstName: card.fullName.split(" ")[0] ?? "",
      lastName: card.fullName.split(" ").slice(1).join(" "),
      fullName: card.fullName,
      jobTitle: card.jobTitle,
      company: companyName ?? null,
      phone: card.phone,
      email: card.email,
      publicCardUrl: publicUrl,
    })
    onClose()
  }

  const handleNativeShare = async () => {
    if (!navigator.share) return
    try {
      await navigator.share({
        title: card.fullName,
        text: `${card.fullName}${card.jobTitle ? ` · ${card.jobTitle}` : ""}`,
        url: publicUrl ?? undefined,
      })
    } catch {
      // user cancelled
    }
    onClose()
  }

  const ACTIONS = [
    {
      icon: "M8 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3M16 21l5-5-5-5M21 16H9",
      label: "Save Contact",
      sub: "Download .vcf file",
      onClick: handleSaveContact,
      always: true,
    },
    {
      icon: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
      label: copied ? "Copied!" : "Copy Link",
      sub: publicUrl ?? "Card is private",
      onClick: handleCopyLink,
      always: false,
      disabled: !publicUrl,
    },
    {
      icon: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13",
      label: "Share…",
      sub: "Open system share sheet",
      onClick: handleNativeShare,
      always: false,
      disabled: !navigator?.share,
    },
  ]

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 101,
          background: "rgba(255,255,255,0.10)",
          backdropFilter: "blur(48px) saturate(180%)",
          WebkitBackdropFilter: "blur(48px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderBottom: "none",
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.22)",
          paddingBottom: "env(safe-area-inset-bottom, 24px)",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.20)" }} />
        </div>

        <div className="px-5 pb-4">
          <p className="text-white/90 text-[17px] font-semibold mb-1">Share Business Card</p>
          <p className="text-white/40 text-[13px] mb-5">{card.fullName}</p>

          <div className="space-y-2">
            {ACTIONS.filter((a) => a.always || !a.disabled).map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-[16px] text-left"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  transition: "background 150ms",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              >
                <div
                  className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
                  style={{ background: "rgba(255,255,255,0.10)" }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(255,255,255,0.75)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={action.icon} />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-white/85 text-[14px] font-medium">{action.label}</p>
                  <p className="text-white/35 text-[12px] truncate">{action.sub}</p>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full mt-3 py-3.5 rounded-[16px] text-[14px] font-medium text-white/55"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}
