import { inngest } from "../client"

// Knowledge-base embeddings (AI platform, audit area #11).
//
// Two triggers, one function:
//  - event `knowledge/article.upserted` — fired by every article create/update
//    (web and mobile), so search freshness tracks writes.
//  - nightly sweep — re-embeds articles whose embeddings are missing or older
//    than the article's last update. This is the backfill for the existing
//    corpus and the safety net for any missed event.
//
// Without OPENAI_API_KEY the run is a recorded no-op — never an error — so
// the cron stays green on environments where the feature isn't provisioned.
export const knowledgeEmbedFunction = inngest.createFunction(
  {
    id: "prv-knowledge-embed",
    name: "Knowledge Embeddings — event + nightly sweep",
    retries: 2,
    concurrency: { limit: 2 },
  },
  [{ event: "knowledge/article.upserted" }, { cron: "10 3 * * *" }], // 03:10 UTC daily
  async ({ event, step }) => {
    const configured = await step.run("check-configured", async () => {
      const { isEmbeddingConfigured } = await import("@prv/ai-engine")
      return isEmbeddingConfigured()
    })
    if (!configured) return { skipped: "not_configured" }

    const targets = await step.run("resolve-targets", async () => {
      const { db } = await import("@prv/db")
      const { knowledgeArticles, documentEmbeddings } = await import("@prv/db/schema")
      const { and, eq, isNull, isNotNull, lt, or, sql } = await import("drizzle-orm")

      const eventData = event?.data as { companyId?: string; articleId?: string } | undefined
      if (eventData?.articleId && eventData?.companyId) {
        return db
          .select({
            id: knowledgeArticles.id,
            companyId: knowledgeArticles.companyId,
            title: knowledgeArticles.title,
            content: knowledgeArticles.content,
          })
          .from(knowledgeArticles)
          .where(
            and(
              eq(knowledgeArticles.id, eventData.articleId),
              eq(knowledgeArticles.companyId, eventData.companyId),
              isNull(knowledgeArticles.deletedAt)
            )
          )
          .limit(1)
      }

      // Sweep: articles with content whose newest embedding is absent or
      // predates the article's last update. Bounded per run; the nightly
      // cadence drains any backlog across runs.
      const latest = db
        .select({
          sourceId: documentEmbeddings.sourceId,
          maxUpdated: sql<Date>`max(${documentEmbeddings.updatedAt})`.as("max_updated"),
        })
        .from(documentEmbeddings)
        .where(eq(documentEmbeddings.sourceType, "knowledge_article"))
        .groupBy(documentEmbeddings.sourceId)
        .as("latest")

      return db
        .select({
          id: knowledgeArticles.id,
          companyId: knowledgeArticles.companyId,
          title: knowledgeArticles.title,
          content: knowledgeArticles.content,
        })
        .from(knowledgeArticles)
        .leftJoin(latest, eq(latest.sourceId, knowledgeArticles.id))
        .where(
          and(
            isNull(knowledgeArticles.deletedAt),
            isNotNull(knowledgeArticles.content),
            or(isNull(latest.maxUpdated), lt(latest.maxUpdated, knowledgeArticles.updatedAt))
          )
        )
        .limit(25)
    })

    let embedded = 0
    let chunksWritten = 0
    for (const article of targets) {
      const text = [article.title, article.content ?? ""].filter(Boolean).join("\n\n")
      if (!text.trim()) continue
      const written = await step.run(`embed-${article.id}`, async () => {
        const { db } = await import("@prv/db")
        const { documentEmbeddings } = await import("@prv/db/schema")
        const { and, eq } = await import("drizzle-orm")
        const { chunkText, embedTexts } = await import("@prv/ai-engine")

        const chunks = chunkText(text)
        const vectors = chunks.length > 0 ? await embedTexts(chunks.map((c) => c.content)) : []

        await db
          .delete(documentEmbeddings)
          .where(
            and(
              eq(documentEmbeddings.companyId, article.companyId),
              eq(documentEmbeddings.sourceType, "knowledge_article"),
              eq(documentEmbeddings.sourceId, article.id)
            )
          )
        if (chunks.length === 0) return 0
        await db.insert(documentEmbeddings).values(
          chunks.map((chunk, i) => ({
            companyId: article.companyId,
            sourceType: "knowledge_article" as const,
            sourceId: article.id,
            chunkIndex: chunk.index,
            content: chunk.content,
            embedding: vectors[i]!,
          }))
        )
        return chunks.length
      })
      embedded++
      chunksWritten += written
    }

    return { articles: embedded, chunks: chunksWritten }
  }
)
