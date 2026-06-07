import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type VehicleStatus = "Active" | "Idle" | "Service" | "Unavailable"

export interface VehicleSummary {
  id: string
  plate: string
  model: string
  year: number
  type: string
  fuel: string
  base: string
  status: VehicleStatus
  driver: string | null
  assignment: string | null
  fuelPct: number
  kmToday: number
}

export interface FleetMeta {
  total: number
  active: number
  inService: number
  avgFuel: number
  serviceAlert: boolean
}

const MOCK_VEHICLES: VehicleSummary[] = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
]

export const GET = withGates(
  { action: "fleet.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") as VehicleStatus | null
    const results = status ? MOCK_VEHICLES.filter((v) => v.status === status) : MOCK_VEHICLES

    const active = MOCK_VEHICLES.filter((v) => v.status === "Active").length
    const inService = MOCK_VEHICLES.filter((v) => v.status === "Service").length
    const avgFuel = Math.round(
      MOCK_VEHICLES.reduce((s, v) => s + v.fuelPct, 0) / MOCK_VEHICLES.length
    )

    const meta: FleetMeta = {
      total: MOCK_VEHICLES.length,
      active,
      inService,
      avgFuel,
      serviceAlert: inService > 0,
    }

    return NextResponse.json({ vehicles: results, count: results.length, meta })
  }
)
