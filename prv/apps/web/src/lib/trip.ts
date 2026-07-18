/**
 * Pure helpers for vehicle trip management (Phase 22.3).
 *
 * A trip starts when a driver takes a vehicle out (recording the start
 * odometer) and closes when it comes back (end odometer). Distance and fuel
 * cost-per-km are derived from those readings; the status moves in one
 * direction only. Keeping the arithmetic and the transition rule here means
 * the trip routes stay thin and the behaviour is unit-tested in one place.
 */

export type TripStatus = "in_progress" | "completed" | "cancelled"

/** Distance covered between two odometer readings, floored at zero so a bad
 * (end < start) reading never yields a negative distance. */
export function tripDistanceKm(startOdometerKm: number, endOdometerKm: number): number {
  return Math.max(0, endOdometerKm - startOdometerKm)
}

/** A closing odometer reading is valid only when it is at or beyond the start. */
export function isOdometerRangeValid(startOdometerKm: number, endOdometerKm: number): boolean {
  return endOdometerKm >= startOdometerKm
}

/** Fuel cost per kilometre, rounded to the cent. Zero distance → zero (avoids
 * a divide-by-zero and reads sensibly for a same-odometer trip). */
export function costPerKm(fuelCost: number, distanceKm: number): number {
  if (distanceKm <= 0) return 0
  return Math.round((fuelCost / distanceKm) * 100) / 100
}

/** Trips only ever move forward out of `in_progress` — into completed or
 * cancelled. A closed trip is terminal. */
export function canTransitionTrip(from: TripStatus, to: TripStatus): boolean {
  if (from !== "in_progress") return false
  return to === "completed" || to === "cancelled"
}
