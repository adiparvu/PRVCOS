"use client"

import { PLATFORM_LABELS } from "./SocialPlatformIcon"

interface SocialConsentModalProps {
  platform: string
  onConsent: () => void
  onCancel: () => void
}

export function SocialConsentModal({ platform, onConsent, onCancel }: SocialConsentModalProps) {
  const label = PLATFORM_LABELS[platform as keyof typeof PLATFORM_LABELS] ?? platform

  return (
    <>
      {/* Scrim */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%,-50%)",
          zIndex: 201,
          width: "min(340px, calc(100vw - 32px))",
          background: "rgba(255,255,255,0.14)",
          backdropFilter: "blur(64px) saturate(200%)",
          WebkitBackdropFilter: "blur(64px) saturate(200%)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 24,
          boxShadow: "0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.32)",
          padding: 24,
        }}
      >
        <p className="text-white/90 text-[17px] font-semibold mb-3">Data Visibility Consent</p>
        <p className="text-white/55 text-[14px] leading-relaxed mb-2">
          By making this {label} profile public, your URL will be visible to other PRV members and
          on your business card.
        </p>
        <p className="text-white/55 text-[14px] leading-relaxed mb-6">
          You can withdraw consent at any time from your profile.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-[14px] text-[14px] font-medium text-white/55"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConsent}
            className="flex-1 py-3 rounded-[14px] text-[14px] font-semibold text-black"
            style={{ background: "rgba(255,255,255,0.95)" }}
          >
            I Consent
          </button>
        </div>
      </div>
    </>
  )
}
