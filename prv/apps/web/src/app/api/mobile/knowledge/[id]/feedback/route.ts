import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { knowledgeArticles, articleFeedback } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { writeAuditLog } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function articleId(req: NextRequest): string {
  const parts = req.nextUrl.pathname.split("/")
  const idx = parts.indexOf("feedback")
  return idx > 0 ? (parts[idx - 1] ?? "") : ""
}

const bodySchema = z.object({
  rating: z.enum(["helpful", "not_helpful"]),
  suggestion: z.string().max(2000).nullable().optional(),
})

// POST /api/mobile/knowledge/[id]/feedback — helpful / not-helpful vote.
export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const id = articleId(req)
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 422 }
    )
  }

  const [article] = await db
    .select({ id: knowledgeArticles.id })
    .from(knowledgeArticles)
    .where(
      and(
        eq(knowledgeArticles.id, id),
        eq(knowledgeArticles.companyId, ctx.companyId),
        isNull(knowledgeArticles.deletedAt)
      )
    )
    .limit(1)
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await db
    .insert(articleFeedback)
    .values({
      articleId: id,
      userId: ctx.userId,
      companyId: ctx.companyId,
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
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.knowledge.feedback",
    entityType: "knowledge_article",
    entityId: id,
    method: "POST",
    path: req.nextUrl.pathname,
    ipAddress:
      req.headers.get("x-real-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown",
    userAgent: req.headers.get("user-agent") ?? "",
    payload: { rating: parsed.data.rating },
  })

  return NextResponse.json({ articleId: id, rating: parsed.data.rating }, { status: 201 })
})
