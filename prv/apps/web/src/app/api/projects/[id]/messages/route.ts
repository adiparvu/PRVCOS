import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { projects, projectMessages, users, portalAccounts } from "@prv/db/schema"
import { and, asc, eq, isNull } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// path: /api/projects/[id]/messages
function projectId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}

async function loadProject(pid: string, companyId: string) {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, pid), eq(projects.companyId, companyId), isNull(projects.deletedAt)))
    .limit(1)
  return row ?? null
}

export const GET = withGates(
  { action: "projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const pid = projectId(req)
    const { companyId } = ctx.session
    if (!(await loadProject(pid, companyId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 })

    const rows = await db
      .select({
        id: projectMessages.id,
        authorType: projectMessages.authorType,
        body: projectMessages.body,
        createdAt: projectMessages.createdAt,
        staffFirstName: users.firstName,
        staffLastName: users.lastName,
        clientName: portalAccounts.name,
      })
      .from(projectMessages)
      .leftJoin(users, eq(projectMessages.authorUserId, users.id))
      .leftJoin(portalAccounts, eq(projectMessages.authorPortalAccountId, portalAccounts.id))
      .where(and(eq(projectMessages.projectId, pid), eq(projectMessages.companyId, companyId)))
      .orderBy(asc(projectMessages.createdAt))
      .limit(200)

    const messages = rows.map((r) => ({
      id: r.id,
      author:
        r.authorType === "staff"
          ? r.staffFirstName
            ? `${r.staffFirstName} ${r.staffLastName}`
            : "Staff"
          : (r.clientName ?? "Client"),
      staff: r.authorType === "staff",
      body: r.body,
      createdAt: r.createdAt.toISOString(),
    }))

    return NextResponse.json({ messages })
  }
)

const bodySchema = z.object({ body: z.string().min(1).max(4000) })

export const POST = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const pid = projectId(req)
    const { companyId, userId } = ctx.session
    if (!(await loadProject(pid, companyId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 })

    const raw = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) return NextResponse.json({ error: "Message required" }, { status: 422 })

    const [msg] = await db
      .insert(projectMessages)
      .values({
        companyId,
        projectId: pid,
        authorType: "staff",
        authorUserId: userId,
        body: parsed.data.body,
      })
      .returning({ id: projectMessages.id })

    return NextResponse.json({ id: msg?.id }, { status: 201 })
  }
)
