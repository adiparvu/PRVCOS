"use client"

import React from "react"
import { clsx } from "clsx"
import { type GlassStyle, type Theme } from "../themes/index"
import { useAppearance } from "../providers/appearance"

// ── Theme option ──────────────────────────────────────────────────────────────

interface ThemeOptionProps {
  value: Theme
  current: Theme
  onSelect: (t: Theme) => void
}

// Static previews intentionally use literal colors — they illustrate the theme
// itself (dark=black, light=white/grey, system=split), not the current theme.
const THEME_META: Record<Theme, { label: string; preview: React.ReactNode }> = {
  dark: {
    label: "Dark",
    preview: (
      <div
        className="w-full h-8 rounded-lg overflow-hidden border relative"
        style={{ background: "#000", borderColor: "rgba(255,255,255,0.12)" }}
      >
        <div
          className="absolute top-1.5 left-1.5 right-1.5 h-1.5 rounded"
          style={{ background: "rgba(255,255,255,0.15)" }}
        />
      </div>
    ),
  },
  light: {
    label: "Light",
    preview: (
      <div
        className="w-full h-8 rounded-lg overflow-hidden border relative"
        style={{ background: "#f2f2f7", borderColor: "rgba(0,0,0,0.08)" }}
      >
        <div
          className="absolute top-1.5 left-1.5 right-1.5 h-1.5 rounded"
          style={{ background: "rgba(0,0,0,0.10)" }}
        />
      </div>
    ),
  },
  system: {
    label: "System",
    preview: (
      <div
        className="w-full h-8 rounded-lg overflow-hidden border relative"
        style={{
          background: "linear-gradient(135deg, #000 50%, #f2f2f7 50%)",
          borderColor: "rgba(255,255,255,0.10)",
        }}
      >
        <div
          className="absolute top-1.5 left-1.5 right-1.5 h-1.5 rounded"
          style={{
            background: "linear-gradient(90deg, rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.10) 50%)",
          }}
        />
      </div>
    ),
  },
}

