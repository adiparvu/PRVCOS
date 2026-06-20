import { inngest } from "../client"

// Runs daily at 09:00 in each user's local timezone (approximated as 07:00 UTC).
// Groups unread low/normal notifications from the past 24h and sends a digest email.
// Critical notifications are excluded — they are delivered immediately.

export const notificationDigestFunction = inngest.createFunction(
  {
    id: "prv-notification-digest",
    name: "Daily Notification Digest",
    retries: 2,
  },
  { cron: "0 7 * * *" }, // 07:00 UTC daily
  async ({ step }) => {
    // Step 1: find all users who have unread non-critical in-app notifications older than 1h
    const recipients = await step.run("find-digest-recipients", async () => {
      const { db } = await import("@prv/db")
      const { notifications, notificationPreferences, users } = await import("@prv/db/schema")
      const { sql, and, eq, isNull, lt, ne, inArray, not } = await import("drizzle-orm")

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

      // Find users with email enabled and unread notifications from last 24h
      const rows = await db
        .selectDistinct({
          userId: notifications.userId,
          companyId: notifications.companyId,
          userEmail: users.email,
          firstName: users.firstName,
        })
        .from(notifications)
        .innerJoin(users, eq(notifications.userId, users.id))
        .where(
          and(
            eq(notifications.isRead, false),
            eq(notifications.isDismissed, false),
            not(inArray(notifications.type, ["error"])),
            sql`${notifications.createdAt} >= ${since}`,
            sql`${notifications.createdAt} < ${oneHourAgo}`,
            isNull(notifications.scheduledFor)
          )
        )
        .limit(500)

      // Filter to users who have email digest enabled
      const userIds = [...new Set(rows.map((r) => r.userId))]
      const prefs = await db
        .select({ userId: notificationPreferences.userId, email: notificationPreferences.email })
        .from(notificationPreferences)
        .where(inArray(notificationPreferences.userId, userIds))

      const emailEnabled = new Set(prefs.filter((p) => p.email).map((p) => p.userId))

      return rows.filter((r) => emailEnabled.has(r.userId) && !!r.userEmail)
    })

    if (recipients.length === 0) return { sent: 0 }

    // Step 2: for each recipient, fetch their notifications and send digest
    let sent = 0
    for (const rec of recipients) {
      await step.run(`digest-${rec.userId}`, async () => {
        const { db } = await import("@prv/db")
        const { notifications } = await import("@prv/db/schema")
        const { sql, and, eq } = await import("drizzle-orm")

        const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

        const items = await db
          .select({
            title: notifications.title,
            body: notifications.body,
            actionUrl: notifications.actionUrl,
            type: notifications.type,
            createdAt: notifications.createdAt,
          })
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, rec.userId),
              eq(notifications.companyId, rec.companyId),
              eq(notifications.isRead, false),
              eq(notifications.isDismissed, false),
              sql`${notifications.createdAt} >= ${since}`
            )
          )
          .limit(20)

        if (items.length === 0) return

        // Build digest email
        const { sendEmail, EmailFrom } = await import("@prv/email")

        const itemRows = items
          .map(
            (n) =>
              `<tr>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08)">
                  <strong style="color:#fff;font-size:14px">${n.title}</strong>
                  ${n.body ? `<br><span style="color:rgba(255,255,255,0.55);font-size:13px">${n.body}</span>` : ""}
                  ${n.actionUrl ? `<br><a href="${n.actionUrl}" style="color:#fff;font-size:12px;opacity:0.7">Vizualizează →</a>` : ""}
                </td>
              </tr>`
          )
          .join("")

        const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#000;color:#fff;font-family:system-ui,sans-serif;padding:32px;max-width:600px;margin:0 auto">
  <h2 style="font-size:20px;font-weight:700;margin:0 0 4px">Rezumat notificări</h2>
  <p style="color:rgba(255,255,255,0.55);font-size:14px;margin:0 0 24px">
    Ai ${items.length} notificare${items.length !== 1 ? "i" : ""} necitite${rec.firstName ? `, ${rec.firstName}` : ""}.
  </p>
  <table style="width:100%;border-collapse:collapse">${itemRows}</table>
  <p style="margin:24px 0 0;font-size:12px;color:rgba(255,255,255,0.30)">
    Primești acest email deoarece ai notificări necitite în PRV.
    <a href="/settings/notifications" style="color:rgba(255,255,255,0.50)">Gestionează preferințele</a>
  </p>
</body>
</html>`

        await sendEmail({
          to: rec.userEmail!,
          from: EmailFrom.NOTIFICATIONS,
          subject: `PRV · ${items.length} notificare${items.length !== 1 ? "i" : ""} necitite`,
          html,
          tags: [{ name: "type", value: "digest" }],
        })
      })
      sent++
    }

    return { sent }
  }
)
