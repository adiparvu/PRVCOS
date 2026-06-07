import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import type { VehicleSummary } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type MaintenanceStatus = "Done" | "Due Soon" | "Overdue"

export interface MaintenanceRecord {
  id: string
  label: string
  detail: string
  status: MaintenanceStatus
}

export interface ActivityEvent {
  id: string
  time: string
  label: string
  sub: string
  color: string
}

export interface VehicleDetail extends VehicleSummary {
  odometer: number
  nextServiceKm: number
  insurance: string
  itp: string
  maintenance: MaintenanceRecord[]
  activity: ActivityEvent[]
}

const MOCK_DETAIL: Record<string, VehicleDetail> = {
  v1: {
    id: "v1",
    plate: "B-44-PRV",
    model: "Ford Transit",
    year: 2023,
    type: "Van",
    fuel: "Diesel",
    base: "Cluj",
    status: "Active",
    driver: "Andrei Popescu",
    assignment: "Cluj → Timișoara",
    fuelPct: 78,
    kmToday: 214,
    odometer: 38412,
    nextServiceKm: 42000,
    insurance: "Valabilă · Dec 2026",
    itp: "Valabilă · Mar 2027",
    maintenance: [
      { id: "m1", label: "Full Service", detail: "Apr 12 · 34,100 km · €320", status: "Done" },
      { id: "m2", label: "Rotație anvelope", detail: "Feb 3 · 28,600 km · €80", status: "Done" },
      {
        id: "m3",
        label: "Schimb ulei + filtru",
        detail: "La 42,000 km · ~3,588 km distanță",
        status: "Due Soon",
      },
    ],
    activity: [
      {
        id: "a1",
        time: "07:48",
        label: "Plecat din Cluj HQ",
        sub: "Odometru: 38,198 km",
        color: "rgba(48,209,88,0.95)",
      },
      {
        id: "a2",
        time: "09:15",
        label: "Alimentat — Cluj Nord",
        sub: "42L · €78.50 · 78% → 100%",
        color: "rgba(10,132,255,0.9)",
      },
      {
        id: "a3",
        time: "11:30",
        label: "Ajuns pe șantier Timișoara",
        sub: "Traseu: 214 km · 3h 42m",
        color: "rgba(255,159,10,0.95)",
      },
      {
        id: "a4",
        time: "—",
        label: "Retur programat",
        sub: "Estimat 17:00",
        color: "rgba(255,255,255,0.35)",
      },
    ],
  },
  v2: {
    id: "v2",
    plate: "CJ-03-PRV",
    model: "VW Crafter",
    year: 2022,
    type: "Cargo Van",
    fuel: "Diesel",
    base: "Cluj",
    status: "Active",
    driver: "Elena Marin",
    assignment: "Timișoara site",
    fuelPct: 45,
    kmToday: 88,
    odometer: 54820,
    nextServiceKm: 56000,
    insurance: "Valabilă · Iun 2027",
    itp: "Valabilă · Sep 2026",
    maintenance: [
      { id: "m1", label: "Full Service", detail: "Mar 5 · 50,200 km · €280", status: "Done" },
      {
        id: "m2",
        label: "Plăcuțe frână",
        detail: "La 56,000 km · ~1,180 km distanță",
        status: "Due Soon",
      },
    ],
    activity: [
      {
        id: "a1",
        time: "06:30",
        label: "Plecat din Cluj HQ",
        sub: "Odometru: 54,732 km",
        color: "rgba(48,209,88,0.95)",
      },
      {
        id: "a2",
        time: "08:45",
        label: "Ajuns pe șantier Timișoara",
        sub: "Traseu: 88 km · 2h 15m",
        color: "rgba(255,159,10,0.95)",
      },
      {
        id: "a3",
        time: "—",
        label: "Pe șantier",
        sub: "Încărcare materiale",
        color: "rgba(255,255,255,0.35)",
      },
    ],
  },
  v3: {
    id: "v3",
    plate: "CJ-12-PRV",
    model: "Mercedes Sprinter",
    year: 2021,
    type: "Van",
    fuel: "Diesel",
    base: "Cluj",
    status: "Service",
    driver: null,
    assignment: "AutoPro Service · Schimb ulei + frâne",
    fuelPct: 60,
    kmToday: 0,
    odometer: 72100,
    nextServiceKm: 75000,
    insurance: "Valabilă · Aug 2026",
    itp: "Valabilă · Nov 2026",
    maintenance: [
      { id: "m1", label: "Full Service", detail: "Ian 18 · 65,000 km · €420", status: "Done" },
      {
        id: "m2",
        label: "Schimb ulei + frâne",
        detail: "În curs · AutoPro Cluj · Retur 8 Iun",
        status: "Due Soon",
      },
    ],
    activity: [
      {
        id: "a1",
        time: "08:00",
        label: "Predat la AutoPro",
        sub: "Mentenanță programată",
        color: "rgba(255,159,10,0.95)",
      },
      {
        id: "a2",
        time: "—",
        label: "Retur estimat",
        sub: "8 Iun · 16:00",
        color: "rgba(255,255,255,0.35)",
      },
    ],
  },
  v4: {
    id: "v4",
    plate: "TM-08-PRV",
    model: "Renault Master",
    year: 2022,
    type: "Van",
    fuel: "Diesel",
    base: "Timișoara",
    status: "Idle",
    driver: null,
    assignment: "Neasignat · Depozit Timișoara",
    fuelPct: 92,
    kmToday: 0,
    odometer: 29340,
    nextServiceKm: 32000,
    insurance: "Valabilă · Feb 2027",
    itp: "Valabilă · Mai 2027",
    maintenance: [
      { id: "m1", label: "Full Service", detail: "Mai 2 · 25,000 km · €260", status: "Done" },
    ],
    activity: [
      {
        id: "a1",
        time: "—",
        label: "Nicio activitate azi",
        sub: "Vehicul staționar în depozit",
        color: "rgba(255,255,255,0.35)",
      },
    ],
  },
}

export const GET = withGates(
  { action: "fleet.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const vehicle = MOCK_DETAIL[id]
    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ vehicle })
  }
)
