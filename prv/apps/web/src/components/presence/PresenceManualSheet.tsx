"use client"

import { useState } from "react"
import type { PresenceStatus } from "./PresenceDot"
import { PresenceDot } from "./PresenceDot"
import { useMyPresence } from "./hooks/useMyPresence"

interface Props {
  isOpen: boolean
  onClose: () => void
}

const STATUS_OPTIONS: { status: PresenceStatus; label: string }[] = [
  { status: "online", label: "Available" },
  { status: "away", label: "Away" },
  { status: "busy", label: "Busy" },
  { status: "in_meeting", label: "In a Meeting" },
  { status: "on_break", label: "On Break" },
  { status: "do_not_disturb", label: "Do Not Disturb" },
]

const DURATION_OPTIONS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "Today", minutes: 480 },
  { label: "Don't clear", minutes: 0 },
]

export function PresenceManualSheet({ isOpen, onClose }: Props) {
  const [selectedStatus, setSelectedStatus] = useState<PresenceStatus>("online")
  const [selectedDuration, setSelectedDuration] = useState(0)
  const [customMessage, setCustomMessage] = useState("")
  const { setStatus, isLoading } = useMyPresence()

  async function handleSubmit() {
    const success = await setStatus({
      status: selectedStatus,
      message: customMessage || undefined,
      clearAfterMinutes: selectedDuration > 0 ? selectedDuration : undefined,
    })
    if (success) onClose()
  }

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.6)",
          backdropFilter: isOpen ? "blur(12px)" : "none",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
        aria-hidden
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 mx-auto"
        style={{
          maxWidth: 640,
          transform: isOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 320ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <div
          className="rounded-t-[32px] pb-8"
          style={{
            background: "rgba(18,18,18,0.92)",
            backdropFilter: "blur(64px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderBottom: "none",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.14)",
          }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-4">
            <div
              className="rounded-full"
              style={{ width: 36, height: 4, background: "rgba(255,255,255,0.20)" }}
            />
          </div>

          <div className="px-5">
            <h2 className="text-white/90 text-[18px] font-semibold mb-5">Set Status</h2>

            {/* Status options */}
            <div
              className="rounded-[16px] overflow-hidden mb-4"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {STATUS_OPTIONS.map(({ status, label }, i) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                  style={{
                    borderTop: i > 0 ? "1px solid rgba(255,255,255,0.06)" : undefined,
                    background:
                      selectedStatus === status ? "rgba(255,255,255,0.08)" : "transparent",
                  }}
                >
                  <PresenceDot status={status} size={10} />
                  <span className="text-[15px] text-white/85 flex-1">{label}</span>
                  {selectedStatus === status && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white/60"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* Duration chips */}
            <p className="text-[11px] font-medium text-white/35 uppercase tracking-widest mb-2.5">
              Clear after
            </p>
            <div className="flex gap-2 mb-4">
              {DURATION_OPTIONS.map(({ label, minutes }) => (
                <button
                  key={minutes}
                  onClick={() => setSelectedDuration(minutes)}
                  className="flex-1 h-9 rounded-[10px] text-[12px] font-medium transition-colors"
                  style={{
                    background:
                      selectedDuration === minutes
                        ? "rgba(255,255,255,0.14)"
                        : "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color:
                      selectedDuration === minutes
                        ? "rgba(255,255,255,0.90)"
                        : "rgba(255,255,255,0.40)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Custom message */}
            <input
              type="text"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a message (optional)"
              maxLength={200}
              className="w-full h-11 rounded-[12px] px-4 text-[14px] text-white/80 placeholder:text-white/25 outline-none mb-5"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            />

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 h-11 rounded-[14px] text-[14px] font-medium text-white/50 transition-colors"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 h-11 rounded-[14px] text-[14px] font-semibold text-black transition-all disabled:opacity-50"
                style={{ background: "#FFFFFF" }}
              >
                {isLoading ? "Setting…" : "Set Status"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
