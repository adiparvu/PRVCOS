import { inngest } from "../client"

// Phase 6.2 — Recurring task generation.
// Hourly sweep: every enabled recurring rule whose next_run_at has passed spawns
// one backlog task on its project, then advances next_run_at by its frequency.
//
// The scheduling arithmetic is a self-contained copy of the logic unit-tested in
// apps/web/src/lib/report-schedule.ts (package boundaries prevent a shared import
// from a job); keep the two in sync if the rules change.

type Frequency = "daily" | "weekly" | "monthly"

function advanceOnce(from: Date, frequency: Frequency): Date {
  if (frequency === "daily") return new Date(from.getTime() + 86_400_000)
  if (frequency === "weekly") return new Date(from.getTime() + 7 * 86_400_000)
  const y = from.getUTCFullYear()
  const m = from.getUTCMonth()
  const d = from.getUTCDate()
  const lastDay = new Date(Date.UTC(y, m + 2, 0)).getUTCDate()
  return new Date(
    Date.UTC(
      y,
      m + 1,
      Math.min(d, lastDay),
      from.getUTCHours(),
      from.getUTCMinutes(),
      from.getUTCSeconds(),
      from.getUTCMilliseconds()
    )
  )
}

function computeNextRun(from: Date, frequency: Frequency, now: Date): Date {
  let next = advanceOnce(from, frequency)
  let guard = 0
  while (next.getTime() <= now.getTime() && guard < 1000) {
    next = advanceOnce(next, frequency)
    guard++
  }
  return next
}

export const recurringTaskGenerateFunction = inngest.createFunction(
  {
    id: "prv-recurring-task-generate",
    name: "Recurring Task Generation — Hourly",
    retries: 2,
    concurrency: { limit: 3 },
  },
  { cron: "0 * * * *" }, // top of every hour
  async ({ step }) => {
    const due = await step.run("fetch-due-rules", async () => {
      const { db } = await import("@prv/db")
      const { recurringTasks } = await import("@prv/db/schema")
      const { and, eq, lte } = await import("drizzle-orm")
      const now = new Date()
      return db
        .select()
        .from(recurringTasks)
        .where(and(eq(recurringTasks.enabled, true), lte(recurringTasks.nextRunAt, now)))
        .limit(200)
    })

    if (due.length === 0) return { generated: 0, due: 0 }

    let generated = 0

    for (const rule of due) {
      const ok = await step.run(`generate-${rule.id}`, async () => {
        const { db } = await import("@prv/db")
        const { recurringTasks, projectTasks, projects } = await import("@prv/db/schema")
        const { and, eq, isNull, sql } = await import("drizzle-orm")

        const now = new Date()
        const frequency = rule.frequency as Frequency
        let created = false

        // Skip generation if the project was archived/deleted, but still advance.
        const [project] = await db
          .select({ id: projects.id })
          .from(projects)
          .where(
            and(
              eq(projects.id, rule.projectId),
              eq(projects.companyId, rule.companyId),
              isNull(projects.deletedAt)
            )
          )
          .limit(1)

        if (project) {
          const [maxRow] = await db
            .select({ max: sql<number>`COALESCE(MAX(${projectTasks.orderIndex}), 0)::int` })
            .from(projectTasks)
            .where(
              and(
                eq(projectTasks.projectId, rule.projectId),
                eq(projectTasks.companyId, rule.companyId),
                eq(projectTasks.status, "backlog")
              )
            )

          await db.insert(projectTasks).values({
            companyId: rule.companyId,
            projectId: rule.projectId,
            title: rule.title,
            description: rule.description,
            priority: rule.priority,
            estimatedHours: rule.estimatedHours,
            assigneeId: rule.assigneeId,
            status: "backlog",
            orderIndex: (maxRow?.max ?? 0) + 1,
          })
          created = true
        }

        const nextRunAt = computeNextRun(new Date(rule.nextRunAt), frequency, now)
        await db
          .update(recurringTasks)
          .set({ lastRunAt: now, nextRunAt, updatedAt: now })
          .where(eq(recurringTasks.id, rule.id))

        return created
      })
      if (ok) generated++
    }

    return { generated, due: due.length }
  }
)
