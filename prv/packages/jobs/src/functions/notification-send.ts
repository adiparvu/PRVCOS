import { inngest } from "../client"

// Notification dispatcher — triggered by prv/notification.send.
// Inserts the notification row and, in future sprints, fans out to
// email/push/SMS based on the user's notification preferences.
export const notificationSendFunction = inngest.createFunction(
  {
    id: "prv-notification-send",
    name: "Notification Dispatcher",
    retries: 3,
    concurrency: { limit: 50 },
  },
  { event: "prv/notification.send" },
  async ({ event, step }) => {
    const { userId, companyId, type, templateId, variables } = event.data

    const inserted = await step.run("insert-notification", async () => {
      const { db } = await import("@prv/db")
      const { notifications } = await import("@prv/db/schema")

      // Resolve title/body from template variables
      const title = variables["title"] ?? templateId
      const body = variables["body"] ?? undefined

      const [row] = await db
        .insert(notifications)
        .values({
          userId,
          companyId,
          type: type as "info" | "warning" | "error" | "success" | "action_required",
          channel: "in_app",
          title,
          body,
          entityType: variables["entityType"],
          entityId: variables["entityId"] as string | undefined,
          actionUrl: variables["actionUrl"],
          deliveredAt: new Date(),
          metadata: variables,
        })
        .returning({ id: notifications.id })

      return { notificationId: row!.id }
    })

    return { notificationId: inserted.notificationId, userId, companyId }
  }
)
