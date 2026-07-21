import { inngest } from "../client"

// Phase 6.2 — Project task overdue reminder.
//
// Daily sweep: any open project task (not done / cancelled) whose due date has
// passed is nudged to its assignee. Unlike a slipped renovation milestone —
// which had no natural recipient and needed admin-declared routing — a project
// task carries a direct assigneeId, so the recipient is unambiguous and needs
// no routing decision.
//
// Each overdue task is claimed once via overdueNotifiedAt (claim-on-null), so
// the assignee is nudged exactly once. The task PATCH route clears the stamp on
// a due-date change, so a rescheduled task that lapses again is nudged again;
// reaching a terminal status removes it from the candidate set. Idempotent.
export const projectTaskOverdueFunction = inngest.createFunction(
  {
    id: "prv-project-task-overdue",
    name: "Project Task Overdue Reminder — Daily",
    retries: 2,
    concurrency: { limit: 1 },
  },
  { cron: "5 2 * * *" }, // 02:05 UTC daily
  async ({ step }) => {
    // Step 1: find open, un-nudged tasks past their due date with an assignee.
    const candidates = await step.run("find-overdue-tasks", async () => {
      const { db } = await import("@prv/db")
      const { projectTasks } = await import("@prv/db/schema")
      const { and, lt, isNull, isNotNull, notInArray } = await import("drizzle-orm")

      // dueDate is a DATE column; a task is overdue only once the day AFTER its
      // due date begins.
      const today = new Date().toISOString().slice(0, 10)

      return db
        .select({
          id: projectTasks.id,
          companyId: projectTasks.companyId,
          projectId: projectTasks.projectId,
          assigneeId: projectTasks.assigneeId,
          title: projectTasks.title,
          dueDate: projectTasks.dueDate,
        })
        .from(projectTasks)
        .where(
          and(
            notInArray(projectTasks.status, ["done", "cancelled"]),
            isNull(projectTasks.overdueNotifiedAt),
            isNotNull(projectTasks.assigneeId),
            isNotNull(projectTasks.dueDate),
            lt(projectTasks.dueDate, today)
          )
        )
        .limit(500)
    })

    if (candidates.length === 0) return { overdue: 0, claimed: 0, notified: 0 }

    // Step 2: claim (stamp overdueNotifiedAt on still-null rows) so the nudge
    // fires at most once, even if a retry re-runs.
    const claimedIds = await step.run("claim-tasks", async () => {
      const { db } = await import("@prv/db")
      const { projectTasks } = await import("@prv/db/schema")
      const { and, isNull, inArray } = await import("drizzle-orm")
      const now = new Date()

      const claimed = await db
        .update(projectTasks)
        .set({ overdueNotifiedAt: now, updatedAt: now })
        .where(
          and(
            inArray(
              projectTasks.id,
              candidates.map((c) => c.id)
            ),
            isNull(projectTasks.overdueNotifiedAt)
          )
        )
        .returning({ id: projectTasks.id })

      return claimed.map((r) => r.id)
    })

    if (claimedIds.length === 0) return { overdue: candidates.length, claimed: 0, notified: 0 }
    const claimedSet = new Set(claimedIds)
    const claimed = candidates.filter((c) => claimedSet.has(c.id))

    // Step 3: one nudge per claimed task, addressed to the assignee.
    const notified = await step.run("notify-assignees", async () => {
      const { db } = await import("@prv/db")
      const { notifications } = await import("@prv/db/schema")
      const now = new Date()

      const rows = claimed.map((c) => ({
        userId: c.assigneeId as string,
        companyId: c.companyId,
        type: "warning" as const,
        channel: "in_app" as const,
        title: `Sarcină restantă: ${c.title}`.slice(0, 500),
        body: `Sarcina „${c.title}" a depășit termenul (${String(c.dueDate).slice(0, 10)}).`,
        entityType: "project_task",
        entityId: c.id,
        actionUrl: `/projects/${c.projectId}/tasks`,
        deliveredAt: now,
      }))

      for (let i = 0; i < rows.length; i += 500) {
        await db.insert(notifications).values(rows.slice(i, i + 500))
      }
      return rows.length
    })

    return { overdue: candidates.length, claimed: claimed.length, notified }
  }
)
