"use client"

import { useState } from "react"
import { SocialPlatformIcon, PLATFORM_LABELS } from "./SocialPlatformIcon"
import { SocialConsentModal } from "./SocialConsentModal"
import { useUpsertSocialProfile, useDeleteSocialProfile } from "./hooks/useSocialProfiles"
import type { SocialProfile } from "./SocialProfilesRenderer"

const PLATFORMS = Object.keys(PLATFORM_LABELS) as Array<keyof typeof PLATFORM_LABELS>

interface SocialProfilesEditorProps {
  userId: string
  profiles: SocialProfile[]
  onClose: () => void
}

export function SocialProfilesEditor({ userId, profiles, onClose }: SocialProfilesEditorProps) {
  const [addingPlatform, setAddingPlatform] = useState<string | null>(null)
  const [addingUrl, setAddingUrl] = useState("")
  const [pendingConsent, setPendingConsent] = useState<string | null>(null)
  const [pendingPublic, setPendingPublic] = useState<{ platform: string; url: string } | null>(null)

  const upsert = useUpsertSocialProfile(userId)
  const remove = useDeleteSocialProfile(userId)

  const handleTogglePublic = (p: SocialProfile) => {
    if (!p.isPublic && !p.consentGiven) {
      setPendingConsent(p.platform)
      setPendingPublic({ platform: p.platform, url: p.url })
    } else {
      upsert.mutate({ platform: p.platform, url: p.url, isPublic: !p.isPublic })
    }
  }

  const handleConsent = () => {
    if (pendingPublic) {
      upsert.mutate({ ...pendingPublic, isPublic: true, consentGiven: true })
    }
    setPendingConsent(null)
    setPendingPublic(null)
  }

  const handleAdd = () => {
    if (!addingPlatform || !addingUrl.trim()) return
    upsert.mutate(
      { platform: addingPlatform, url: addingUrl.trim() },
      {
        onSuccess: () => {
          setAddingPlatform(null)
          setAddingUrl("")
        },
      }
    )
  }

  return (
    <>
      {/* Sheet overlay */}
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
          maxHeight: "85svh",
          background: "rgba(255,255,255,0.10)",
          backdropFilter: "blur(48px) saturate(180%)",
          WebkitBackdropFilter: "blur(48px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderBottom: "none",
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.22)",
          overflowY: "auto",
          paddingBottom: "env(safe-area-inset-bottom, 20px)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.20)" }} />
        </div>

        <div className="px-5 pb-4">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-white/90 text-[17px] font-semibold">Social Profiles</p>
              <p className="text-white/40 text-[13px] mt-0.5">Manage your public links</p>
            </div>
            <button onClick={onClose} className="text-white/40 text-[14px] font-medium">
              Done
            </button>
          </div>

          {/* Existing profiles */}
          {profiles.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 py-3.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <SocialPlatformIcon platform={p.platform as never} size={16} opacity={0.7} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/80 text-[13px] font-medium">
                  {PLATFORM_LABELS[p.platform as keyof typeof PLATFORM_LABELS] ?? p.platform}
                </p>
                <p className="text-white/35 text-[12px] truncate">{p.url}</p>
              </div>
              {/* Visibility toggle */}
              <button
                onClick={() => handleTogglePublic(p)}
                className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                style={{
                  background: p.isPublic ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)",
                }}
                title={p.isPublic ? "Public — tap to make private" : "Private — tap to make public"}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ opacity: p.isPublic ? 0.9 : 0.35, color: "white" }}
                >
                  {p.isPublic ? (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  ) : (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </>
                  )}
                </svg>
              </button>
              {/* Delete */}
              <button
                onClick={() => remove.mutate(p.platform)}
                className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ opacity: 0.35, color: "white" }}
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
                </svg>
              </button>
            </div>
          ))}

          {/* Add platform */}
          {addingPlatform ? (
            <div className="mt-4 space-y-3">
              <input
                type="url"
                placeholder={`Your ${PLATFORM_LABELS[addingPlatform as keyof typeof PLATFORM_LABELS] ?? addingPlatform} URL`}
                value={addingUrl}
                onChange={(e) => setAddingUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-[14px] text-[14px] text-white/80 outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setAddingPlatform(null)
                    setAddingUrl("")
                  }}
                  className="flex-1 py-3 rounded-[14px] text-[14px] text-white/45"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!addingUrl.trim() || upsert.isPending}
                  className="flex-1 py-3 rounded-[14px] text-[14px] font-semibold"
                  style={{
                    background: addingUrl.trim()
                      ? "rgba(255,255,255,0.92)"
                      : "rgba(255,255,255,0.15)",
                    color: addingUrl.trim() ? "#000" : "rgba(255,255,255,0.3)",
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <p className="text-white/35 text-[11px] font-medium uppercase tracking-wider mb-3">
                Add Platform
              </p>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.filter((pl) => !profiles.find((p) => p.platform === pl)).map((pl) => (
                  <button
                    key={pl}
                    onClick={() => setAddingPlatform(pl)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] text-white/55"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.09)",
                    }}
                  >
                    <SocialPlatformIcon platform={pl as never} size={12} opacity={0.55} />
                    {PLATFORM_LABELS[pl]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {pendingConsent && (
        <SocialConsentModal
          platform={pendingConsent}
          onConsent={handleConsent}
          onCancel={() => {
            setPendingConsent(null)
            setPendingPublic(null)
          }}
        />
      )}
    </>
  )
}
