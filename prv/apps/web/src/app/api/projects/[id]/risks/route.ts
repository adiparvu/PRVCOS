import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { projects, projectRisks, users } from "@prv/db/schema"
import { and, eq, desc } from "drizzle-orm"
import { z } from "zod"
import { scoreRisk, type RiskBand } from "@/lib/risk"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const CATEGORIES = [
  "schedule",
  "cost",
  "quality",
  "safety",
  "resource",
  "external",
  "other",
] as const
const STATUSES = ["open", "mitigating", "monitoring", "closed", "accepted"] as const

export interface RiskSummary {
  id: string
  title: string
  description: string | null
  category: (typeof CATEGORIES)[number]
  impact: number
  probability: number
  score: number
  band: RiskBand
  status: (typeof STATUSES)[number]
  mitigation: string | null
  ownerId: string | null
  ownerName: string | null
  dueDate: string | null
}

export interface RiskRegisterMeta {
  total: number
  open: number
  byBand: Record<RiskBand, number>
  topScore: number
}

function pid(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}

async function verifyProject(id: string, companyId: string) {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.companyId, companyId)))
    .limit(1)
  return row ?? null
}

// GET /api/projects/[id]/risks — the risk register with computed severity +
// a summary (band counts, open count, top score). Ordered by newest.
export const GET = withGates(
  { action: "projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = pid(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const project = await verifyProject(id, ctx.session.companyId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const rows = await db
      .select({
        id: projectRisks.id,
        title: projectRisks.title,
        description: projectRisks.description,
        category: projectRisks.category,
        impact: projectRisks.impact,
        probability: projectRisks.probability,
        mitigation: projectRisks.mitigation,
        status: projectRisks.status,
        ownerId: projectRisks.ownerId,
        dueDate: projectRisks.dueDate,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(projectRisks)
      .leftJoin(users, eq(projectRisks.ownerId, users.id))
      .where(eq(projectRisks.projectId, id))
      .orderBy(desc(projectRisks.createdAt))

    const byBand: Record<RiskBand, number> = { low: 0, medium: 0, high: 0, critical: 0 }
    let open = 0
    let topScore = 0

    const risks: RiskSummary[] = rows.map((r) => {
      const { score, band } = scoreRisk(r.impact, r.probability)
      byBand[band] += 1
      if (r.status !== "closed" && r.status !== "accepted") open += 1
      if (score > topScore) topScore = score
      return {
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category as RiskSummary["category"],
        impact: r.impact,
        probability: r.probability,
        score,
        band,
        status: r.status as RiskSummary["status"],
        mitigation: r.mitigation,
        ownerId: r.ownerId,
        ownerName: r.firstName ? `${r.firstName} ${r.lastName}`.trim() : null,
        dueDate: r.dueDate,
      }
    })

    // Sort by severity (highest first) for the register list.
    risks.sort((a, b) => b.score - a.score)

    const meta: RiskRegisterMeta = { total: risks.length, open, byBand, topScore }
    return NextResponse.json({ risks, meta })
  }
)

// POST /api/projects/[id]/risks — log a new risk.
const postSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).nullable().optional(),
  category: z.enum(CATEGORIES).default("other"),
  impact: z.number().int().min(1).max(5),
  probability: z.number().int().min(1).max(5),
  mitigation: z.string().max(5000).nullable().optional(),
  status: z.enum(STATUSES).default("open"),
  ownerId: z.string().uuid().nullable().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
})

export const POST = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = pid(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session
    const project = await verifyProject(id, companyId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = postSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data

    const [record] = await db
      .insert(projectRisks)
      .values({
        companyId,
        projectId: id,
        title: d.title,
        description: d.description ?? null,
        category: d.category,
        impact: d.impact,
        probability: d.probability,
        mitigation: d.mitigation ?? null,
        status: d.status,
        ownerId: d.ownerId ?? null,
        dueDate: d.dueDate ?? null,
        createdById: actorId,
      })
      .returning({ id: projectRisks.id })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "projects.risk.create",
      entityType: "project",
      entityId: id,
      payload: { title: d.title, impact: d.impact, probability: d.probability },
      method: "POST",
      path: `/api/projects/${id}/risks`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record?.id }, { status: 201 })
  }
)
