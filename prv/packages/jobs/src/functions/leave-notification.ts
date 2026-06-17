import { inngest } from "../client"

export const leaveNotificationFunction = inngest.createFunction(
  {
    id: "prv-leave-notification",
    name: "Leave Decision Notifier",
    retries: 3,
    concurrency: { limit: 20 },
  },
  { event: "prv/leave.status_changed" },
  async ({ event, step }) => {
    const { leaveId, userId, companyId, decision, leaveType, startDate, endDate, approverName, notes, dashboardUrl } =
      event.data

    // Step 1: load employee email + name
    const employee = await step.run("load-employee", async () => {
      const { db } = await import("@prv/db")
      const { users } = await import("@prv/db/schema")
      const { eq } = await import("drizzle-orm")

      const [user] = await db
        .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      return user ?? null
    })

    if (!employee) return { skipped: true, reason: "employee not found" }

    const emp = employee as { email: string; firstName: string | null; lastName: string | null }
    const employeeName = [emp.firstName, emp.lastName].filter(Boolean).join(" ") || emp.email

    // Step 2: insert in-app notification
    const inserted = await step.run("insert-notification", async () => {
      const { db } = await import("@prv/db")
      const { notifications } = await import("@prv/db/schema")

      const title =
        decision === "approved"
          ? "Your leave request has been approved"
          : "Your leave request has been declined"

      const [row] = await db
        .insert(notifications)
        .values({
          userId,
          companyId,
          type: decision === "approved" ? "success" : "info",
          channel: "in_app",
          title,
          body: `Your leave request (${startDate} – ${endDate}) was ${decision} by ${approverName}.`,
          entityType: "leave_request",
          entityId: leaveId,
          actionUrl: dashboardUrl,
          deliveredAt: new Date(),
          metadata: { decision, leaveType, startDate, endDate, approverName },
        })
        .returning({ id: notifications.id })

      return { notificationId: row!.id }
    })

    // Step 3: send decision email
    await step.run("send-email", async () => {
      const { sendEmail, EmailFrom, leaveDecisionEmail } = await import("@prv/email")

      const { subject, html } = leaveDecisionEmail({
        employeeName,
        decision: decision as "approved" | "rejected",
        leaveType: leaveType as "annual" | "medical" | "unpaid" | "other",
        startDate,
        endDate,
        approverName,
        notes,
        dashboardUrl,
      })

      await sendEmail({
        to: emp.email,
        from: EmailFrom.NOTIFICATIONS,
        subject,
        html,
        tags: [
          { name: "type", value: "leave_decision" },
          { name: "decision", value: decision },
        ],
      })

      return { sent: true, to: emp.email }
    })

    return {
      leaveId,
      userId,
      decision,
      notificationId: inserted.notificationId,
      emailSentTo: emp.email,
    }
  }
)
