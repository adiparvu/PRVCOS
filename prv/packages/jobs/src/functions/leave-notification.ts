import { inngest } from "../client"

export const leaveNotificationFunction = inngest.createFunction(
  {
    id: "prv-leave-notification",
    name: "Leave Request Notification",
    retries: 3,
  },
  { event: "prv/leave.status_changed" },
  async ({ event, step }) => {
    const { leaveId, userId, companyId, decision, leaveType, startDate, endDate, approverName, notes } =
      event.data

    // Step 1: Resolve employee details
    const employee = await step.run("resolve-employee", async () => {
      const { db } = await import("@prv/db")
      const { users } = await import("@prv/db/schema")
      const { eq } = await import("drizzle-orm")

      const [row] = await db
        .select({ firstName: users.firstName, lastName: users.lastName, email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      return row ?? null
    })

    if (!employee) return { skipped: true, reason: "user_not_found" }

    const employeeName = `${employee.firstName} ${employee.lastName}`
    const isApproved = decision === "approved"

    // Step 2: Send in-app notification
    await step.run("in-app-notification", async () => {
      const { db } = await import("@prv/db")
      const { notifications } = await import("@prv/db/schema")

      await db.insert(notifications).values({
        userId,
        companyId,
        type: isApproved ? "success" : "warning",
        channel: "in_app",
        title: isApproved ? "Leave request approved" : "Leave request declined",
        body: isApproved
          ? `Your ${leaveType} leave (${startDate} – ${endDate}) has been approved by ${approverName}.`
          : `Your ${leaveType} leave (${startDate} – ${endDate}) has been declined by ${approverName}.`,
        entityType: "leave_request",
        entityId: leaveId,
        actionUrl: "/people/time-off",
        deliveredAt: new Date(),
      })
    })

    // Step 3: Send email (if user has email)
    if (employee.email) {
      await step.run("email-notification", async () => {
        const { sendEmail, EmailFrom, leaveDecisionEmail } = await import("@prv/email")

        const dashboardUrl = process.env["NEXT_PUBLIC_APP_URL"]
          ? `${process.env["NEXT_PUBLIC_APP_URL"]}/people/time-off`
          : undefined

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
          to: employee.email,
          from: EmailFrom.NOTIFICATIONS,
          subject,
          html,
          tags: [
            { name: "type", value: "leave_decision" },
            { name: "decision", value: decision },
          ],
        })

        return { sent: true }
      })
    }

    return {
      leaveId,
      userId,
      decision,
      emailSent: !!employee.email,
    }
  }
)
