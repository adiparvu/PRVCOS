"use client"

import { useState } from "react"
import { BusinessCard } from "./BusinessCard"
import { BusinessCardBack } from "./BusinessCardBack"
import { useUpdateMyBusinessCard } from "./hooks/useBusinessCard"
import type { BusinessCardData } from "./BusinessCard"

interface BusinessCardEditorProps {
  card: BusinessCardData
  companyName?: string | null
  onClose: () => void
}

export function BusinessCardEditor({ card, companyName, onClose }: BusinessCardEditorProps) {
  const [flipped, setFlipped] = useState(false)
  const [headline, setHeadline] = useState(card.jobTitle ?? "")
  const [phone, setPhone] = useState(card.phone ?? "")
  const [email, setEmail] = useState(card.email ?? "")
  const [isPublic, setIsPublic] = useState(card.isPublic)

  const update = useUpdateMyBusinessCard()

  const preview: BusinessCardData = {
    ...card,
    jobTitle: headline || null,
    phone: phone || null,
    email: email || null,
    isPublic,
  }

  const handleSave = () => {
    update.mutate(
      { jobTitle: headline || null, phone: phone || null, email: email || null, isPublic },
      { onSuccess: onClose }
    )
  }

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "rgba(0,0,0,0.55)",
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
          maxHeight: "90svh",
          background: "rgba(255,255,255,0.10)",
          backdropFilter: "blur(48px) saturate(180%)",
          WebkitBackdropFilter: "blur(48px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderBottom: "none",
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.22)",
          overflowY: "auto",
          paddingBottom: "env(safe-area-inset-bottom, 24px)",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.20)" }} />
        </div>

        <div className="px-5 pb-4 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-white/90 text-[17px] font-semibold">Business Card</p>
            <button onClick={onClose} className="text-white/40 text-[14px]">
              Done
            </button>
          </div>

          {/* Card preview */}
          <div className="flex justify-center py-2">
            <div
              style={{
                transition: "transform 400ms cubic-bezier(0.34,1.56,0.64,1)",
                transformStyle: "preserve-3d",
              }}
            >
              {flipped ? (
                <BusinessCardBack
                  card={preview}
                  companyName={companyName}
                  onFlip={() => setFlipped(false)}
                />
              ) : (
                <BusinessCard card={preview} onFlip={() => setFlipped(true)} />
              )}
            </div>
          </div>

          {/* Editable fields */}
          {[
            {
              label: "Headline / Title",
              value: headline,
              onChange: setHeadline,
              placeholder: "Senior Designer",
            },
            {
              label: "Phone",
              value: phone,
              onChange: setPhone,
              placeholder: "+40 755 123 456",
              type: "tel" as const,
            },
            {
              label: "Email",
              value: email,
              onChange: setEmail,
              placeholder: "you@company.com",
              type: "email" as const,
            },
          ].map(({ label, value, onChange, placeholder, type }) => (
            <div key={label}>
              <p className="text-white/35 text-[11px] font-medium uppercase tracking-wider mb-1.5">
                {label}
              </p>
              <input
                type={type ?? "text"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-3 rounded-[14px] text-[14px] text-white/80 outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              />
            </div>
          ))}

          {/* Public toggle */}
          <div
            className="flex items-center justify-between py-3.5 px-4 rounded-[16px]"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div>
              <p className="text-white/80 text-[14px] font-medium">Public card page</p>
              <p className="text-white/35 text-[12px] mt-0.5">Shareable link at prv.app/card/…</p>
            </div>
            <button
              onClick={() => setIsPublic((v) => !v)}
              className="w-12 h-6 rounded-full relative transition-colors duration-200"
              style={{ background: isPublic ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.15)" }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-black transition-transform duration-200"
                style={{ left: 2, transform: isPublic ? "translateX(24px)" : "translateX(0)" }}
              />
            </button>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={update.isPending}
            className="w-full py-3.5 rounded-[16px] text-[15px] font-semibold text-black"
            style={{ background: "rgba(255,255,255,0.92)" }}
          >
            {update.isPending ? "Saving…" : "Save Card"}
          </button>
        </div>
      </div>
    </>
  )
}
