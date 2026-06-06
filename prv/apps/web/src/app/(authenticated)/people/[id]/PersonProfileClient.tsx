"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PresenceRing } from "@/components/presence/PresenceRing"
import { PresenceStatusBadge } from "@/components/presence/PresenceStatusBadge"
import {
  SocialProfilesRenderer,
  type SocialProfile,
} from "@/components/social-profiles/SocialProfilesRenderer"
import { SocialProfilesEditor } from "@/components/social-profiles/SocialProfilesEditor"
import { ContactActions } from "../components/ContactActions"
import { ContactBusinessCard } from "../components/ContactBusinessCard"

interface PersonData {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string | null
  jobTitle: string | null
  avatarUrl: string | null
  bio: string | null
  role: string
  memberSince: string
}

interface PresenceData {
  status: string
  statusMessage: string | null
  isManualOverride: boolean
  manualOverrideExpiresAt: string | null
  lastSeenAt: string | null
}

interface PersonProfileClientProps {
  person: PersonData
  presence: PresenceData
  socialProfiles: SocialProfile[]
  companyId: string
  isOwnProfile: boolean
}

export function PersonProfileClient({
  person,
  presence,
  socialProfiles,
  isOwnProfile,
}: PersonProfileClientProps) {
  const router = useRouter()
  const [showSocialEditor, setShowSocialEditor] = useState(false)

  return (
    <div className="min-h-svh" style={{ background: "var(--prv-bg)" }}>
      {/* Nav */}
      <div className="px-4 pt-14 pb-2 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: "var(--prv-border-subtle)",
            border: "1px solid var(--prv-g2)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--prv-text-2)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <p className="text-white/45 text-[14px]">People</p>
      </div>

      <div className="px-4 pb-28 max-w-2xl mx-auto space-y-6">
        {/* Hero header */}
        <div className="flex items-start gap-5 pt-4">
          <PresenceRing
            status={presence.status}
            size={96}
            avatarUrl={person.avatarUrl}
            name={person.fullName}
          />
          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-white/90 text-[22px] font-semibold leading-tight">
              {person.fullName}
            </h1>
            {person.jobTitle && <p className="text-white/50 text-[15px] mt-1">{person.jobTitle}</p>}
            <div className="mt-2">
              <PresenceStatusBadge
                status={
                  presence.status as import("@/components/presence/PresenceDot").PresenceStatus
                }
                message={presence.statusMessage}
              />
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <ContactActions email={person.email} phone={person.phone} />

        {/* Bio */}
        {person.bio && (
          <div
            className="p-4 rounded-[18px]"
            style={{
              background: "var(--prv-border-subtle)",
              border: "1px solid var(--prv-border)",
            }}
          >
            <p className="text-white/55 text-[14px] leading-relaxed">{person.bio}</p>
          </div>
        )}

        {/* Contact info */}
        <div
          className="rounded-[18px] overflow-hidden"
          style={{
            background: "var(--prv-border-subtle)",
            border: "1px solid var(--prv-border)",
          }}
        >
          {[
            { label: "Email", value: person.email, href: `mailto:${person.email}` },
            {
              label: "Phone",
              value: person.phone,
              href: person.phone ? `tel:${person.phone}` : null,
            },
            { label: "Role", value: person.role, href: null },
            {
              label: "Member since",
              value: new Date(person.memberSince).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              }),
              href: null,
            },
          ]
            .filter((r) => r.value)
            .map((row, i, arr) => (
              <div
                key={row.label}
                className="flex items-center justify-between px-4 py-3"
                style={{
                  borderBottom: i < arr.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
                }}
              >
                <span className="text-white/35 text-[13px]">{row.label}</span>
                {row.href ? (
                  <a
                    href={row.href}
                    className="text-white/65 text-[13px] font-medium"
                    style={{ textDecoration: "none" }}
                  >
                    {row.value}
                  </a>
                ) : (
                  <span className="text-white/65 text-[13px] font-medium">{row.value}</span>
                )}
              </div>
            ))}
        </div>

        {/* Social profiles */}
        {(socialProfiles.length > 0 || isOwnProfile) && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-medium text-white/30 uppercase tracking-wider">
                Social Profiles
              </p>
              {isOwnProfile && (
                <button
                  onClick={() => setShowSocialEditor(true)}
                  className="text-[12px] text-white/40 font-medium"
                >
                  Edit
                </button>
              )}
            </div>
            {socialProfiles.length > 0 ? (
              <SocialProfilesRenderer profiles={socialProfiles} mode="chip" />
            ) : (
              isOwnProfile && (
                <button
                  onClick={() => setShowSocialEditor(true)}
                  className="text-[13px] text-white/30"
                >
                  + Add social profiles
                </button>
              )
            )}
          </div>
        )}

        {/* Business card */}
        <ContactBusinessCard userId={person.id} />
      </div>

      {showSocialEditor && (
        <SocialProfilesEditor
          userId={person.id}
          profiles={socialProfiles}
          onClose={() => setShowSocialEditor(false)}
        />
      )}
    </div>
  )
}
