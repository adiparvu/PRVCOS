import { db } from "@prv/db"
import { criticalAlertRoutes, notifications } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"

// Critical-alert producer for a freshly REPORTED critical incident.
//
// The assignment alert (incident → investigator) has an intrinsic recipient;
// a report does not — nobody has been assigned yet. So the recipient comes
// from the company's declared safety.incident_critical route
// (critical_alert_routes, Phase 14.5): no active route → no alert, the
// recipient is never guessed. Routed to the reporter themselves → skipped
// (they already know).
//
// Callers invoke this AFTER the incident row is committed and must treat it
// as fail-open: a notification hiccup must never 500 an already-inserted
// incident — an offline replay retrying on 500 would file the incident twice.

export const CRITICAL_INCIDENT_TRIGGER = "safety.incident_critical"

export interface CriticalIncidentInput {
  companyId: string
  incidentId: string
  title: string
  location?: string | null
  reporterId: string
}

/** @returns true when an alert was raised, false when skipped (no route / self). */
export async function raiseCriticalIncidentAlert(input: CriticalIncidentInput): Promise<boolean> {
  const [route] = await db
    .select({ routeToUserId: criticalAlertRoutes.routeToUserId })
    .from(criticalAlertRoutes)
    .where(
      and(
        eq(criticalAlertRoutes.companyId, input.companyId),
        eq(criticalAlertRoutes.triggerKey, CRITICAL_INCIDENT_TRIGGER),
        eq(criticalAlertRoutes.isActive, true)
      )
    )
    .limit(1)

  if (!route || route.routeToUserId === input.reporterId) return false

  await db.insert(notifications).values({
    userId: route.routeToUserId,
    companyId: input.companyId,
    type: "error",
    channel: "in_app",
    title: `Incident critic raportat: ${input.title}`.slice(0, 500),
    body: input.location
      ? `Un incident de severitate critică a fost raportat la „${input.location}". Necesită triaj imediat — nu are încă un investigator.`
      : "Un incident de severitate critică a fost raportat. Necesită triaj imediat — nu are încă un investigator.",
    entityType: "safety_incident",
    entityId: input.incidentId,
    actionUrl: `/safety/incidents/${input.incidentId}`,
    requiresAck: true,
    deliveredAt: new Date(),
  })
  return true
}
