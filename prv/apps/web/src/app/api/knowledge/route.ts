import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { knowledgeArticles, articleReadProgress, users } from "@prv/db/schema"
import { and, desc, eq, gt, gte, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const LIMIT = 50

export type ArticleType = "sop" | "policy" | "guide" | "faq"
export type ArticleCategory = "operations" | "hr" | "finance" | "procurement" | "fleet" | "projects"

export interface KnowledgeArticle {
  id: string
  title: string
  type: ArticleType
  typeLabel: string
  category: ArticleCategory
  categoryLabel: string
  author: string
  updatedDate: string
  readMinutes: number
  views: number
  version: string | null
  isPinned: boolean
  readProgress: number
}

export interface KnowledgeMeta {
  total: number
  sopCount: number
  recentlyUpdated: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<ArticleType, string> = {
  sop: "SOP",
  policy: "Politică",
  guide: "Ghid",
  faq: "FAQ",
}

const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  operations: "Operațiuni",
  hr: "HR",
  finance: "Finanțe",
  procurement: "Procurare",
  fleet: "Flotă",
  projects: "Proiecte",
}

const MONTH_LABELS = [
  "Ian",
  "Feb",
  "Mar",
  "Apr",
  "Mai",
  "Iun",
  "Iul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

function fmtDate(d: Date): string {
  return `${d.getDate()} ${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`
}

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "knowledge.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = req.nextUrl
    const typeFilter = searchParams.get("type") as ArticleType | null
    const categoryFilter = searchParams.get("category") as ArticleCategory | null
    const cursor = searchParams.get("cursor")
    const { companyId, userId } = ctx.session

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // 1. Fetch articles + per-user read progress in parallel
    const [articleRows, progressRows] = await Promise.all([
      db
        .select({
          id: knowledgeArticles.id,
          title: knowledgeArticles.title,
          type: knowledgeArticles.type,
          category: knowledgeArticles.category,
          version: knowledgeArticles.version,
          isPinned: knowledgeArticles.isPinned,
          readMinutes: knowledgeArticles.readMinutes,
          views: knowledgeArticles.views,
          updatedAt: knowledgeArticles.updatedAt,
          authorFirstName: users.firstName,
          authorLastName: users.lastName,
        })
        .from(knowledgeArticles)
        .leftJoin(users, eq(knowledgeArticles.authorUserId, users.id))
        .where(and(eq(knowledgeArticles.companyId, companyId), isNull(knowledgeArticles.deletedAt), cursor ? gt(knowledgeArticles.id, cursor) : undefined))
        .orderBy(desc(knowledgeArticles.isPinned), desc(knowledgeArticles.updatedAt))
        .limit(LIMIT + 1),

      db
        .select({
          articleId: articleReadProgress.articleId,
          progressPct: articleReadProgress.progressPct,
        })
        .from(articleReadProgress)
        .where(
          and(eq(articleReadProgress.companyId, companyId), eq(articleReadProgress.userId, userId))
        ),
    ])

    const hasMore = articleRows.length > LIMIT
    const pageRows = hasMore ? articleRows.slice(0, LIMIT) : articleRows
    const nextCursor = hasMore ? (pageRows[pageRows.length - 1]?.id ?? null) : null

    // 2. Index progress by articleId
    const progressByArticle = new Map<string, number>()
    for (const p of progressRows) {
      progressByArticle.set(p.articleId, p.progressPct)
    }

    // 3. Assemble + filter
    let result: KnowledgeArticle[] = pageRows.map((r) => {
      const type = r.type as ArticleType
      const category = r.category as ArticleCategory
      return {
        id: r.id,
        title: r.title,
        type,
        typeLabel: TYPE_LABELS[type],
        category,
        categoryLabel: CATEGORY_LABELS[category],
        author:
          r.authorFirstName && r.authorLastName ? `${r.authorFirstName} ${r.authorLastName}` : "—",
        updatedDate: fmtDate(r.updatedAt),
        readMinutes: r.readMinutes ?? 0,
        views: r.views,
        version: r.version ?? null,
        isPinned: r.isPinned,
        readProgress: progressByArticle.get(r.id) ?? 0,
      }
    })

    if (typeFilter) result = result.filter((a) => a.type === typeFilter)
    if (categoryFilter) result = result.filter((a) => a.category === categoryFilter)

    const meta: KnowledgeMeta = {
      total: pageRows.length,
      sopCount: pageRows.filter((a) => a.type === "sop").length,
      recentlyUpdated: pageRows.filter((a) => a.updatedAt >= thirtyDaysAgo).length,
    }

    return NextResponse.json({ articles: result, count: result.length, meta, nextCursor })
  }
)

// ─── POST /api/knowledge ──────────────────────────────────────────────────────

const createArticleSchema = z.object({
  title: z.string().min(1).max(500),
  type: z.enum(["sop", "policy", "guide", "faq"]).optional(),
  category: z.enum(["operations", "hr", "finance", "procurement", "fleet", "projects"]).optional(),
  content: z.string().optional(),
  readMinutes: z.number().int().positive().optional(),
  isPinned: z.boolean().optional(),
})

export const POST = withGates(
  { action: "knowledge.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createArticleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 422 })
    }

    const [record] = await db
      .insert(knowledgeArticles)
      .values({ companyId, authorUserId: userId, ...parsed.data })
      .returning({ id: knowledgeArticles.id, title: knowledgeArticles.title })

    if (!record) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "knowledge.create",
      entityType: "article",
      entityId: record.id,
      payload: parsed.data,
      method: "POST",
      path: "/api/knowledge",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record.id, title: record.title }, { status: 201 })
  }
)
