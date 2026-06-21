import { inngest } from "../../client"

export const knowledgeExtractFunction = inngest.createFunction(
  {
    id: "prv-knowledge-extract",
    name: "Extract Knowledge from Documents",
    retries: 2,
    concurrency: { limit: 2 },
  },
  { cron: "0 2 * * *" },
  async ({ step }) => {
    const documents = await step.run("fetch-documents", async () => {
      const { db } = await import("@prv/db")
      const { documents: docsTable } = await import("@prv/db/schema")
      const { isNull, sql } = await import("drizzle-orm")
      return db
        .select({
          id: docsTable.id,
          companyId: docsTable.companyId,
          title: docsTable.title,
          content: sql<string>`coalesce(${docsTable.description}, '')`,
        })
        .from(docsTable)
        .where(isNull(docsTable.deletedAt))
        .limit(50)
    })

    if (documents.length === 0) return { processed: 0 }

    const processed = await step.run("embed-documents", async () => {
      const { upsertEmbedding } = await import("@prv/ai-engine")
      let count = 0
      for (const doc of documents) {
        if (!doc.content || doc.content.length < 10) continue
        const ok = await upsertEmbedding(
          doc.companyId,
          "document",
          doc.id,
          `${doc.title}\n\n${doc.content}`
        )
        if (ok) count++
      }
      return count
    })

    return { processed }
  }
)
