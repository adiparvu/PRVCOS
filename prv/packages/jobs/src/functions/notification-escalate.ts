import { inngest } from "../client"

// Phase 14.6 — Notification Escalation / SLA sweep.
// Hourly: any action_required notification that is still unread AND undismissed
// past a company escalation policy's slaMinutes is escalated ONCE — a new
// action_required notification is created for the policy's explicit target user,
// and the original is stamped escalated_at so it never escalates again.
//
// The policy-selection + breach logic below is a self-contained copy of the
// logic unit-tested in apps/web/src/lib/notification-escalation.ts (package
// boundaries prevent a shared import from a job); keep the two in sync.

interface PolicyRow {
  id: string
  companyId: string
  entityType: string | null
  slaMinutes: number
  escalateToUserId: string
}

interface NotifRow {
  id: string
  companyId: string
  userId: string
  entityType: string | null
  title: string
  body: string | null
  actionUrl: string | null
  entityId: string | null
  createdAt: Date
}

// Choose the governing policy: a specific entityType policy beats a company-wide
// (null) one; within equal specificity the tightest slaMinutes wins.
function selectPolicy(policies: PolicyRow[], n: NotifRow): PolicyRow | null {
  let best: PolicyRow | null = null
  for (const p of policies) {
    if (p.companyId !== n.companyId) continue
    if (p.entityType !== null && p.entityType !== n.entityType) continue
    if (best === null) {
      best = p
      continue
    }
    const pSpecific = p.entityType !== null
    const bestSpecific = best.entityType !== null
    if (pSpecific !== bestSpecific) {
      if (pSpecific) best = p
      continue
    }
    if (p.slaMinutes < best.slaMinutes) best = p
  }
  return best
}

export const notificationEscalateFunction = inngest.createFunction(
  {
    id: "prv-notification-escalate",
    name: "Notification Escalation — Hourly",
    retries: 2,
    concurrency: { limit: 1 },
  },
  { cron: "0 * * * *" }, // top of every hour
  async ({ step }) => {
    return step.run("escalate-breached", async () => {
      const { db } = await import("@prv/db")
      const { notifications, notificationEscalationPolicies } = await import("@prv/db/schema")
      const { and, eq, isNull, inArray } = await import("drizzle-orm")
      const now = new Date()

      // 1. Active policies across all companies.
      const policies: PolicyRow[] = await db
        .select({
          id: notificationEscalationPolicies.id,
          companyId: notificationEscalationPolicies.companyId,
          entityType: notificationEscalationPolicies.entityType,
          slaMinutes: notificationEscalationPolicies.slaMinutes,
          escalateToUserId: notificationEscalationPolicies.escalateToUserId,
        })
        .from(notificationEscalationPolicies)
        .where(eq(notificationEscalationPolicies.isActive, true))
        .limit(1000)

      if (policies.length === 0) return { escalated: 0, candidates: 0 }

      const companyIds = [...new Set(policies.map((p) => p.companyId))]

      // 2. Pending, not-yet-escalated action_required notifications for those companies.
      const candidates: NotifRow[] = await db
        .select({
          id: notifications.id,
          companyId: notifications.companyId,
          userId: notifications.userId,
          entityType: notifications.entityType,
          title: notifications.title,
          body: notifications.body,
          actionUrl: notifications.actionUrl,
          entityId: notifications.entityId,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(
          and(
            eq(notifications.type, "action_required"),
            eq(notifications.isRead, false),
            eq(notifications.isDismissed, false),
            isNull(notifications.escalatedAt),
            inArray(notifications.companyId, companyIds)
          )
        )
        .limit(1000)

      if (candidates.length === 0) return { escalated: 0, candidates: 0 }

      let escalated = 0

      for (const n of candidates) {
        const policy = selectPolicy(policies, n)
        if (!policy) continue

        const ageMin = Math.floor((now.getTime() - n.createdAt.getTime()) / 60_000)
        if (ageMin < policy.slaMinutes) continue
        if (policy.escalateToUserId === n.userId) continue // no self-escalation

        // Stamp the original first, guarded on escalated_at IS NULL so a retry (or
        // a concurrent run) never escalates the same notification twice. Only if
        // this claim wins do we create the escalation copy.
        const claimed = await db
          .update(notifications)
          .set({ escalatedAt: now })
          .where(and(eq(notifications.id, n.id), isNull(notifications.escalatedAt)))
          .returning({ id: notifications.id })

        if (claimed.length === 0) continue

        await db.insert(notifications).values({
          userId: policy.escalateToUserId,
          companyId: n.companyId,
          type: "action_required",
          channel: "in_app",
          title: `Escalat: ${n.title}`.slice(0, 500),
          body:
            `Nicio acțiune după ${policy.slaMinutes} min. ` +
            (n.body ? n.body : "Necesită atenția ta."),
          actionUrl: n.actionUrl,
          entityType: n.entityType,
          entityId: n.entityId,
          deliveredAt: now,
          metadata: {
            escalatedFrom: n.id,
            originalRecipient: n.userId,
            policyId: policy.id,
            slaMinutes: policy.slaMinutes,
            ageMinutes: ageMin,
          },
        })

        escalated++
      }

      return { escalated, candidates: candidates.length }
    })
  }
)
