import { NextRequest, NextResponse } from "next/server"
import { withPortalAuth } from "@/lib/portal-middleware"
import type { PortalSessionContext } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { projects, projectMessages, users, portalAccounts } from "@prv/db/schema"
import { and, asc, eq, isNull } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// path: /api/portal/projects/[id]/messages
function projectId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}

async function ownProject(pid: string, ctx: PortalSessionContext): Promise<boolean> {
  if (!ctx.clientId) return false
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.id, pid),
        eq(projects.companyId, ctx.companyId),
        eq(projects.clientId, ctx.clientId),
        isNull(projects.deletedAt)
      )
    )
    .limit(1)
  return !!row
}

export const GET = withPortalAuth(
  async (req: NextRequest, ctx: PortalSessionContext): Promise<NextResponse> => {
    const pid = projectId(req)
    if (!(await ownProject(pid, ctx)))
      return NextResponse.json({ error: "Not found" }, { status: 404 })

    const rows = await db
      .select({
        id: projectMessages.id,
        authorType: projectMessages.authorType,
        authorPortalAccountId: projectMessages.authorPortalAccountId,
        body: projectMessages.body,
        createdAt: projectMessages.createdAt,
        staffFirstName: users.firstName,
        staffLastName: users.lastName,
        clientName: portalAccounts.name,
      })
      .from(projectMessages)
      .leftJoin(users, eq(projectMessages.authorUserId, users.id))
      .leftJoin(portalAccounts, eq(projectMessages.authorPortalAccountId, portalAccounts.id))
      .where(and(eq(projectMessages.projectId, pid), eq(projectMessages.companyId, ctx.companyId)))
      .orderBy(asc(projectMessages.createdAt))
      .limit(200)

    const messages = rows.map((r) => ({
      id: r.id,
      author:
        r.authorType === "staff"
          ? r.staffFirstName
            ? `${r.staffFirstName} ${r.staffLastName}`
            : "PRV Team"
          : (r.clientName ?? "Client"),
      staff: r.authorType === "staff",
      mine: r.authorType === "client" && r.authorPortalAccountId === ctx.accountId,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
    }))

    return NextResponse.json({ messages })
  },
  { portalType: "client" }
)

const bodySchema = z.object({ body: z.string().min(1).max(4000) })

export const POST = withPortalAuth(
  async (req: NextRequest, ctx: PortalSessionContext): Promise<NextResponse> => {
    const pid = projectId(req)
    if (!(await ownProject(pid, ctx)))
      return NextResponse.json({ error: "Not found" }, { status: 404 })

    const raw = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) return NextResponse.json({ error: "Message required" }, { status: 422 })

    const [msg] = await db
      .insert(projectMessages)
      .values({
        companyId: ctx.companyId,
        projectId: pid,
        authorType: "client",
        authorPortalAccountId: ctx.accountId,
        body: parsed.data.body,
      })
      .returning({ id: projectMessages.id })

    return NextResponse.json({ id: msg?.id }, { status: 201 })
  },
  { portalType: "client" }
)
