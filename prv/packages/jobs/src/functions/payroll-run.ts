import { inngest } from "../client"

export const payrollRunFunction = inngest.createFunction(
  {
    id: "prv-payroll-run",
    name: "Payroll Run Completed Handler",
    retries: 3,
    concurrency: { limit: 5 },
  },
  { event: "prv/payroll.run_completed" },
  async ({ event, step }) => {
    const { payrollRunId, companyId } = event.data

    // Step 1: load payroll run + HR managers
    const payload = await step.run("load-payroll-and-managers", async () => {
      const { db } = await import("@prv/db")
      const { payrollRuns, companyMemberships, users } = await import("@prv/db/schema")
      const { eq, and, inArray } = await import("drizzle-orm")

      const [run] = await db
        .select({
          id: payrollRuns.id,
          ref: payrollRuns.ref,
          title: payrollRuns.title,
          periodStart: payrollRuns.periodStart,
          periodEnd: payrollRuns.periodEnd,
          employeeCount: payrollRuns.employeeCount,
          totalGross: payrollRuns.totalGross,
          netPaid: payrollRuns.netPaid,
        })
        .from(payrollRuns)
        .where(and(eq(payrollRuns.id, payrollRunId), eq(payrollRuns.companyId, companyId)))
        .limit(1)

      if (!run) return null

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
      if (userIds.length === 0) return { run, managers: [] }

      const managers = await db
        .select({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(inArray(users.id, userIds))

      return { run, managers }
    })

    if (!payload || !payload.run) return { skipped: true, reason: "payroll_run_not_found" }
    const { run, managers } = payload

    if (managers.length === 0) return { skipped: true, reason: "no_managers" }

    const dashboardUrl = process.env["NEXT_PUBLIC_APP_URL"]
      ? `${process.env["NEXT_PUBLIC_APP_URL"]}/people/payroll/${run.id}`
      : undefined

    // Step 2: in-app notifications
    await step.run("insert-notifications", async () => {
      const { db } = await import("@prv/db")
      const { notifications } = await import("@prv/db/schema")

      const rows = managers.map((m) => ({
        userId: m.id,
        companyId,
        type: "success" as const,
        channel: "in_app" as const,
        title: `Payroll completed — ${run.ref}`,
        body: `Payroll run for ${run.periodStart} – ${run.periodEnd} is done. ${run.employeeCount} employees · ${run.netPaid} RON net paid.`,
        entityType: "payroll_run",
        entityId: run.id,
        actionUrl: `/people/payroll/${run.id}`,
        deliveredAt: new Date(),
        metadata: {
          ref: run.ref,
          periodStart: run.periodStart,
          periodEnd: run.periodEnd,
        } as Record<string, unknown>,
      }))

      await db.insert(notifications).values(rows)
      return { inserted: rows.length }
    })

    // Step 3: send summary email to each manager
    await step.run("send-emails", async () => {
      const { sendEmail, EmailFrom, payrollSlipEmail } = await import("@prv/email")

      const results = await Promise.allSettled(
        managers.map((m) => {
          const recipientName =
            [m.firstName, m.lastName].filter(Boolean).join(" ") || m.email
          const { subject, html } = payrollSlipEmail({
            recipientName,
            payrollRef: run.ref,
            periodStart: run.periodStart,
            periodEnd: run.periodEnd,
            employeeCount: run.employeeCount,
            totalGross: run.totalGross,
            netPaid: run.netPaid,
            dashboardUrl,
          })

          return sendEmail({
            to: m.email,
            from: EmailFrom.NOTIFICATIONS,
            subject,
            html,
            tags: [
              { name: "type", value: "payroll_run" },
              { name: "run_id", value: run.id },
            ],
          })
        })
      )

      const sent = results.filter((r) => r.status === "fulfilled").length
      return { sent, total: managers.length }
    })

    return { payrollRunId, ref: run.ref, managersNotified: managers.length }
  }
)
