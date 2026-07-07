// Fleet utilization — Fleet Management analytics (roadmap Phase 21). Pure +
// unit-tested.
//
// Derives how hard the fleet is being worked from the daily odometer logs: per
// vehicle the kilometres driven over the window (latest reading minus earliest)
// and the days it was logged, plus fleet totals and a top-movers ranking. A
// vehicle needs at least two readings to show distance.

export interface DailyLogInput {
  vehicleId: string
  label: string
  date: string // YYYY-MM-DD or ISO
  odometerKm: number
}

export interface VehicleUtilization {
  vehicleId: string
  label: string
  kmDriven: number
  logDays: number
}

export interface FleetUtilization {
  windowDays: number
  vehiclesLogged: number // vehicles with at least one reading
  activeVehicles: number // vehicles that actually moved (kmDriven > 0)
  totalKm: number
  avgKmPerActive: number | null // totalKm / activeVehicles
  avgKmPerDay: number // totalKm / windowDays
  vehicles: VehicleUtilization[] // most kilometres first
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
function safeOdo(n: number): number {
  return Number.isFinite(n) ? n : 0
}

/**
 * Aggregate daily odometer logs into fleet utilization over `windowDays`. Only
 * readings passed in are considered; window filtering is the caller's job.
 */
export function computeFleetUtilization(
  logs: DailyLogInput[],
  windowDays: number
): FleetUtilization {
  const window = Math.max(1, Math.floor(windowDays))

  interface Acc {
    label: string
    min: number
    max: number
    days: Set<string>
  }
  const byVehicle = new Map<string, Acc>()

  for (const log of logs) {
    const odo = safeOdo(log.odometerKm)
    let acc = byVehicle.get(log.vehicleId)
    if (!acc) {
      acc = { label: log.label, min: odo, max: odo, days: new Set() }
      byVehicle.set(log.vehicleId, acc)
    }
    if (odo < acc.min) acc.min = odo
    if (odo > acc.max) acc.max = odo
    acc.days.add(log.date)
  }

  const vehicles: VehicleUtilization[] = [...byVehicle.entries()]
    .map(([vehicleId, a]) => ({
      vehicleId,
      label: a.label,
      kmDriven: Math.max(0, a.max - a.min),
      logDays: a.days.size,
    }))
    .sort((x, y) => y.kmDriven - x.kmDriven || x.label.localeCompare(y.label))

  const totalKm = vehicles.reduce((s, v) => s + v.kmDriven, 0)
  const activeVehicles = vehicles.filter((v) => v.kmDriven > 0).length

  return {
    windowDays: window,
    vehiclesLogged: vehicles.length,
    activeVehicles,
    totalKm,
    avgKmPerActive: activeVehicles > 0 ? round1(totalKm / activeVehicles) : null,
    avgKmPerDay: round1(totalKm / window),
    vehicles,
  }
}
