import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { projects, anomalyDetections } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  type: z.enum(["budget_risk", "delay", "quality"]),
  severity: z.enum(["low", "medium", "high"]),
  note: z.string().max(500),
})

const FLAG_TITLES: Record<string, string> = {
  budget_risk: "Budget risk flagged",
  delay: "Schedule delay flagged",
  quality: "Quality issue flagged",
}

export const POST = withGates(
  { action: "projects.flag.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").at(-2) ?? ""
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

    const { type, severity, note } = parsed.data
    const { userId, companyId, sessionId } = ctx.session

    const [project] = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(
        and(eq(projects.id, id), eq(projects.companyId, companyId), isNull(projects.deletedAt))
      )
      .limit(1)

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const [anomaly] = await db
      .insert(anomalyDetections)
      .values({
        companyId,
        type: "risk",
        severity,
        domain: "projects",
        title: `${FLAG_TITLES[type]}: ${project.name}`,
        description: note,
        metric: type,
        actionLabel: "Review project",
        href: `/projects/${id}`,
      })
      .returning({ id: anomalyDetections.id })

    void writeAuditLog({
      actorId: userId,
      companyId,
      sessionId,
      action: `projects.flag.${type}`,
      entityType: "project",
      entityId: id,
      payload: { type, severity, note, anomalyId: anomaly?.id ?? null },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ success: true, id, type, severity, anomalyId: anomaly?.id })
  }
)
