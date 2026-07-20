import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { knowledgeArticles, articleFeedback } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import {
  isArticleFeedbackRating,
  summarizeArticleFeedback,
  type ArticleFeedbackRating,
} from "@/lib/article-feedback"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// The article id is the path segment before "feedback".
function articleId(req: NextRequest): string {
  const parts = req.nextUrl.pathname.split("/")
  const i = parts.indexOf("feedback")
  return i > 0 ? (parts[i - 1] ?? "") : ""
}

async function verifyArticle(id: string, companyId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: knowledgeArticles.id })
    .from(knowledgeArticles)
    .where(and(eq(knowledgeArticles.id, id), eq(knowledgeArticles.companyId, companyId)))
    .limit(1)
  return !!row
}

async function summary(id: string, userId: string) {
  const rows = await db
    .select({ userId: articleFeedback.userId, rating: articleFeedback.rating })
    .from(articleFeedback)
    .where(eq(articleFeedback.articleId, id))

  const s = summarizeArticleFeedback(rows.map((r) => r.rating as ArticleFeedbackRating))
  const yourRating = rows.find((r) => r.userId === userId)?.rating ?? null
  return { ...s, yourRating }
}

// GET — helpful / not-helpful counts for an article plus the caller's own vote.
export const GET = withGates(
  { action: "knowledge.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = articleId(req)
    if (!(await verifyArticle(id, ctx.session.companyId)))
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    return NextResponse.json(await summary(id, ctx.session.userId))
  }
)

// POST — submit or change the caller's own helpfulness vote (self-service). One
// vote per user is enforced by the unique (article, user) constraint; re-voting
// updates it.
const bodySchema = z.object({
  rating: z.enum(["helpful", "not_helpful"]),
  suggestion: z.string().max(2000).nullable().optional(),
})

export const POST = withGates(
  { action: "knowledge.feedback", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, sessionId } = ctx.session
    const id = articleId(req)

    if (!(await verifyArticle(id, companyId)))
      return NextResponse.json({ error: "Article not found" }, { status: 404 })

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success || !isArticleFeedbackRating(parsed.data.rating))
      return NextResponse.json({ error: "Invalid payload" }, { status: 422 })

    await db
      .insert(articleFeedback)
      .values({
        articleId: id,
        userId,
        companyId,
        rating: parsed.data.rating,
        suggestion: parsed.data.suggestion ?? null,
      })
      .onConflictDoUpdate({
        target: [articleFeedback.articleId, articleFeedback.userId],
        set: {
          rating: parsed.data.rating,
          suggestion: parsed.data.suggestion ?? null,
          updatedAt: new Date(),
        },
      })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "knowledge.article.feedback",
      entityType: "knowledge_article",
      entityId: id,
      payload: { rating: parsed.data.rating },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(await summary(id, userId), { status: 201 })
  }
)
