import { inngest } from "../client"

// Phase 14.5 — Critical alert escalation.
// Every 5 minutes: any critical alert (requiresAck) left unacknowledged for 15+
// minutes is escalated ONCE to the recipient's manager — a NEW critical alert is
// created for the manager, and the original is stamped ack_escalated_at so it
// never escalates again.
//
// The "due" condition mirrors isAckEscalationDue in apps/web/src/lib/critical-alert.ts
// (package boundaries prevent a shared import). SAFE: escalation only reaches the
// recipient's EXPLICIT managerId — no org-chart guessing; a recipient with no
// manager is simply marked processed and never escalated.
const ESCALATE_MINUTES = 15
// Cap the manager chain so a managerId cycle (data bug) can never ping-pong
// critical alerts forever. Covers Employee → TL → OMS → Ops Manager → CEO.
const MAX_ESCALATION_DEPTH = 5

export const criticalAlertEscalateFunction = inngest.createFunction(
  {
    id: "prv-critical-alert-escalate",
    name: "Critical Alert Escalation — 5-min",
    retries: 2,
    concurrency: { limit: 1 },
  },
  { cron: "*/5 * * * *" },
  async ({ step }) => {
    return step.run("escalate-unacked", async () => {
      const { db } = await import("@prv/db")
      const { notifications, users } = await import("@prv/db/schema")
      const { and, eq, isNull, lte, gt, or } = await import("drizzle-orm")
      const now = new Date()
      const cutoff = new Date(now.getTime() - ESCALATE_MINUTES * 60_000)

      // Pending critical alerts past the escalation threshold, not yet escalated,
      // with the recipient's manager resolved.
      const due = await db
        .select({
          id: notifications.id,
          companyId: notifications.companyId,
          userId: notifications.userId,
          type: notifications.type,
          title: notifications.title,
          body: notifications.body,
          actionUrl: notifications.actionUrl,
          entityType: notifications.entityType,
          entityId: notifications.entityId,
          managerId: users.managerId,
          metadata: notifications.metadata,
        })
        .from(notifications)
        .innerJoin(users, eq(users.id, notifications.userId))
        .where(
          and(
            eq(notifications.requiresAck, true),
            isNull(notifications.acknowledgedAt),
            eq(notifications.isDismissed, false),
            isNull(notifications.ackEscalatedAt),
            lte(notifications.createdAt, cutoff),
            or(isNull(notifications.scheduledFor), lte(notifications.scheduledFor, now)),
            or(isNull(notifications.expiresAt), gt(notifications.expiresAt, now))
          )
        )
        .limit(500)

      if (due.length === 0) return { escalated: 0, processed: 0 }

      let escalated = 0

      for (const n of due) {
        // Claim the original first (guard on ack_escalated_at IS NULL) so a retry
        // or concurrent run never escalates twice.
        const claimed = await db
          .update(notifications)
          .set({ ackEscalatedAt: now })
          .where(and(eq(notifications.id, n.id), isNull(notifications.ackEscalatedAt)))
          .returning({ id: notifications.id })
        if (claimed.length === 0) continue

        // Only create the manager's alert when a manager exists.
        if (!n.managerId || n.managerId === n.userId) continue

        // Stop the chain at a fixed depth — a managerId cycle must never loop.
        const meta = (n.metadata ?? {}) as Record<string, unknown>
        const depth = typeof meta.escalationDepth === "number" ? meta.escalationDepth : 0
        if (depth >= MAX_ESCALATION_DEPTH) continue

        await db.insert(notifications).values({
          userId: n.managerId,
          companyId: n.companyId,
          type: n.type as "info" | "warning" | "error" | "success" | "action_required",
          channel: "in_app",
          title: `Escaladat: ${n.title}`.slice(0, 500),
          body:
            `O alertă critică nu a fost confirmată în ${ESCALATE_MINUTES} min. ` +
            (n.body ? n.body : "Necesită atenția ta."),
          actionUrl: n.actionUrl,
          entityType: n.entityType,
          entityId: n.entityId,
          requiresAck: true,
          deliveredAt: now,
          metadata: {
            escalatedFrom: n.id,
            originalRecipient: n.userId,
            escalationDepth: depth + 1,
          },
        })
        escalated++
      }

      return { escalated, processed: due.length }
    })
  }
)
