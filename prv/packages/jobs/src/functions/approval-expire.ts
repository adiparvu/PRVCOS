import { inngest } from "../client"

// Approval deadline auto-expiry — triggered when an approval is created.
// Sleeps until the deadline, then marks the approval as expired if still pending.
export const approvalExpireFunction = inngest.createFunction(
  {
    id: "prv-approval-expire",
    name: "Approval Deadline Auto-Expire",
    retries: 3,
    concurrency: { limit: 100 },
  },
  { event: "prv/approval.deadline" },
  async ({ event, step }) => {
    const { approvalId, deadline } = event.data

    await step.sleepUntil("wait-for-deadline", deadline)

    const expired = await step.run("expire-if-pending", async () => {
      const { markExpiredApprovals } = await import("@prv/approval-engine")

      // The engine's markExpiredApprovals sweeps all past-deadline records.
      // Passing no companyId sweeps globally — safe because the deadline check
      // is timestamp-based and only touches pending/urgent records.
      const count = await markExpiredApprovals()
      return { count, approvalId }
    })

    return expired
  }
)
