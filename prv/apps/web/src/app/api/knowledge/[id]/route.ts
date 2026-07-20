import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { knowledgeArticles, articleReadProgress, articleFeedback, users } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import type { ArticleType, ArticleCategory } from "../route"
import { summarizeArticleFeedback, type ArticleFeedbackRating } from "@/lib/article-feedback"

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
  feedback: {
    helpful: number
    notHelpful: number
    helpfulPct: number | null
    yourRating: ArticleFeedbackRating | null
  }
  checklist: ChecklistItem[] | null
  toc: TocSection[]
  related: RelatedArticle[]
}

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

export const GET = withGates(
  { action: "knowledge.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId } = ctx.session

    const [articleRows, progressRows, feedbackRows] = await Promise.all([
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

      db
        .select({ userId: articleFeedback.userId, rating: articleFeedback.rating })
        .from(articleFeedback)
        .where(eq(articleFeedback.articleId, id)),
    ])

    const row = articleRows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const readProgress = progressRows[0]?.progressPct ?? 0
    const authorName = row.authorFirstName ? `${row.authorFirstName} ${row.authorLastName}` : "—"

    const fbSummary = summarizeArticleFeedback(
      feedbackRows.map((f) => f.rating as ArticleFeedbackRating)
    )
    const yourRating =
      (feedbackRows.find((f) => f.userId === userId)?.rating as
        | ArticleFeedbackRating
        | undefined) ?? null

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
      feedback: {
        helpful: fbSummary.helpful,
        notHelpful: fbSummary.notHelpful,
        helpfulPct: fbSummary.helpfulPct,
        yourRating,
      },
      checklist: null,
      toc: [],
      related: [],
    }

    return NextResponse.json(detail)
  }
)

// ─── PATCH /api/knowledge/[id] ────────────────────────────────────────────────

const patchSchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    type: z.enum(["sop", "policy", "guide", "faq"]).optional(),
    category: z
      .enum(["operations", "hr", "finance", "procurement", "fleet", "projects"])
      .optional(),
    isPinned: z.boolean().optional(),
    readMinutes: z.number().int().min(1).max(300).optional(),
  })
  .refine(
    (d) =>
      d.title !== undefined ||
      d.type !== undefined ||
      d.category !== undefined ||
      d.isPinned !== undefined ||
      d.readMinutes !== undefined,
    { message: "At least one field required" }
  )

export const PATCH = withGates(
  { action: "knowledge.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [existing] = await db
      .select({ id: knowledgeArticles.id, title: knowledgeArticles.title })
      .from(knowledgeArticles)
      .where(
        and(
          eq(knowledgeArticles.id, id),
          eq(knowledgeArticles.companyId, companyId),
          isNull(knowledgeArticles.deletedAt)
        )
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const d = parsed.data
    const [updated] = await db
      .update(knowledgeArticles)
      .set({
        ...(d.title !== undefined && { title: d.title }),
        ...(d.type !== undefined && { type: d.type }),
        ...(d.category !== undefined && { category: d.category }),
        ...(d.isPinned !== undefined && { isPinned: d.isPinned }),
        ...(d.readMinutes !== undefined && { readMinutes: d.readMinutes }),
        updatedAt: new Date(),
      })
      .where(and(eq(knowledgeArticles.id, id), eq(knowledgeArticles.companyId, companyId)))
      .returning({ id: knowledgeArticles.id, isPinned: knowledgeArticles.isPinned })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "knowledge.update",
      entityType: "knowledge_article",
      entityId: id,
      payload: { title: existing.title, changes: d },
      method: "PATCH",
      path: `/api/knowledge/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ─── DELETE /api/knowledge/[id] ───────────────────────────────────────────────

export const DELETE = withGates(
  { action: "knowledge.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [existing] = await db
      .select({ id: knowledgeArticles.id, title: knowledgeArticles.title })
      .from(knowledgeArticles)
      .where(
        and(
          eq(knowledgeArticles.id, id),
          eq(knowledgeArticles.companyId, companyId),
          isNull(knowledgeArticles.deletedAt)
        )
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .update(knowledgeArticles)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(knowledgeArticles.id, id), eq(knowledgeArticles.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "knowledge.delete",
      entityType: "knowledge_article",
      entityId: id,
      payload: { title: existing.title },
      method: "DELETE",
      path: `/api/knowledge/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
