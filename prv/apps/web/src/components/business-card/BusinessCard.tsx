"use client"

export interface BusinessCardData {
  id: string
  userId: string
  fullName: string
  jobTitle?: string | null
  companyName?: string | null
  phone?: string | null
  email?: string | null
  avatarUrl?: string | null
  linkedInUrl?: string | null
  publicSlug?: string | null
  isPublic: boolean
}

interface BusinessCardProps {
  card: BusinessCardData
  /** Flip to back face on tap */
  onFlip?: () => void
}

// Golden-ratio card: 343 × 200px
const W = 343
const H = 200

export function BusinessCard({ card, onFlip }: BusinessCardProps) {
  return (
    <div
      onClick={onFlip}
      style={{
        width: W,
        height: H,
        borderRadius: 20,
        position: "relative",
        overflow: "hidden",
        cursor: onFlip ? "pointer" : "default",
        background: "rgba(255,255,255,0.10)",
        backdropFilter: "blur(48px) saturate(180%)",
        WebkitBackdropFilter: "blur(48px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.18)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.32)",
        userSelect: "none",
      }}
    >
      {/* Top-edge specular shine */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: "rgba(255,255,255,0.32)",
        }}
      />

      <div className="flex h-full flex-col justify-between p-5">
        {/* Top row: logo + avatar */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-[7px] flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              <span className="text-white/90 text-[11px] font-bold tracking-tight">PRV</span>
            </div>
          </div>
          {card.avatarUrl ? (
            <img
              src={card.avatarUrl}
              alt=""
              className="w-12 h-12 rounded-[14px] object-cover"
              style={{ border: "1px solid rgba(255,255,255,0.18)" }}
            />
          ) : (
            <div
              className="w-12 h-12 rounded-[14px] flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              <span className="text-white/60 text-[18px] font-medium">
                {card.fullName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Name + title */}
        <div>
          <p className="text-white/90 text-[17px] font-semibold leading-tight tracking-tight">
            {card.fullName}
          </p>
          {card.jobTitle && (
            <p className="text-white/55 text-[12px] mt-0.5 leading-tight">{card.jobTitle}</p>
          )}
          {card.companyName && (
            <p className="text-white/35 text-[11px] mt-0.5 leading-tight">{card.companyName}</p>
          )}
        </div>

        {/* Contact details */}
        <div className="space-y-0.5">
          {card.phone && <p className="text-white/55 text-[11px] font-medium">{card.phone}</p>}
          {card.email && <p className="text-white/55 text-[11px] font-medium">{card.email}</p>}
          {card.linkedInUrl && !card.email && (
            <p className="text-white/40 text-[11px]">{card.linkedInUrl.replace("https://", "")}</p>
          )}
        </div>
      </div>

      {/* Flip hint */}
      {onFlip && (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            right: 14,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        </div>
      )}
    </div>
  )
}
