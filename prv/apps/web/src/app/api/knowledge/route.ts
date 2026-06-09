import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { knowledgeArticles, articleReadProgress, users } from "@prv/db/schema"
import { and, desc, eq, gte, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

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
        .where(and(eq(knowledgeArticles.companyId, companyId), isNull(knowledgeArticles.deletedAt)))
        .orderBy(desc(knowledgeArticles.isPinned), desc(knowledgeArticles.updatedAt)),

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

    // 2. Index progress by articleId
    const progressByArticle = new Map<string, number>()
    for (const p of progressRows) {
      progressByArticle.set(p.articleId, p.progressPct)
    }

    // 3. Assemble + filter
    let result: KnowledgeArticle[] = articleRows.map((r) => {
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
      total: articleRows.length,
      sopCount: articleRows.filter((a) => a.type === "sop").length,
      recentlyUpdated: articleRows.filter((a) => a.updatedAt >= thirtyDaysAgo).length,
    }

    return NextResponse.json({ articles: result, count: result.length, meta })
  }
)
