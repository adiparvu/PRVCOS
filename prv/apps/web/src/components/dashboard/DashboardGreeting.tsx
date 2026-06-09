"use client"

import { useEffect, useState } from "react"

// WMO weather code → label + icon variant
// https://open-meteo.com/en/docs#weathervariables
function wmoToCondition(code: number): { label: string; variant: "sun" | "cloud" | "rain" | "snow" | "storm" } {
  if (code === 0) return { label: "Clear", variant: "sun" }
  if (code <= 2) return { label: "Partly cloudy", variant: "cloud" }
  if (code === 3) return { label: "Overcast", variant: "cloud" }
  if (code <= 49) return { label: "Foggy", variant: "cloud" }
  if (code <= 59) return { label: "Drizzle", variant: "rain" }
  if (code <= 69) return { label: "Rain", variant: "rain" }
  if (code <= 79) return { label: "Snow", variant: "snow" }
  if (code <= 84) return { label: "Showers", variant: "rain" }
  if (code <= 94) return { label: "Snow showers", variant: "snow" }
  return { label: "Thunderstorm", variant: "storm" }
}

function WeatherIcon({ variant }: { variant: "sun" | "cloud" | "rain" | "snow" | "storm" }) {
  if (variant === "sun")
    return (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(255,159,10,0.95)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    )
  if (variant === "rain")
    return (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(100,160,255,0.90)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
        <line x1="8" y1="19" x2="8" y2="21" /><line x1="12" y1="17" x2="12" y2="19" />
        <line x1="16" y1="19" x2="16" y2="21" />
      </svg>
    )
  if (variant === "snow")
    return (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(180,220,255,0.90)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
        <line x1="8" y1="19" x2="8" y2="21" /><line x1="12" y1="19" x2="12" y2="21" />
        <line x1="16" y1="19" x2="16" y2="21" />
      </svg>
    )
  if (variant === "storm")
    return (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(255,214,10,0.95)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9" />
        <polyline points="13 11 9 17 15 17 11 23" />
      </svg>
    )
  // cloud / overcast / fog
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(180,180,200,0.85)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  )
}

interface WeatherState {
  temp: number
  city: string
  condition: string
  variant: "sun" | "cloud" | "rain" | "snow" | "storm"
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherState> {
  const [meteoRes, geoRes] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode`
    ),
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    ),
  ])

  const meteo = (await meteoRes.json()) as {
    current: { temperature_2m: number; weathercode: number }
  }
  const geo = (await geoRes.json()) as {
    address?: { city?: string; town?: string; village?: string; county?: string }
  }

  const { label, variant } = wmoToCondition(meteo.current.weathercode)
  const city =
    geo.address?.city ?? geo.address?.town ?? geo.address?.village ?? geo.address?.county ?? "—"

  return { temp: Math.round(meteo.current.temperature_2m), city, condition: label, variant }
}

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export interface DashboardGreetingProps {
  name?: string
  tasksToday?: number
}

export function DashboardGreeting({ name, tasksToday }: DashboardGreetingProps) {
  const [now, setNow] = useState<Date | null>(null)
  const [weather, setWeather] = useState<WeatherState | null>(null)

  useEffect(() => {
    setNow(new Date())
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void fetchWeather(pos.coords.latitude, pos.coords.longitude).then(setWeather)
      },
      () => {
        // Permission denied or unavailable — leave weather null (widget hides gracefully)
      },
      { timeout: 5000 }
    )
  }, [])

  const greeting = now ? greetingFor(now.getHours()) : "Welcome back"
  const dateLabel = now
    ? now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : ""

  return (
    <div className="flex gap-3 mb-3.5">
      {/* Greeting */}
      <div
        className="flex-1 rounded-[18px] p-4 flex flex-col justify-center"
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
        }}
      >
        <div className="text-[13px]" style={{ color: "var(--prv-text-3)" }}>{greeting},</div>
        <div className="text-[20px] font-bold tracking-tight mt-0.5" style={{ color: "var(--prv-text-1)" }}>{name ?? "there"} 👋</div>
        <div className="text-[12px] mt-1" style={{ color: "var(--prv-text-3)" }}>
          {dateLabel}
          {tasksToday !== undefined ? ` · ${tasksToday} tasks today` : ""}
        </div>
      </div>

      {/* Weather widget */}
      <div
        className="w-[128px] rounded-[18px] p-4 flex flex-col items-center justify-center gap-1"
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
        }}
      >
        {weather ? (
          <>
            <WeatherIcon variant={weather.variant} />
            <div className="text-[20px] font-bold" style={{ color: "var(--prv-text-1)" }}>
              {weather.temp}°
            </div>
            <div className="text-[11px] text-center leading-tight" style={{ color: "var(--prv-text-3)" }}>
              {weather.city} · {weather.condition}
            </div>
          </>
        ) : (
          <>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
            <div style={{ width: 32, height: 14, borderRadius: 4, background: "rgba(255,255,255,0.07)", marginTop: 2 }} />
            <div style={{ width: 52, height: 10, borderRadius: 4, background: "rgba(255,255,255,0.07)" }} />
          </>
        )}
      </div>
    </div>
  )
}
