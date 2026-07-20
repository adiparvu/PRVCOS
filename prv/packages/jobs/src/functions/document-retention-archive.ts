import { inngest } from "../client"

// Phase 12.5 — Document retention auto-archive.
// Daily sweep: documents whose type has an explicit company retention policy with
// autoArchive ON, and whose effective expiry has passed, are flipped to
// status='archived'. Legal hold and already-archived docs are never touched.
//
// Conservative by design: auto-archive fires ONLY when an admin has configured a
// retention policy (with autoArchive) for that document type. Companies that
// never set a policy keep their documents untouched — the statutory defaults are
// used for the dashboard's advisory bands, never for automated archival.
//
// Eligibility uses the shared, unit-tested isRetentionArchiveDue from @prv/db so
// the cron and the retention dashboard agree.
export const documentRetentionArchiveFunction = inngest.createFunction(
  {
    id: "prv-document-retention-archive",
    name: "Document Retention Auto-Archive — Daily",
    retries: 2,
    concurrency: { limit: 1 },
  },
  { cron: "30 2 * * *" }, // 02:30 UTC daily (off-peak)
  async ({ step }) => {
    return step.run("archive-expired-documents", async () => {
      const { db, isRetentionArchiveDue } = await import("@prv/db")
      const { documents, retentionPolicies } = await import("@prv/db/schema")
      const { and, eq, isNull, inArray, ne } = await import("drizzle-orm")
      const now = new Date()

      // 1. Policies with autoArchive on, keyed by `${companyId}:${type}` → months.
      const policies = await db
        .select({
          companyId: retentionPolicies.companyId,
          documentType: retentionPolicies.documentType,
          retentionMonths: retentionPolicies.retentionMonths,
        })
        .from(retentionPolicies)
        .where(eq(retentionPolicies.autoArchive, true))
        .limit(2000)

      if (policies.length === 0) return { archived: 0, policies: 0 }

      const monthsByKey = new Map<string, number>()
      const companyIds = new Set<string>()
      for (const p of policies) {
        monthsByKey.set(`${p.companyId}:${p.documentType}`, p.retentionMonths)
        companyIds.add(p.companyId)
      }

      // 2. Candidate documents in those companies: active (not deleted), not
      //    archived, not on legal hold. Effective-expiry is decided in JS.
      const candidates = await db
        .select({
          id: documents.id,
          companyId: documents.companyId,
          type: documents.type,
          createdAt: documents.createdAt,
          expiresAt: documents.expiresAt,
          status: documents.status,
          legalHold: documents.legalHold,
        })
        .from(documents)
        .where(
          and(
            inArray(documents.companyId, [...companyIds]),
            isNull(documents.deletedAt),
            ne(documents.status, "archived"),
            eq(documents.legalHold, false)
          )
        )
        .limit(10000)

      const dueIds: string[] = []
      for (const d of candidates) {
        const months = monthsByKey.get(`${d.companyId}:${d.type}`)
        if (months === undefined) continue // no autoArchive policy for this type
        if (
          isRetentionArchiveDue(
            {
              createdAt: d.createdAt,
              expiresAt: d.expiresAt,
              status: d.status,
              legalHold: d.legalHold,
            },
            months,
            now
          )
        ) {
          dueIds.push(d.id)
        }
      }

      if (dueIds.length === 0) return { archived: 0, policies: policies.length }

      // 3. Archive in bounded batches; each update re-checks the guards so a
      //    concurrent legal-hold or delete is never overridden.
      let archived = 0
      for (let i = 0; i < dueIds.length; i += 500) {
        const batch = dueIds.slice(i, i + 500)
        const updated = await db
          .update(documents)
          .set({ status: "archived", updatedAt: now })
          .where(
            and(
              inArray(documents.id, batch),
              isNull(documents.deletedAt),
              ne(documents.status, "archived"),
              eq(documents.legalHold, false)
            )
          )
          .returning({ id: documents.id })
        archived += updated.length
      }

      return { archived, policies: policies.length, candidates: candidates.length }
    })
  }
)
