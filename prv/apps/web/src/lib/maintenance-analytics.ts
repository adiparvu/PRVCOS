// Maintenance & trip analytics (Phase 22.4/22.3). Pure + unit-tested.
//
// Rolls the shared maintenance ledger and the vehicle-trip ledger into headline
// numbers for a Fleet & Tools cost view: how much maintenance is costing (by
// asset type and by work type), how many records are still open, and how far
// the fleet drove and what the fuel bill was. Cancelled records never count
// toward cost. Window filtering is the caller's job.

export interface MaintenanceRecordInput {
  assetType: "vehicle" | "tool"
  type: string
  status: string // scheduled | in_progress | completed | cancelled
  cost: number | null
}

export interface TripInput {
  status: string // in_progress | completed | cancelled
  distanceKm: number | null
  fuelCost: number | null
}

export interface CostByType {
  type: string
  cost: number
  count: number
}

export interface MaintenanceAnalytics {
  totalRecords: number
  openRecords: number
  completedRecords: number
  totalCost: number
  costByAssetType: { vehicle: number; tool: number }
  costByType: CostByType[] // most expensive first
  trips: {
    total: number
    completed: number
    totalDistanceKm: number
    totalFuelCost: number
  }
}

const round2 = (n: number): number => Math.round(n * 100) / 100
const num = (n: number | null): number => (n != null && Number.isFinite(n) ? n : 0)

export function computeMaintenanceAnalytics(
  records: MaintenanceRecordInput[],
  trips: TripInput[]
): MaintenanceAnalytics {
  let openRecords = 0
  let completedRecords = 0
  let totalCost = 0
  const byAsset = { vehicle: 0, tool: 0 }
  const byType = new Map<string, { cost: number; count: number }>()

  for (const r of records) {
    if (r.status === "scheduled" || r.status === "in_progress") openRecords++
    if (r.status === "completed") completedRecords++
    // Cancelled work is not a cost.
    if (r.status === "cancelled") continue
    const c = num(r.cost)
    totalCost += c
    byAsset[r.assetType] += c
    const t = byType.get(r.type) ?? { cost: 0, count: 0 }
    t.cost += c
    t.count += 1
    byType.set(r.type, t)
  }

  const costByType: CostByType[] = [...byType.entries()]
    .map(([type, v]) => ({ type, cost: round2(v.cost), count: v.count }))
    .sort((a, b) => b.cost - a.cost)

  let tripsCompleted = 0
  let totalDistanceKm = 0
  let totalFuelCost = 0
  for (const t of trips) {
    if (t.status === "cancelled") continue
    if (t.status === "completed") tripsCompleted++
    totalDistanceKm += num(t.distanceKm)
    totalFuelCost += num(t.fuelCost)
  }

  return {
    totalRecords: records.length,
    openRecords,
    completedRecords,
    totalCost: round2(totalCost),
    costByAssetType: { vehicle: round2(byAsset.vehicle), tool: round2(byAsset.tool) },
    costByType,
    trips: {
      total: trips.length,
      completed: tripsCompleted,
      totalDistanceKm: round2(totalDistanceKm),
      totalFuelCost: round2(totalFuelCost),
    },
  }
}
