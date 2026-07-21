import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { knowledgeArticles, articleReadProgress } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { writeAuditLog } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function articleId(req: NextRequest): string {
  const parts = req.nextUrl.pathname.split("/")
  const idx = parts.indexOf("progress")
  return idx > 0 ? (parts[idx - 1] ?? "") : ""
}

const progressSchema = z.object({
  progressPct: z.number().int().min(0).max(100),
})

// POST /api/mobile/knowledge/[id]/progress — record/advance read progress.
export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const id = articleId(req)
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = progressSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 422 }
    )
  }

  // Company + soft-delete scope comes from the parent article (the progress
  // table itself is not company-scoped on write).
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

  const now = new Date()
  const [row] = await db
    .insert(articleReadProgress)
    .values({
      articleId: id,
      userId: ctx.userId,
      companyId: ctx.companyId,
      progressPct: parsed.data.progressPct,
      lastReadAt: now,
    })
    .onConflictDoUpdate({
      target: [articleReadProgress.articleId, articleReadProgress.userId],
      set: { progressPct: parsed.data.progressPct, lastReadAt: now },
    })
    .returning({
      progressPct: articleReadProgress.progressPct,
      lastReadAt: articleReadProgress.lastReadAt,
    })

  // Audit only the completion milestone (mirrors web).
  if (parsed.data.progressPct === 100) {
    void writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      sessionId: ctx.sessionId,
      action: "mobile.knowledge.read",
      entityType: "knowledge_article",
      entityId: id,
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress:
        req.headers.get("x-real-ip") ??
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "unknown",
      userAgent: req.headers.get("user-agent") ?? "",
      payload: { progressPct: 100, milestone: "completed" },
    })
  }

  return NextResponse.json(row ?? { progressPct: parsed.data.progressPct })
})
