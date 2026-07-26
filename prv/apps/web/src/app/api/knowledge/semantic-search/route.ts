import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { knowledgeArticles } from "@prv/db/schema"
import { inArray } from "drizzle-orm"
import { embedQuery, isEmbeddingConfigured } from "@prv/ai-engine"
import { searchChunks } from "@/lib/rag"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Semantic search over the company's knowledge base (AI platform, area #11).
// POST because the query rides in the body and each call spends an embedding
// API call — the "ai" endpoint class carries the strictest authed limit.
const bodySchema = z.object({
  query: z.string().min(2).max(500),
  limit: z.number().int().min(1).max(10).default(5),
})

export const POST = withGates(
  { action: "knowledge.semantic_search", endpointClass: "ai" },
  async (req: NextRequest, ctx: GateContext) => {
    const raw = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    if (!isEmbeddingConfigured()) {
      // Deliberate 200: an unprovisioned optional feature is an empty result,
      // not a server error the UI has to special-case.
      return NextResponse.json({ results: [], reason: "not_configured" })
    }

    const { query, limit } = parsed.data
    const embedding = await embedQuery(query)
    const chunks = await searchChunks(ctx.session.companyId, embedding, {
      k: limit,
      sourceType: "knowledge_article",
    })

    if (chunks.length === 0) return NextResponse.json({ results: [] })

    const articleIds = [...new Set(chunks.map((c) => c.sourceId))]
    const articles = await db
      .select({ id: knowledgeArticles.id, title: knowledgeArticles.title })
      .from(knowledgeArticles)
      .where(inArray(knowledgeArticles.id, articleIds))
    const titleById = new Map(articles.map((a) => [a.id, a.title]))

    return NextResponse.json({
      results: chunks.map((c) => ({
        articleId: c.sourceId,
        articleTitle: titleById.get(c.sourceId) ?? null,
        chunkIndex: c.chunkIndex,
        excerpt: c.content.slice(0, 500),
        similarity: Math.round(c.similarity * 1000) / 1000,
      })),
    })
  }
)
