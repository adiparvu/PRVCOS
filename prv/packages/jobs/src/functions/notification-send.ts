import { inngest } from "../client"

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

    // Step 1: insert the in-app notification row
    const inserted = await step.run("insert-notification", async () => {
      const { db } = await import("@prv/db")
      const { notifications } = await import("@prv/db/schema")

      const title = (variables["title"] as string | undefined) ?? templateId
      const body = variables["body"] as string | undefined

      const [row] = await db
        .insert(notifications)
        .values({
          userId,
          companyId,
          type: type as "info" | "warning" | "error" | "success" | "action_required",
          channel: "in_app",
          title,
          body,
          entityType: variables["entityType"] as string | undefined,
          entityId: variables["entityId"] as string | undefined,
          actionUrl: variables["actionUrl"] as string | undefined,
          deliveredAt: new Date(),
          metadata: variables as Record<string, unknown>,
        })
        .returning({ id: notifications.id })

      return { notificationId: row!.id }
    })

    // Step 2: load user prefs + email address in one step
    const prefs = await step.run("resolve-preferences", async () => {
      const { db } = await import("@prv/db")
      const { notificationPreferences, users } = await import("@prv/db/schema")
      const { eq, and } = await import("drizzle-orm")

      const [pref] = await db
        .select()
        .from(notificationPreferences)
        .where(
          and(
            eq(notificationPreferences.userId, userId),
            eq(notificationPreferences.companyId, companyId)
          )
        )
        .limit(1)

      const [user] = await db
        .select({ email: users.email, firstName: users.firstName })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      return {
        email: pref?.email ?? true,
        push: pref?.push ?? true,
        userEmail: user?.email,
        firstName: user?.firstName,
      }
    })

    // Step 3: email channel
    if (prefs.email && prefs.userEmail) {
      await step.run("send-email", async () => {
        const { sendEmail, EmailFrom, notificationEmail } = await import("@prv/email")

        const { subject, html } = notificationEmail({
          title: (variables["title"] as string | undefined) ?? templateId,
          body: variables["body"] as string | undefined,
          actionUrl: variables["actionUrl"] as string | undefined,
          actionLabel: variables["actionLabel"] as string | undefined,
          firstName: prefs.firstName,
        })

        await sendEmail({
          to: prefs.userEmail!,
          from: EmailFrom.NOTIFICATIONS,
          subject,
          html,
          tags: [
            { name: "type", value: type },
            { name: "template", value: templateId },
          ],
        })

        return { sent: true }
      })
    }

    // Step 4: push channel (provider not yet configured — stub)
    if (prefs.push) {
      await step.run("send-push", async () => {
        return { skipped: true, reason: "no push provider configured" }
      })
    }

    return {
      notificationId: inserted.notificationId,
      userId,
      companyId,
      channels: {
        inApp: true,
        email: !!(prefs.email && prefs.userEmail),
        push: false, // always false until push provider is wired
      },
    }
  }
)
