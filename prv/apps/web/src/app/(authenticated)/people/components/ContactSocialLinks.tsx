"use client"

import { useSocialProfiles } from "@/components/social-profiles/hooks/useSocialProfiles"
import { SocialProfilesRenderer } from "@/components/social-profiles/SocialProfilesRenderer"

interface ContactSocialLinksProps {
  userId: string
}

export function ContactSocialLinks({ userId }: ContactSocialLinksProps) {
  const { data: profiles, isLoading } = useSocialProfiles(userId)

  if (isLoading) {
    return (
      <div className="flex gap-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-7 w-20 rounded-full"
            style={{ background: "rgba(255,255,255,0.06)" }}
          />
        ))}
      </div>
    )
  }

  if (!profiles || profiles.length === 0) return null

  return (
    <div>
      <p className="text-[11px] font-medium text-white/30 uppercase tracking-wider mb-2">Social</p>
      <SocialProfilesRenderer profiles={profiles} mode="chip" />
    </div>
  )
}
