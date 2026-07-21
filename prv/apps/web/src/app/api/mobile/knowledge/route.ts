import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { knowledgeArticles, articleReadProgress, users } from "@prv/db/schema"
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm"
import { z } from "zod"
import { writeAuditLog } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type ArticleType = "sop" | "policy" | "guide" | "faq"
type ArticleCategory = "operations" | "hr" | "finance" | "procurement" | "fleet" | "projects"

const TYPE_LABELS: Record<ArticleType, string> = {
  sop: "SOP",
  policy: "Policy",
  guide: "Guide",
  faq: "FAQ",
}

const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  operations: "Operations",
  hr: "HR",
  finance: "Finance",
  procurement: "Procurement",
  fleet: "Fleet",
  projects: "Projects",
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

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const sp = req.nextUrl.searchParams
  const typeFilter = sp.get("type") as ArticleType | null
  const categoryFilter = sp.get("category") as ArticleCategory | null
  const { companyId, userId } = ctx

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000)

  const [rows, progressRows] = await Promise.all([
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
      .where(and(eq(knowledgeArticles.companyId, companyId), isNull(knowledgeArticles.deletedAt)))
      .orderBy(desc(knowledgeArticles.isPinned), desc(knowledgeArticles.updatedAt))
      .limit(50),

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

  const progressMap = new Map(progressRows.map((p) => [p.articleId, p.progressPct]))

  let articles = rows.map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type as ArticleType,
    typeLabel: TYPE_LABELS[r.type as ArticleType] ?? r.type,
    category: r.category as ArticleCategory,
    categoryLabel: CATEGORY_LABELS[r.category as ArticleCategory] ?? r.category,
    author: r.authorFirstName ? `${r.authorFirstName} ${r.authorLastName ?? ""}`.trim() : "—",
    updatedDate: fmtDate(r.updatedAt),
    readMinutes: r.readMinutes ?? 5,
    views: r.views,
    version: r.version ?? null,
    isPinned: r.isPinned,
    readProgress: progressMap.get(r.id) ?? 0,
  }))

  if (typeFilter) articles = articles.filter((a) => a.type === typeFilter)
  if (categoryFilter) articles = articles.filter((a) => a.category === categoryFilter)

  const meta = {
    total: rows.length,
    sopCount: rows.filter((r) => r.type === "sop").length,
    recentlyUpdated: rows.filter((r) => r.updatedAt >= thirtyDaysAgo).length,
  }

  return NextResponse.json({ meta, articles })
})

// ─── POST /api/mobile/knowledge — create an article ──────────────────────────

const createArticleSchema = z.object({
  title: z.string().min(1).max(500),
  type: z.enum(["sop", "policy", "guide", "faq"]).optional(),
  category: z.enum(["operations", "hr", "finance", "procurement", "fleet", "projects"]).optional(),
  content: z.string().optional(),
  readMinutes: z.number().int().positive().optional(),
  isPinned: z.boolean().optional(),
})

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const ipAddress =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = createArticleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 422 }
    )
  }

  const [record] = await db
    .insert(knowledgeArticles)
    .values({ companyId: ctx.companyId, authorUserId: ctx.userId, ...parsed.data })
    .returning({ id: knowledgeArticles.id, title: knowledgeArticles.title })

  if (!record) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.knowledge.create",
    entityType: "knowledge_article",
    entityId: record.id,
    method: "POST",
    path: "/api/mobile/knowledge",
    ipAddress,
    userAgent: req.headers.get("user-agent") ?? "",
    payload: { ...parsed.data },
  })

  return NextResponse.json({ id: record.id, title: record.title }, { status: 201 })
})
