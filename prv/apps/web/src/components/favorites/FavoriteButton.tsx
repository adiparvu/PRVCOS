"use client"

import { useFavorites, useToggleFavorite, type FavoriteTarget } from "@/lib/api-hooks"

// Glass star toggle (roadmap 5.7). Drop next to any entity title to let the user
// favorite it. Reads the synced favorites list to decide filled vs outline, and
// toggles via the shared mutation. SF-symbol-style star, monochrome per HIG.
export function FavoriteButton({
  target,
  size = 32,
  className,
}: {
  target: FavoriteTarget
  size?: number
  className?: string
}) {
  const { data } = useFavorites()
  const toggle = useToggleFavorite()

  const favorited = !!data?.favorites?.some(
    (f) => f.entityType === target.entityType && f.entityId === target.entityId
  )

  const icon = size * 0.5

  return (
    <button
      type="button"
      aria-pressed={favorited}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      disabled={toggle.isPending}
      onClick={() => toggle.mutate({ target, favorited })}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        background: favorited ? "rgba(255,255,255,0.14)" : "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
        color: favorited ? "var(--prv-text-1)" : "var(--prv-text-3)",
        cursor: toggle.isPending ? "default" : "pointer",
        opacity: toggle.isPending ? 0.6 : 1,
        transition: "background 0.18s cubic-bezier(0.34,1.56,0.64,1), color 0.18s",
      }}
    >
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 24 24"
        fill={favorited ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  )
}
