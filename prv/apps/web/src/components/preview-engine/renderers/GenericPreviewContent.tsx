"use client"

import type { PreviewPayload } from "../types"

interface Props {
  payload: PreviewPayload
  onAction: (actionId: string) => void
}

export function GenericPreviewContent({ payload, onAction }: Props) {
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-[16px] flex items-center justify-center shrink-0"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {payload.iconPath ? (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white/60"
            >
              <path d={payload.iconPath} />
            </svg>
          ) : (
            <span className="text-white/40 text-[10px] uppercase font-medium">
              {payload.entityType.slice(0, 3)}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white/90 text-[17px] font-semibold truncate">{payload.name}</p>
          {payload.subtitle && (
            <p className="text-white/50 text-[13px] mt-0.5 truncate">{payload.subtitle}</p>
          )}
        </div>
      </div>

      {/* Metadata rows */}
      {payload.metadata.length > 0 && (
        <div
          className="rounded-[14px] overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {payload.metadata.map(({ label, value }, i) => (
            <div
              key={label}
              className="flex items-center justify-between px-4 py-3"
              style={{
                borderTop: i > 0 ? "1px solid rgba(255,255,255,0.06)" : undefined,
              }}
            >
              <span className="text-[13px] text-white/40">{label}</span>
              <span className="text-[13px] text-white/80 font-medium">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Primary action */}
      {payload.actions[0] && (
        <button
          onClick={() => onAction(payload.actions[0]!.id)}
          className="w-full h-11 rounded-[14px] text-[14px] font-semibold text-black transition-all active:scale-[0.98]"
          style={{ background: "#FFFFFF" }}
        >
          {payload.actions[0].label}
        </button>
      )}
    </div>
  )
}
