"use client"

import { SocialPlatformIcon, PLATFORM_LABELS } from "./SocialPlatformIcon"

export interface SocialProfile {
  id: string
  platform: string
  url: string
  displayName?: string | null
  isPublic: boolean
  consentGiven?: boolean
}

type Mode = "chip" | "icon" | "count"

interface SocialProfilesRendererProps {
  profiles: SocialProfile[]
  mode?: Mode
  maxVisible?: number
}

export function SocialProfilesRenderer({
  profiles,
  mode = "chip",
  maxVisible = 6,
}: SocialProfilesRendererProps) {
  const visible = profiles.filter((p) => p.isPublic).slice(0, maxVisible)

  if (visible.length === 0) return null

  if (mode === "count") {
    return (
      <span className="text-[12px] text-white/45">
        {visible.length} profile{visible.length !== 1 ? "s" : ""}
      </span>
    )
  }

  if (mode === "icon") {
    return (
      <div className="flex items-center gap-2">
        {visible.map((p) => (
          <a
            key={p.id}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 rounded-[8px] flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.10)",
              transition: "background 150ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            title={PLATFORM_LABELS[p.platform as keyof typeof PLATFORM_LABELS] ?? p.platform}
          >
            <SocialPlatformIcon platform={p.platform as never} size={14} opacity={0.7} />
          </a>
        ))}
      </div>
    )
  }

  // chip mode
  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((p) => (
        <a
          key={p.id}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] text-white/75 font-medium"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.10)",
            transition: "background 150ms",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
        >
          <SocialPlatformIcon platform={p.platform as never} size={13} opacity={0.7} />
          {p.displayName ??
            PLATFORM_LABELS[p.platform as keyof typeof PLATFORM_LABELS] ??
            p.platform}
          {/* External link indicator */}
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.4 }}
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
          </svg>
        </a>
      ))}
    </div>
  )
}
