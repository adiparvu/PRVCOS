import { inngest } from "../client"

export const learningCompleteFunction = inngest.createFunction(
  {
    id: "prv-learning-complete",
    name: "Learning Course Completion Handler",
    retries: 3,
    concurrency: { limit: 30 },
  },
  { event: "prv/learning.course_completed" },
  async ({ event, step }) => {
    const { courseId, userId, companyId, courseTitle, courseCategory, instructorName, completedAt } =
      event.data

    // Step 1: load employee email
    const employee = await step.run("load-employee", async () => {
      const { db } = await import("@prv/db")
      const { users } = await import("@prv/db/schema")
      const { eq } = await import("drizzle-orm")

      const [row] = await db
        .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      return row ?? null
    })

    if (!employee) return { skipped: true, reason: "user_not_found" }

    const emp = employee as { email: string; firstName: string | null; lastName: string | null }
    const employeeName = [emp.firstName, emp.lastName].filter(Boolean).join(" ") || emp.email
    const completedDate = new Date(completedAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })

    // Step 2: insert in-app achievement notification
    await step.run("insert-notification", async () => {
      const { db } = await import("@prv/db")
      const { notifications } = await import("@prv/db/schema")

      await db.insert(notifications).values({
        userId,
        companyId,
        type: "success",
        channel: "in_app",
        title: `You completed "${courseTitle}"`,
        body: `Congratulations! Your certificate of completion is now available.`,
        entityType: "course",
        entityId: courseId,
        actionUrl: "/learning",
        deliveredAt: new Date(),
        metadata: { courseCategory, completedDate },
      })
    })

    // Step 3: send certificate email
    if (emp.email) {
      await step.run("send-certificate-email", async () => {
        const { sendEmail, EmailFrom, learningCertificateEmail } = await import("@prv/email")

        const dashboardUrl = process.env["NEXT_PUBLIC_APP_URL"]
          ? `${process.env["NEXT_PUBLIC_APP_URL"]}/learning`
          : undefined

        const { subject, html } = learningCertificateEmail({
          employeeName,
          courseTitle,
          courseCategory,
          completedDate,
          instructorName,
          dashboardUrl,
        })

        await sendEmail({
          to: emp.email,
          from: EmailFrom.NOTIFICATIONS,
          subject,
          html,
          tags: [
            { name: "type", value: "learning_certificate" },
            { name: "course_id", value: courseId },
          ],
        })

        return { sent: true, to: emp.email }
      })
    }

    return {
      courseId,
      userId,
      completedAt,
      emailSent: !!emp.email,
    }
  }
)
