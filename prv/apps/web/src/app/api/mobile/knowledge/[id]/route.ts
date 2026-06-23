import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { knowledgeArticles, articleReadProgress, users } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"

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
  const id = req.nextUrl.pathname.split("/").pop()
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const { companyId, userId } = ctx

  const [articleRows, progressRows, relatedRows] = await Promise.all([
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
        content: knowledgeArticles.content,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
      })
      .from(knowledgeArticles)
      .leftJoin(users, eq(knowledgeArticles.authorUserId, users.id))
      .where(
        and(
          eq(knowledgeArticles.id, id),
          eq(knowledgeArticles.companyId, companyId),
          isNull(knowledgeArticles.deletedAt)
        )
      )
      .limit(1),

    db
      .select({ progressPct: articleReadProgress.progressPct })
      .from(articleReadProgress)
      .where(and(eq(articleReadProgress.articleId, id), eq(articleReadProgress.userId, userId)))
      .limit(1),

    db
      .select({
        id: knowledgeArticles.id,
        title: knowledgeArticles.title,
        type: knowledgeArticles.type,
        category: knowledgeArticles.category,
        readMinutes: knowledgeArticles.readMinutes,
      })
      .from(knowledgeArticles)
      .where(and(eq(knowledgeArticles.companyId, companyId), isNull(knowledgeArticles.deletedAt)))
      .limit(5),
  ])

  const row = articleRows[0]
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    id: row.id,
    title: row.title,
    type: row.type as ArticleType,
    typeLabel: TYPE_LABELS[row.type as ArticleType] ?? row.type,
    category: row.category as ArticleCategory,
    categoryLabel: CATEGORY_LABELS[row.category as ArticleCategory] ?? row.category,
    author: row.authorFirstName ? `${row.authorFirstName} ${row.authorLastName ?? ""}`.trim() : "—",
    updatedDate: fmtDate(row.updatedAt),
    readMinutes: row.readMinutes ?? 5,
    views: row.views,
    version: row.version ?? null,
    isPinned: row.isPinned,
    readProgress: progressRows[0]?.progressPct ?? 0,
    content: row.content ?? null,
    relatedArticles: relatedRows
      .filter((r) => r.id !== id)
      .slice(0, 4)
      .map((r) => ({
        id: r.id,
        title: r.title,
        typeLabel: TYPE_LABELS[r.type as ArticleType] ?? r.type,
        categoryLabel: CATEGORY_LABELS[r.category as ArticleCategory] ?? r.category,
        readMinutes: r.readMinutes ?? 5,
      })),
  })
})
