import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { projects, projectActivity, users } from "@prv/db/schema"
import { and, eq, desc, lt } from "drizzle-orm"
import { z } from "zod"
import { writeProjectActivity } from "@/lib/project-activity"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const PAGE = 30

export interface ActivityEntry {
  id: string
  kind: string
  summary: string
  entityType: string | null
  entityId: string | null
  actorId: string | null
  actorName: string | null
  createdAt: string
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

// GET /api/projects/[id]/activity?before=<ISO> — the project timeline, newest
// first, cursor-paginated on createdAt.
export const GET = withGates(
  { action: "projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = pid(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const project = await verifyProject(id, ctx.session.companyId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const before = req.nextUrl.searchParams.get("before")
    const conds = [eq(projectActivity.projectId, id)]
    if (before) {
      const d = new Date(before)
      if (!Number.isNaN(d.getTime())) conds.push(lt(projectActivity.createdAt, d))
    }

    const rows = await db
      .select({
        id: projectActivity.id,
        kind: projectActivity.kind,
        summary: projectActivity.summary,
        entityType: projectActivity.entityType,
        entityId: projectActivity.entityId,
        actorId: projectActivity.actorId,
        createdAt: projectActivity.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(projectActivity)
      .leftJoin(users, eq(projectActivity.actorId, users.id))
      .where(and(...conds))
      .orderBy(desc(projectActivity.createdAt))
      .limit(PAGE + 1)

    const hasMore = rows.length > PAGE
    const page = hasMore ? rows.slice(0, PAGE) : rows

    const entries: ActivityEntry[] = page.map((r) => ({
      id: r.id,
      kind: r.kind,
      summary: r.summary,
      entityType: r.entityType,
      entityId: r.entityId,
      actorId: r.actorId,
      actorName: r.firstName ? `${r.firstName} ${r.lastName}`.trim() : null,
      createdAt: r.createdAt.toISOString(),
    }))

    return NextResponse.json({
      entries,
      nextCursor: hasMore ? (page[page.length - 1]?.createdAt.toISOString() ?? null) : null,
    })
  }
)

// POST /api/projects/[id]/activity — add a free-text comment to the timeline.
const postSchema = z.object({ comment: z.string().min(1).max(2000) })

export const POST = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = pid(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId } = ctx.session
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

    await writeProjectActivity({
      companyId,
      projectId: id,
      actorId,
      kind: "comment",
      summary: parsed.data.comment,
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  }
)
