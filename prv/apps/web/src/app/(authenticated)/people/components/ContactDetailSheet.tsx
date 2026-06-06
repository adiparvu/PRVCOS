"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { PresenceRing } from "@/components/presence/PresenceRing"
import { PresenceStatusBadge } from "@/components/presence/PresenceStatusBadge"
import { ContactActions } from "./ContactActions"
import { ContactSocialLinks } from "./ContactSocialLinks"
import { ContactBusinessCard } from "./ContactBusinessCard"
import type { ContactMember } from "./ContactRow"

interface ContactDetailSheetProps {
  member: ContactMember
  onClose: () => void
}

export function ContactDetailSheet({ member, onClose }: ContactDetailSheetProps) {
  const router = useRouter()

  // Escape key dismissal
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  return (
    <>
      {/* Scrim */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 80,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 81,
          maxHeight: "85svh",
          background: "var(--prv-g2)",
          backdropFilter: "blur(48px) saturate(180%)",
          WebkitBackdropFilter: "blur(48px) saturate(180%)",
          border: "1px solid var(--prv-border)",
          borderBottom: "none",
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.5), inset 0 1px 0 var(--prv-g3)",
          overflowY: "auto",
          paddingBottom: "env(safe-area-inset-bottom, 28px)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--prv-text-3)" }} />
        </div>

        <div className="px-5 pb-4 space-y-5">
          {/* Header */}
          <div className="flex items-start gap-4 pt-1">
            <PresenceRing
              status={member.presence.status as never}
              size={64}
              avatarUrl={member.avatarUrl}
              name={member.fullName}
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-white/90 text-[20px] font-semibold leading-tight">
                {member.fullName}
              </h2>
              {member.jobTitle && (
                <p className="text-white/50 text-[14px] mt-0.5">{member.jobTitle}</p>
              )}
              <div className="mt-2">
                <PresenceStatusBadge
                  status={member.presence.status as never}
                  statusMessage={member.presence.statusMessage}
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "var(--prv-border-subtle)" }} />

          {/* Quick actions */}
          <ContactActions email={member.email} phone={member.phone} />

          {/* Contact info */}
          {(member.email || member.phone) && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-white/30 uppercase tracking-wider">
                Contact
              </p>
              {member.phone && (
                <a
                  href={`tel:${member.phone}`}
                  className="flex items-center gap-2 text-white/65 text-[14px]"
                  style={{ textDecoration: "none" }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ opacity: 0.45, flexShrink: 0 }}
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.38 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l1-1a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  {member.phone}
                </a>
              )}
              {member.email && (
                <a
                  href={`mailto:${member.email}`}
                  className="flex items-center gap-2 text-white/65 text-[14px]"
                  style={{ textDecoration: "none" }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ opacity: 0.45, flexShrink: 0 }}
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6" />
                  </svg>
                  {member.email}
                </a>
              )}
            </div>
          )}

          {/* Social links */}
          <ContactSocialLinks userId={member.id} />

          {/* Business card */}
          <ContactBusinessCard userId={member.id} />

          {/* Open full profile */}
          <button
            onClick={() => {
              onClose()
              router.push(`/people/${member.id}`)
            }}
            className="w-full py-3.5 rounded-[16px] text-[14px] font-medium text-white/55"
            style={{
              background: "var(--prv-border-subtle)",
              border: "1px solid var(--prv-border)",
            }}
          >
            Open Full Profile
          </button>
        </div>
      </div>
    </>
  )
}
