import { NextRequest, NextResponse } from "next/server"
import { withPortalAuth } from "@/lib/portal-middleware"
import type { PortalSessionContext } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { invoices, projects } from "@prv/db/schema"
import { and, desc, eq, inArray, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// A "quote" is a client-facing invoice awaiting the client's decision (status
// `sent`) or one they have already decided on (recorded in metadata). Drafts
// are internal-only and never surfaced.
export const GET = withPortalAuth(
  async (_req: NextRequest, ctx: PortalSessionContext): Promise<NextResponse> => {
    if (!ctx.clientId) {
      return NextResponse.json(
        { error: "No client profile linked to this account" },
        { status: 403 }
      )
    }

    const rows = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        total: invoices.total,
        currency: invoices.currency,
        metadata: invoices.metadata,
        projectName: projects.name,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .leftJoin(projects, eq(invoices.projectId, projects.id))
      .where(
        and(
          eq(invoices.companyId, ctx.companyId),
          eq(invoices.clientId, ctx.clientId),
          isNull(invoices.deletedAt),
          inArray(invoices.status, ["sent", "cancelled"])
        )
      )
      .orderBy(desc(invoices.createdAt))
      .limit(100)

    const quotes = rows.map((r) => {
      const meta = (r.metadata ?? {}) as Record<string, unknown>
      const decision = typeof meta.clientDecision === "string" ? meta.clientDecision : null
      return {
        id: r.id,
        ref: r.invoiceNumber,
        status: r.status,
        clientDecision: decision,
        clientDecidedAt: typeof meta.clientDecidedAt === "string" ? meta.clientDecidedAt : null,
        issueDate: r.issueDate,
        dueDate: r.dueDate,
        total: Number(r.total),
        currency: r.currency,
        project: r.projectName ?? null,
        // Awaiting the client only while sent and not yet decided.
        pending: r.status === "sent" && !decision,
      }
    })

    return NextResponse.json({ quotes, count: quotes.length })
  },
  { portalType: "client" }
)
