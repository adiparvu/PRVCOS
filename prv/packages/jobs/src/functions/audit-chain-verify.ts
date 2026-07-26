import { inngest } from "../client"

// Audit chain verification — daily (audit R5).
//
// The audit log's tamper-evidence is a per-company SHA-256 hash chain, but a
// chain nobody re-derives detects nothing: an attacker (or a bug) could edit
// or delete rows and the break would sit unnoticed forever. This cron closes
// the loop:
//
//  1. For every company, re-derive the chain over the most recent window and
//     compare with the stored hashes (verifyAuditChain in @prv/auth). A break
//     raises a CRITICAL audit_chain_broken security event carrying the first
//     broken sequence number — the investigation starting point.
//  2. Drain the Redis audit-write-failure counter (incremented by
//     writeAuditLog on any failed insert — a different store than Postgres,
//     so an audit-table outage still leaves a trace). Non-zero raises a HIGH
//     audit_write_failure event: the log has silent holes for that period.
//
// The verification window (500) bounds daily cost; a tamper older than the
// window is caught by the run that was current when it happened.
export const auditChainVerifyFunction = inngest.createFunction(
  {
    id: "prv-audit-chain-verify",
    name: "Audit Chain Verification — Daily",
    retries: 2,
    concurrency: { limit: 1 },
  },
  { cron: "40 2 * * *" }, // 02:40 UTC daily
  async ({ step }) => {
    const companies = await step.run("list-companies", async () => {
      const { db } = await import("@prv/db")
      const { companies: companiesTable } = await import("@prv/db/schema")
      return db.select({ id: companiesTable.id, name: companiesTable.name }).from(companiesTable)
    })

    let broken = 0
    let checkedTotal = 0
    for (const company of companies) {
      const result = await step.run(`verify-${company.id}`, async () => {
        const { verifyAuditChain } = await import("@prv/auth")
        return verifyAuditChain(company.id)
      })
      checkedTotal += result.checked

      if (!result.valid) {
        broken++
        await step.run(`alert-${company.id}`, async () => {
          const { logSecurityEvent } = await import("@prv/auth")
          await logSecurityEvent({
            companyId: company.id,
            eventType: "audit_chain_broken",
            severity: "critical",
            metadata: {
              brokenAtSequence: result.brokenAtSequence,
              reason: result.reason,
              windowChecked: result.checked,
            },
          })
        })
      }
    }

    const writeFailures = await step.run("drain-write-failure-counter", async () => {
      const { getRedis } = await import("@prv/cache")
      const { AUDIT_WRITE_FAILURE_KEY } = await import("@prv/auth")
      const redis = getRedis()
      const count = Number((await redis.get(AUDIT_WRITE_FAILURE_KEY)) ?? 0)
      if (count > 0) await redis.del(AUDIT_WRITE_FAILURE_KEY)
      return count
    })

    if (writeFailures > 0) {
      await step.run("alert-write-failures", async () => {
        const { logSecurityEvent } = await import("@prv/auth")
        await logSecurityEvent({
          eventType: "audit_write_failure",
          severity: "high",
          metadata: { failedWrites: writeFailures, window: "since last run" },
        })
      })
    }

    return {
      companies: companies.length,
      entriesChecked: checkedTotal,
      chainsBroken: broken,
      writeFailures,
    }
  }
)
