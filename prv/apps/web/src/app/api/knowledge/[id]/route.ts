import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { knowledgeArticles, articleReadProgress, users } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import type { ArticleType, ArticleCategory } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface ChecklistItem {
  id: string
  label: string
  checked: boolean
}

export interface TocSection {
  id: string
  index: number
  title: string
}

export interface RelatedArticle {
  id: string
  title: string
  type: ArticleType
  typeLabel: string
  category: ArticleCategory
  categoryLabel: string
  readMinutes: number
}

export interface KnowledgeArticleDetail {
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
  checklist: ChecklistItem[] | null
  toc: TocSection[]
  related: RelatedArticle[]
}

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

export const GET = withGates(
  { action: "knowledge.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId } = ctx.session

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
    ])

    const row = articleRows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const readProgress = progressRows[0]?.progressPct ?? 0
    const authorName = row.authorFirstName ? `${row.authorFirstName} ${row.authorLastName}` : "—"

    const detail: KnowledgeArticleDetail = {
      id: row.id,
      title: row.title,
      type: row.type as ArticleType,
      typeLabel: TYPE_LABELS[row.type as ArticleType] ?? row.type,
      category: row.category as ArticleCategory,
      categoryLabel: CATEGORY_LABELS[row.category as ArticleCategory] ?? row.category,
      author: authorName,
      updatedDate: fmtDate(row.updatedAt),
      readMinutes: row.readMinutes ?? 5,
      views: row.views,
      version: row.version ?? null,
      isPinned: row.isPinned,
      readProgress,
      checklist: null,
      toc: [],
      related: [],
    }

    return NextResponse.json(detail)
  }
)
