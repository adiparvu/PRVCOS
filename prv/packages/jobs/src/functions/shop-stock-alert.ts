import { inngest } from "../client"

export const shopStockAlertFunction = inngest.createFunction(
  {
    id: "prv-shop-stock-alert",
    name: "Shop Low-Stock Alert",
    retries: 2,
    concurrency: { limit: 10 },
  },
  { event: "prv/shop.stock.low" },
  async ({ event, step }) => {
    const { companyId, productId, productName, stockQuantity, stockMinimum } = event.data

    // Step 1: find company admin users to notify
    const admins = await step.run("find-admins", async () => {
      const { db } = await import("@prv/db")
      const { companyMemberships, users } = await import("@prv/db/schema")
      const { eq, and, inArray } = await import("drizzle-orm")

      const members = await db
        .select({ userId: companyMemberships.userId })
        .from(companyMemberships)
        .where(
          and(
            eq(companyMemberships.companyId, companyId),
            eq(companyMemberships.status, "ACTIVE"),
            inArray(companyMemberships.primaryRole, ["owner", "admin", "manager"])
          )
        )
        .limit(20)

      const userIds = members.map((m) => m.userId)
      if (userIds.length === 0) return []

      const adminUsers = await db
        .select({ id: users.id, email: users.email, firstName: users.firstName })
        .from(users)
        .where(inArray(users.id, userIds))

      return adminUsers
    })

    if (admins.length === 0) return { skipped: true, reason: "no admins found" }

    // Step 2: insert in-app notifications for each admin
    await step.run("create-notifications", async () => {
      const { db } = await import("@prv/db")
      const { notifications } = await import("@prv/db/schema")

      const rows = admins.map((a) => ({
        userId: a.id,
        companyId,
        type: "warning" as const,
        channel: "in_app" as const,
        title: `Low stock: ${productName}`,
        body: `${productName} has only ${stockQuantity} units left (minimum: ${stockMinimum}).`,
        entityType: "product",
        entityId: productId,
        actionUrl: `/shop/products/${productId}`,
        deliveredAt: new Date(),
        metadata: { productId, stockQuantity, stockMinimum } as Record<string, unknown>,
      }))

      await db.insert(notifications).values(rows)
      return { notified: rows.length }
    })

    // Step 3: send email to each admin
    await step.run("send-emails", async () => {
      const { sendEmail, EmailFrom } = await import("@prv/email")

      const results = await Promise.allSettled(
        admins.map((a) =>
          sendEmail({
            to: a.email,
            from: EmailFrom.NOTIFICATIONS,
            subject: `Low stock alert: ${productName}`,
            html: `<p>Hi ${a.firstName ?? "there"},</p><p><strong>${productName}</strong> is running low — only <strong>${stockQuantity}</strong> units remaining (minimum: ${stockMinimum}).</p><p>Please restock soon to avoid stockouts.</p>`,
            tags: [{ name: "type", value: "stock_alert" }],
          })
        )
      )

      const sent = results.filter((r) => r.status === "fulfilled").length
      return { sent, total: admins.length }
    })

    return {
      companyId,
      productId,
      productName,
      stockQuantity,
      stockMinimum,
      adminsNotified: admins.length,
    }
  }
)
