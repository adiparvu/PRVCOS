import { inngest } from "../client"

export const renovationMilestoneFunction = inngest.createFunction(
  {
    id: "prv-renovation-milestone",
    name: "Renovation Milestone Reached Handler",
    retries: 3,
    concurrency: { limit: 10 },
  },
  { event: "prv/renovation.milestone_reached" },
  async ({ event, step }) => {
    const { projectId, companyId, milestoneTitle, phaseTitle, completedAt } = event.data

    // Step 1: load project + project manager + company admins
    const payload = await step.run("load-project-and-stakeholders", async () => {
      const { db } = await import("@prv/db")
      const { renovationProjects, companyMemberships, users } = await import("@prv/db/schema")
      const { eq, and, inArray } = await import("drizzle-orm")

      const [project] = await db
        .select({
          id: renovationProjects.id,
          title: renovationProjects.title,
          projectCode: renovationProjects.projectCode,
          projectManagerId: renovationProjects.projectManagerId,
          currency: renovationProjects.currency,
        })
        .from(renovationProjects)
        .where(and(eq(renovationProjects.id, projectId), eq(renovationProjects.companyId, companyId)))
        .limit(1)

      if (!project) return null

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

      const userIds = new Set(members.map((m) => m.userId))
      if (project.projectManagerId) userIds.add(project.projectManagerId)

      if (userIds.size === 0) return { project, stakeholders: [] }

      const stakeholders = await db
        .select({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(inArray(users.id, [...userIds]))

      return { project, stakeholders }
    })

    if (!payload || !payload.project) return { skipped: true, reason: "project_not_found" }
    const { project, stakeholders } = payload

    if (stakeholders.length === 0) return { skipped: true, reason: "no_stakeholders" }

    const projectLabel = project.projectCode
      ? `${project.projectCode} — ${project.title}`
      : project.title

    const milestoneBody = phaseTitle
      ? `Phase "${phaseTitle}" milestone reached: ${milestoneTitle}`
      : `Milestone reached: ${milestoneTitle}`

    const completedDate = new Date(completedAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })

    const dashboardUrl = process.env["NEXT_PUBLIC_APP_URL"]
      ? `${process.env["NEXT_PUBLIC_APP_URL"]}/renovation/${project.id}`
      : undefined

    // Step 2: insert in-app notifications
    await step.run("insert-notifications", async () => {
      const { db } = await import("@prv/db")
      const { notifications } = await import("@prv/db/schema")

      const rows = stakeholders.map((s) => ({
        userId: s.id,
        companyId,
        type: "success" as const,
        channel: "in_app" as const,
        title: `Milestone reached — ${projectLabel}`,
        body: milestoneBody,
        entityType: "renovation_project",
        entityId: project.id,
        actionUrl: `/renovation/${project.id}`,
        deliveredAt: new Date(),
        metadata: {
          milestoneTitle,
          phaseTitle: phaseTitle ?? null,
          completedAt,
        } as Record<string, unknown>,
      }))

      await db.insert(notifications).values(rows)
      return { inserted: rows.length }
    })

    // Step 3: send milestone email to stakeholders
    await step.run("send-emails", async () => {
      const { sendEmail, EmailFrom } = await import("@prv/email")
      const { baseTemplate, emailStyles } = await import("@prv/email")

      const phaseRow = phaseTitle
        ? `<tr>
             <td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.45);border-top:1px solid rgba(255,255,255,0.08);">Phase</td>
             <td style="padding:8px 0;font-size:14px;color:rgba(255,255,255,0.90);font-weight:500;border-top:1px solid rgba(255,255,255,0.08);">${phaseTitle}</td>
           </tr>`
        : ""

      const ctaHtml = dashboardUrl
        ? `<div style="text-align:center;margin:32px 0;">
             <a href="${dashboardUrl}" style="${emailStyles.button}">View Project</a>
           </div>`
        : ""

      const subject = `Milestone reached — ${projectLabel}`
      const content = `
        <h1 style="${emailStyles.h1}">Milestone Reached</h1>
        <p style="${emailStyles.body}">
          A milestone has been completed for project
          <strong style="color:#fff;">${projectLabel}</strong>.
        </p>
        <div style="margin:24px 0;padding:16px;background:rgba(48,209,88,0.10);border:1px solid rgba(48,209,88,0.25);border-radius:12px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.45);width:40%;">Project</td>
              <td style="padding:8px 0;font-size:14px;color:rgba(255,255,255,0.90);font-weight:500;">${projectLabel}</td>
            </tr>
            ${phaseRow}
            <tr>
              <td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.45);border-top:1px solid rgba(255,255,255,0.08);">Milestone</td>
              <td style="padding:8px 0;font-size:14px;color:rgba(255,255,255,0.90);font-weight:600;border-top:1px solid rgba(255,255,255,0.08);">${milestoneTitle}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.45);border-top:1px solid rgba(255,255,255,0.08);">Completed</td>
              <td style="padding:8px 0;font-size:14px;color:#30d158;font-weight:600;border-top:1px solid rgba(255,255,255,0.08);">${completedDate}</td>
            </tr>
          </table>
        </div>
        ${ctaHtml}
        <hr style="${emailStyles.divider}" />
        <p style="${emailStyles.muted}">
          Keep the momentum going — check the next phase tasks in PRV.
        </p>
      `
      const html = baseTemplate(content, subject)

      const results = await Promise.allSettled(
        stakeholders.map((s) =>
          sendEmail({
            to: s.email,
            from: EmailFrom.NOTIFICATIONS,
            subject,
            html,
            tags: [
              { name: "type", value: "renovation_milestone" },
              { name: "project_id", value: project.id },
            ],
          })
        )
      )

      const sent = results.filter((r) => r.status === "fulfilled").length
      return { sent, total: stakeholders.length }
    })

    return { projectId, milestoneTitle, stakeholdersNotified: stakeholders.length }
  }
)
