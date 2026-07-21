import { inngest } from "../client"
import { buildMilestoneMissedAlert, MILESTONE_MISSED_TRIGGER } from "../lib/milestone-missed"

// Phase 14.5 — Missed-milestone routed critical alert.
//
// Daily sweep: any renovation phase still OPEN (pending / in_progress / paused)
// whose planned end date has already passed is a slipped milestone. Unlike an
// assigned incident or a permit requester, a slipped project milestone has no
// single natural recipient — so the company ADMIN declares, per the
// `ops.milestone_missed` trigger, exactly which user receives the alert
// (critical_alert_routes). A company with no active route raises no alert; the
// recipient is never guessed.
//
// Each newly-detected slipped phase is claimed by stamping
// milestoneMissedAlertedAt (claim-on-null), so a routed critical alert fires at
// most once per phase even across retries. Phases in a terminal status are never
// candidates, so a phase that later completes is simply never revisited.
export const milestoneMissedFunction = inngest.createFunction(
  {
    id: "prv-milestone-missed",
    name: "Milestone Missed — Routed Critical Alert (Daily)",
    retries: 2,
    concurrency: { limit: 1 },
  },
  { cron: "40 1 * * *" }, // 01:40 UTC daily (after inspection-overdue at 01:20)
  async ({ step }) => {
    // Step 1: find open phases past their planned end date, not yet alerted.
    const candidates = await step.run("find-slipped-phases", async () => {
      const { db } = await import("@prv/db")
      const { renovationPhases, renovationProjects } = await import("@prv/db/schema")
      const { and, eq, lt, isNull, isNotNull, inArray } = await import("drizzle-orm")

      // A phase due today is not yet overdue (daysOverdue floors today to 0), so
      // the filter is strictly-before-today's date.
      const today = new Date().toISOString().slice(0, 10)

      return db
        .select({
          phaseId: renovationPhases.id,
          phaseTitle: renovationPhases.title,
          plannedEnd: renovationPhases.plannedEndDate,
          projectId: renovationProjects.id,
          companyId: renovationProjects.companyId,
          projectTitle: renovationProjects.title,
          projectCode: renovationProjects.projectCode,
        })
        .from(renovationPhases)
        .innerJoin(renovationProjects, eq(renovationPhases.projectId, renovationProjects.id))
        .where(
          and(
            inArray(renovationPhases.status, ["pending", "in_progress", "paused"]),
            isNull(renovationPhases.milestoneMissedAlertedAt),
            isNotNull(renovationPhases.plannedEndDate),
            lt(renovationPhases.plannedEndDate, today),
            // Skip phases of projects that are themselves terminal.
            inArray(renovationProjects.status, [
              "inquiry",
              "estimation",
              "contracted",
              "in_progress",
              "paused",
            ])
          )
        )
        .limit(500)
    })

    if (candidates.length === 0) return { slipped: 0, claimed: 0, routed: 0 }

    // Step 2: claim the phases (stamp milestoneMissedAlertedAt on the still-null
    // rows) so the alert fires at most once, even if a retry re-runs this cron.
    const claimedIds = await step.run("claim-phases", async () => {
      const { db } = await import("@prv/db")
      const { renovationPhases } = await import("@prv/db/schema")
      const { and, eq, isNull, inArray } = await import("drizzle-orm")
      const now = new Date()

      const claimed = await db
        .update(renovationPhases)
        .set({ milestoneMissedAlertedAt: now, updatedAt: now })
        .where(
          and(
            inArray(
              renovationPhases.id,
              candidates.map((c) => c.phaseId)
            ),
            isNull(renovationPhases.milestoneMissedAlertedAt)
          )
        )
        .returning({ id: renovationPhases.id })

      return claimed.map((r) => r.id)
    })

    if (claimedIds.length === 0) return { slipped: candidates.length, claimed: 0, routed: 0 }
    const claimedSet = new Set(claimedIds)
    const claimed = candidates.filter((c) => claimedSet.has(c.phaseId))

    // Step 3: resolve each company's ops.milestone_missed route and raise one
    // requiresAck critical alert per claimed phase whose company has an active
    // route. Companies without a route raise nothing (recipient never guessed).
    const routed = await step.run("route-and-alert", async () => {
      const { db } = await import("@prv/db")
      const { criticalAlertRoutes, notifications } = await import("@prv/db/schema")
      const { and, eq, inArray } = await import("drizzle-orm")

      const companyIds = [...new Set(claimed.map((c) => c.companyId))]

      const routes = await db
        .select({
          companyId: criticalAlertRoutes.companyId,
          routeToUserId: criticalAlertRoutes.routeToUserId,
        })
        .from(criticalAlertRoutes)
        .where(
          and(
            inArray(criticalAlertRoutes.companyId, companyIds),
            eq(criticalAlertRoutes.triggerKey, MILESTONE_MISSED_TRIGGER),
            eq(criticalAlertRoutes.isActive, true)
          )
        )

      const recipientByCompany = new Map(routes.map((r) => [r.companyId, r.routeToUserId]))
      const now = new Date()

      const rows = claimed
        .map((c) => {
          const recipientId = recipientByCompany.get(c.companyId)
          if (!recipientId) return null
          const projectLabel = c.projectCode
            ? `${c.projectCode} — ${c.projectTitle}`
            : c.projectTitle
          return buildMilestoneMissedAlert({
            recipientId,
            companyId: c.companyId,
            phaseId: c.phaseId,
            projectId: c.projectId,
            projectLabel,
            phaseTitle: c.phaseTitle,
            plannedEnd: String(c.plannedEnd),
            now,
          })
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)

      if (rows.length === 0) return 0
      for (let i = 0; i < rows.length; i += 500) {
        await db.insert(notifications).values(rows.slice(i, i + 500))
      }
      return rows.length
    })

    return { slipped: candidates.length, claimed: claimed.length, routed }
  }
)
