"use client"

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import {
  type AppearancePrefs,
  DEFAULT_APPEARANCE,
  type GlassStyle,
  type Theme,
} from "../themes/index"

interface AppearanceContextValue {
  theme: Theme
  glassStyle: GlassStyle
  syncEnabled: boolean
  resolvedTheme: "dark" | "light"
  setTheme: (theme: Theme) => void
  setGlassStyle: (style: GlassStyle) => void
  setSyncEnabled: (enabled: boolean) => void
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

const LS_KEY = "prv_appearance"

function readLocalStorage(): Partial<AppearancePrefs> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as Partial<AppearancePrefs>) : {}
  } catch {
    return {}
  }
}

function writeLocalStorage(prefs: AppearancePrefs) {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(prefs))
  } catch {
    // storage unavailable — silent
  }
}

function resolveTheme(theme: Theme): "dark" | "light" {
  if (theme !== "system") return theme
  if (typeof window === "undefined") return "dark"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyToHtml(prefs: AppearancePrefs) {
  if (typeof document === "undefined") return
  const html = document.documentElement
  html.setAttribute("data-theme", prefs.theme)
  html.setAttribute("data-glass", prefs.glassStyle)
}

export interface AppearanceProviderProps {
  children: React.ReactNode
  initialPrefs?: Partial<AppearancePrefs>
  /** Called debounced (800ms) after any preference change. Defaults to PATCH /api/preferences. */
  onSave?: (prefs: AppearancePrefs) => Promise<void>
  /** Override the default sync endpoint. Defaults to "/api/preferences". */
  syncEndpoint?: string
}

export function AppearanceProvider({
  children,
  initialPrefs,
  onSave,
  syncEndpoint = "/api/preferences",
}: AppearanceProviderProps) {
  const [prefs, setPrefs] = useState<AppearancePrefs>(() => {
    const local = readLocalStorage()
    return { ...DEFAULT_APPEARANCE, ...initialPrefs, ...local }
  })

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Apply on mount and whenever prefs change
  useEffect(() => {
    applyToHtml(prefs)
    writeLocalStorage(prefs)
  }, [prefs])

  // Reflect system theme changes when theme === "system"
  useEffect(() => {
    if (prefs.theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => applyToHtml(prefs)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [prefs])

  const persist = useCallback(
    (next: AppearancePrefs) => {
      if (!next.syncEnabled) return
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        const doSave = onSave
          ? onSave(next)
          : fetch(syncEndpoint, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                theme: next.theme,
                glassStyle: next.glassStyle,
                syncEnabled: next.syncEnabled,
              }),
            }).then(() => undefined)
        doSave.catch(() => {
          // sync failure is non-fatal — localStorage retains the preference
        })
      }, 800)
    },
    [onSave, syncEndpoint]
  )

  const update = useCallback(
    (patch: Partial<AppearancePrefs>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch }
        persist(next)
        return next
      })
    },
    [persist]
  )

  const setTheme = useCallback((theme: Theme) => update({ theme }), [update])
  const setGlassStyle = useCallback((glassStyle: GlassStyle) => update({ glassStyle }), [update])
  const setSyncEnabled = useCallback((syncEnabled: boolean) => update({ syncEnabled }), [update])

  const resolvedTheme = resolveTheme(prefs.theme)

  return (
    <AppearanceContext.Provider
      value={{
        theme: prefs.theme,
        glassStyle: prefs.glassStyle,
        syncEnabled: prefs.syncEnabled,
        resolvedTheme,
        setTheme,
        setGlassStyle,
        setSyncEnabled,
      }}
    >
      {children}
    </AppearanceContext.Provider>
  )
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext)
  if (!ctx) throw new Error("useAppearance must be used inside AppearanceProvider")
  return ctx
}

// Inline script injected into <head> for zero-flash SSR.
// Reads localStorage and sets data-theme/data-glass on <html> before first paint.
export const APPEARANCE_SCRIPT = `(function(){
  try{
    var p=JSON.parse(localStorage.getItem('prv_appearance')||'{}');
    var t=p.theme||'system';
    var g=p.glassStyle||'adaptive';
    if(t==='system'){t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';}
    document.documentElement.setAttribute('data-theme',t);
    document.documentElement.setAttribute('data-glass',g);
  }catch(e){}
})();`
