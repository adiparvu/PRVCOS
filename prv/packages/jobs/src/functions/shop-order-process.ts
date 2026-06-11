import { inngest } from "../client"

export const shopOrderProcessFunction = inngest.createFunction(
  {
    id: "prv-shop-order-process",
    name: "Shop Order Status Processor",
    retries: 3,
    concurrency: { limit: 50 },
  },
  { event: "prv/shop.order.status_changed" },
  async ({ event, step }) => {
    const { orderId, companyId, orderNumber, fromStatus, toStatus } = event.data

    // Step 1: load order + client contact info
    const orderData = await step.run("load-order", async () => {
      const { db } = await import("@prv/db")
      const { orders, orderItems, clients } = await import("@prv/db/schema")
      const { eq, and } = await import("drizzle-orm")

      const [order] = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          total: orders.total,
          clientId: orders.clientId,
          shippingAddress: orders.shippingAddress,
        })
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.companyId, companyId)))
        .limit(1)

      if (!order) return { found: false }

      const items = await db
        .select({
          name: orderItems.name,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId))

      let clientEmail: string | null = null
      let clientName: string | null = null

      if (order.clientId) {
        const [client] = await db
          .select({ email: clients.email, name: clients.name })
          .from(clients)
          .where(eq(clients.id, order.clientId))
          .limit(1)
        clientEmail = client?.email ?? null
        clientName = client?.name ?? null
      }

      return { found: true, order, items, clientEmail, clientName }
    })

    if (!orderData.found) return { skipped: true, reason: "order not found" }

    // Step 2: deduct stock when order is confirmed
    if (toStatus === "confirmed") {
      await step.run("deduct-stock", async () => {
        const { db } = await import("@prv/db")
        const { products, orderItems } = await import("@prv/db/schema")
        const { eq, sql, and, isNull } = await import("drizzle-orm")

        const items = await db
          .select({ productId: orderItems.productId, quantity: orderItems.quantity })
          .from(orderItems)
          .where(eq(orderItems.orderId, orderId))

        const deductions: Array<{ productId: string; qty: number }> = []
        for (const item of items) {
          if (!item.productId) continue
          await db
            .update(products)
            .set({
              stockQuantity: sql`GREATEST(0, ${products.stockQuantity} - ${item.quantity})`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(products.id, item.productId),
                eq(products.companyId, companyId),
                isNull(products.deletedAt)
              )
            )
          deductions.push({ productId: item.productId, qty: item.quantity })
        }

        return { deductedCount: deductions.length }
      })
    }

    // Step 3: send customer notification for key transitions
    const notifyOn = ["confirmed", "shipped", "delivered", "cancelled"]
    if (notifyOn.includes(toStatus) && orderData.clientEmail) {
      await step.run("notify-customer", async () => {
        const { sendEmail, EmailFrom } = await import("@prv/email")

        const subjectMap: Record<string, string> = {
          confirmed: `Order ${orderNumber} confirmed`,
          shipped: `Order ${orderNumber} has shipped`,
          delivered: `Order ${orderNumber} delivered`,
          cancelled: `Order ${orderNumber} cancelled`,
        }
        const bodyMap: Record<string, string> = {
          confirmed: `Your order ${orderNumber} has been confirmed and is being prepared.`,
          shipped: `Good news! Your order ${orderNumber} is on its way.`,
          delivered: `Your order ${orderNumber} has been delivered. Thank you for your purchase!`,
          cancelled: `Your order ${orderNumber} has been cancelled.`,
        }

        await sendEmail({
          to: orderData.clientEmail!,
          from: EmailFrom.NOTIFICATIONS,
          subject: subjectMap[toStatus] ?? `Order ${orderNumber} update`,
          html: `<p>Hi ${orderData.clientName ?? "there"},</p><p>${bodyMap[toStatus] ?? ""}</p>`,
          tags: [
            { name: "type", value: "order_status" },
            { name: "status", value: toStatus },
          ],
        })

        return { sent: true, to: orderData.clientEmail }
      })
    }

    return {
      orderId,
      orderNumber,
      fromStatus,
      toStatus,
      stockDeducted: toStatus === "confirmed",
      customerNotified: notifyOn.includes(toStatus) && !!orderData.clientEmail,
    }
  }
)
