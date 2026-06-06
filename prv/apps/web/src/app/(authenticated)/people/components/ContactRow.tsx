"use client"

import { PresenceRing } from "@/components/presence/PresenceRing"
import { PeekPopContainer } from "@/components/peek-pop/PeekPopContainer"

export interface ContactMember {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone?: string | null
  jobTitle?: string | null
  avatarUrl?: string | null
  role: string
  presence: {
    status: string
    statusMessage: string | null
    lastSeenAt: string | null
  }
}

interface ContactRowProps {
  member: ContactMember
  onClick: (member: ContactMember) => void
}

export function ContactRow({ member, onClick }: ContactRowProps) {
  return (
    <PeekPopContainer
      entityType="employee"
      entityId={member.id}
      name={member.fullName}
      avatarUrl={member.avatarUrl}
      onPop={() => onClick(member)}
    >
      <button
        onClick={() => onClick(member)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        style={{
          transition: "background 150ms",
          borderBottom: "1px solid var(--prv-border-subtle)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--prv-border-subtle)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <PresenceRing
          status={member.presence.status as never}
          size={40}
          avatarUrl={member.avatarUrl}
          name={member.fullName}
        />
        <div className="flex-1 min-w-0">
          <p className="text-white/90 text-[15px] font-medium leading-tight truncate">
            {member.fullName}
          </p>
          <p className="text-white/40 text-[13px] leading-tight truncate mt-0.5">
            {member.jobTitle ?? member.email}
          </p>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--prv-text-3)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </PeekPopContainer>
  )
}