function ThemeOption({ value, current, onSelect }: ThemeOptionProps) {
  const active = current === value
  const meta = THEME_META[value]
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className="relative flex flex-col items-center gap-2 rounded-[14px] border px-2 py-3 transition-all duration-200 focus-visible:outline-none"
      style={{
        borderColor: active ? "var(--prv-border-strong)" : "var(--prv-border-subtle)",
        background: active ? "var(--prv-g2)" : "var(--prv-g1)",
        boxShadow: active ? "0 0 0 1px var(--prv-border)" : undefined,
      }}
    >
      {active && (
        <span
          className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full"
          style={{ background: "var(--prv-text-1)" }}
        >
          <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
            <path
              d="M1 2.5L2.8 4.3L6 1"
              stroke="var(--prv-bg)"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
      {meta.preview}
      <span
        className="text-[11px] font-medium leading-none"
        style={{ color: active ? "var(--prv-text-1)" : "var(--prv-text-2)" }}
      >
        {meta.label}
      </span>
    </button>
  )
}

// ── Glass style option ────────────────────────────────────────────────────────

interface GlassOptionProps {
  value: GlassStyle
  current: GlassStyle
  onSelect: (g: GlassStyle) => void
}

const GLASS_META: Record<GlassStyle, { label: string; description: string; badge?: string }> = {
  translucid: { label: "Translucid", description: "Maximum transparency" },
  tinted: { label: "Tinted", description: "Subtle color wash" },
  adaptive: { label: "Adaptive", description: "Adjusts to context", badge: "Smart" },
}

// Swatch styles use the glass levels to preview the effect — theme-aware
const swatchStyle: Record<GlassStyle, React.CSSProperties> = {
  translucid: { background: "var(--prv-g1)", backdropFilter: "blur(40px)" },
  tinted: {
    background: "color-mix(in srgb, var(--prv-g2) 70%, rgba(100,105,130,0.18) 30%)",
    backdropFilter: "blur(32px)",
  },
  adaptive: { background: "var(--prv-g2)", backdropFilter: "blur(32px)" },
}

function GlassOption({ value, current, onSelect }: GlassOptionProps) {
  const active = current === value
  const meta = GLASS_META[value]

  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className="relative flex flex-col gap-2 rounded-[14px] border p-2.5 text-left transition-all duration-200 focus-visible:outline-none"
      style={{
        borderColor: active ? "var(--prv-border-strong)" : "var(--prv-border-subtle)",
        background: active ? "var(--prv-g2)" : "var(--prv-g1)",
        boxShadow: active ? "0 0 0 1px var(--prv-border)" : undefined,
      }}
    >
      <div
        className="h-9 w-full rounded-lg border"
        style={{ ...swatchStyle[value], borderColor: "var(--prv-border-subtle)" }}
      />
      <div>
        <p
          className="text-[12px] font-semibold leading-none mb-0.5"
          style={{ color: active ? "var(--prv-text-1)" : "var(--prv-text-2)" }}
        >
          {meta.label}
        </p>
        <p className="text-[10px] leading-snug" style={{ color: "var(--prv-text-3)" }}>
          {meta.description}
        </p>
        {meta.badge && (
          <span
            className="mt-1 inline-flex items-center gap-1 rounded-[5px] border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
            style={{
              borderColor: "var(--prv-border)",
              background: "var(--prv-g1)",
              color: "var(--prv-text-3)",
            }}
          >
            <span className="h-1 w-1 rounded-full bg-current" />
            {meta.badge}
          </span>
        )}
      </div>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export interface AppearanceSettingsProps {
  onSave?: () => void
  className?: string
}

const THEMES: Theme[] = ["dark", "light", "system"]
const GLASS_STYLES: GlassStyle[] = ["translucid", "tinted", "adaptive"]

export function AppearanceSettings({ onSave, className }: AppearanceSettingsProps) {
  const { theme, glassStyle, syncEnabled, setTheme, setGlassStyle, setSyncEnabled } =
    useAppearance()

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-3xl border backdrop-blur-[48px] backdrop-saturate-[180%]",
        className
      )}
      style={{
        background: "var(--prv-g2)",
        borderColor: "var(--prv-border)",
        boxShadow: "var(--prv-shadow-e4)",
      }}
    >
      {/* top specular */}
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: "var(--prv-g2-spec)" }} />

      {/* header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-1">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border"
          style={{ borderColor: "var(--prv-border)", background: "var(--prv-g2)" }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--prv-text-2)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z" />
            <path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7" />
            <path d="M14.5 17.5 4.5 15" />
          </svg>
        </div>
        <div>
          <p
            className="text-[16px] font-semibold leading-tight"
            style={{ color: "var(--prv-text-1)" }}
          >
            Appearance
          </p>
          <p className="text-[12px] leading-tight" style={{ color: "var(--prv-text-3)" }}>
            Personalize your experience
          </p>
        </div>
      </div>

      {/* theme section */}
      <div className="px-5 pt-4 pb-2">
        <p
          className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--prv-text-3)" }}
        >
          Theme
        </p>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <ThemeOption key={t} value={t} current={theme} onSelect={setTheme} />
          ))}
        </div>
      </div>

      <div className="mx-5 h-px" style={{ background: "var(--prv-border-subtle)" }} />

      {/* glass style section */}
      <div className="px-5 pt-4 pb-2">
        <p
          className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--prv-text-3)" }}
        >
          Liquid Glass Style
        </p>
        <div className="grid grid-cols-3 gap-2">
          {GLASS_STYLES.map((g) => (
            <GlassOption key={g} value={g} current={glassStyle} onSelect={setGlassStyle} />
          ))}
        </div>
      </div>

      <div className="mx-5 h-px" style={{ background: "var(--prv-border-subtle)" }} />

      {/* sync row */}
      <div className="px-5 py-4">
        <p
          className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--prv-text-3)" }}
        >
          Sync
        </p>
        <div
          className="flex items-center justify-between rounded-xl border px-4 py-3"
          style={{ borderColor: "var(--prv-border-subtle)", background: "var(--prv-g1)" }}
        >
          <div className="flex items-center gap-2.5">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--prv-text-2)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
            </svg>
            <div>
              <p
                className="text-[13px] font-medium leading-none"
                style={{ color: "var(--prv-text-1)" }}
              >
                Sync across devices
              </p>
              <p className="mt-0.5 text-[11px] leading-none" style={{ color: "var(--prv-text-3)" }}>
                iPhone · iPad · Mac · Web · Android
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={syncEnabled}
            onClick={() => setSyncEnabled(!syncEnabled)}
            className="relative h-6 w-[42px] rounded-full transition-colors duration-200 focus-visible:outline-none"
            style={{ background: syncEnabled ? "var(--prv-text-1)" : "var(--prv-g3)" }}
          >
            <span
              className={clsx(
                "absolute top-[2px] h-5 w-5 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform duration-200",
                syncEnabled ? "translate-x-[22px]" : "translate-x-[2px]"
              )}
              style={{ background: "var(--prv-bg)" }}
            />
          </button>
        </div>
      </div>

      {/* Done button */}
      <div className="px-5 pb-5">
        <button
          type="button"
          onClick={onSave}
          className="w-full rounded-[14px] py-3.5 text-[14px] font-semibold transition-all duration-150 active:scale-[0.98] active:opacity-85 focus-visible:outline-none"
          style={{ background: "var(--prv-text-1)", color: "var(--prv-bg)" }}
        >
          Done
        </button>
      </div>
    </div>
  )
}
