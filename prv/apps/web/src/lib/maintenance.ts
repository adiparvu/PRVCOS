/**
 * Pure helpers for asset maintenance records (Phase 22.4).
 *
 * Vehicles and tools share one maintenance ledger: each record is a piece of
 * work — scheduled, in progress, done or cancelled — with a cost, a provider
 * and (for vehicles) an odometer reading. While any record is still open the
 * asset is out of service; once the last one closes it returns to the pool.
 * The status machine and that out-of-service rule live here so the fleet and
 * tool routes stay thin and the behaviour is unit-tested in one place.
 */

export type MaintenanceAssetType = "vehicle" | "tool"
export type MaintenanceStatus = "scheduled" | "in_progress" | "completed" | "cancelled"

const NEXT_STATUS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  scheduled: ["in_progress", "completed", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
}

/** A record is "open" — the asset is out of service — while it is scheduled or
 * actively in progress. Completed and cancelled records are historical. */
export function isOpenMaintenance(status: MaintenanceStatus): boolean {
  return status === "scheduled" || status === "in_progress"
}

/** Whether a maintenance record may move from one status to another. Completed
 * and cancelled are terminal; a no-op transition is not allowed. */
export function canTransitionMaintenance(from: MaintenanceStatus, to: MaintenanceStatus): boolean {
  return NEXT_STATUS[from].includes(to)
}

/** An asset is out of service whenever it has at least one open record. */
export function assetInMaintenance(openRecordCount: number): boolean {
  return openRecordCount > 0
}

/**
 * Whether closing one open record returns the asset to service: only when it
 * was the last open record. `openRecordCount` is the count *including* the one
 * being closed.
 */
export function returnsToServiceOnClose(openRecordCount: number): boolean {
  return openRecordCount <= 1
}
