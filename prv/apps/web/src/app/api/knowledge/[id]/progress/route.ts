import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { knowledgeArticles, articleReadProgress } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function articleId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}

async function verifyArticle(id: string, companyId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: knowledgeArticles.id })
    .from(knowledgeArticles)
    .where(
      and(
        eq(knowledgeArticles.id, id),
        eq(knowledgeArticles.companyId, companyId),
        isNull(knowledgeArticles.deletedAt)
      )
    )
    .limit(1)
  return Boolean(row)
}

// ─── GET /api/knowledge/[id]/progress ────────────────────────────────────────
// Returns the current user's read progress for this article.

export const GET = withGates(
  { action: "knowledge.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = articleId(req)
    const { companyId, userId } = ctx.session

    if (!(await verifyArticle(id, companyId)))
      return NextResponse.json({ error: "Article not found" }, { status: 404 })

    const [row] = await db
      .select({
        progressPct: articleReadProgress.progressPct,
        lastReadAt: articleReadProgress.lastReadAt,
      })
      .from(articleReadProgress)
      .where(
        and(eq(articleReadProgress.articleId, id), eq(articleReadProgress.userId, userId))
      )
      .limit(1)

    return NextResponse.json({
      progress: {
        progressPct: row?.progressPct ?? 0,
        lastReadAt: row?.lastReadAt?.toISOString() ?? null,
      },
    })
  }
)

// ─── PUT /api/knowledge/[id]/progress ────────────────────────────────────────
// Upserts the current user's read progress (self-tracking, idempotent).

const putSchema = z.object({
  progressPct: z.number().int().min(0).max(100),
})

export const PUT = withGates(
  { action: "knowledge.read", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = articleId(req)
    const { companyId, userId, sessionId } = ctx.session

    if (!(await verifyArticle(id, companyId)))
      return NextResponse.json({ error: "Article not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = putSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    const now = new Date()

    const [row] = await db
      .insert(articleReadProgress)
      .values({
        articleId: id,
        userId,
        companyId,
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

    // Only audit completion milestones to avoid log spam on every scroll tick.
    if (parsed.data.progressPct === 100) {
      void writeAuditLog({
        companyId,
        actorId: userId,
        sessionId,
        action: "knowledge.read",
        entityType: "knowledge_article",
        entityId: id,
        payload: { progressPct: 100, milestone: "completed" },
        method: "PUT",
        path: req.nextUrl.pathname,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      })
    }

    return NextResponse.json({
      progress: {
        progressPct: row?.progressPct ?? parsed.data.progressPct,
        lastReadAt: (row?.lastReadAt ?? now).toISOString(),
      },
    })
  }
)
