import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { documentShares, documents, users } from "@prv/db/schema"
import { and, desc, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import {
  shareStatus,
  summarizeShares,
  type SharePermission,
  type ShareScope,
  type ShareStatus,
  type ShareSummaryCounts,
} from "@/lib/document-share"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function documentId(req: NextRequest): string {
  // /api/documents/[id]/shares → id is the second-to-last segment
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}

export interface ShareRow {
  id: string
  scope: ShareScope
  permission: SharePermission
  status: ShareStatus
  granteeName: string | null
  token: string | null
  passwordProtected: boolean
  expiresAt: string | null
  accessCount: number
  lastAccessedAt: string | null
  note: string | null
  createdAt: string
}

export interface SharesResponse {
  shares: ShareRow[]
  meta: ShareSummaryCounts
}

// GET /api/documents/[id]/shares — list the document's shares + a status summary.
export const GET = withGates(
  { action: "documents.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const docId = documentId(req)
    if (!docId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const rows = await db
      .select({
        id: documentShares.id,
        scope: documentShares.scope,
        permission: documentShares.permission,
        granteeFirst: users.firstName,
        granteeLast: users.lastName,
        token: documentShares.token,
        passwordProtected: documentShares.passwordProtected,
        expiresAt: documentShares.expiresAt,
        revokedAt: documentShares.revokedAt,
        accessCount: documentShares.accessCount,
        lastAccessedAt: documentShares.lastAccessedAt,
        note: documentShares.note,
        createdAt: documentShares.createdAt,
      })
      .from(documentShares)
      .leftJoin(users, eq(documentShares.granteeUserId, users.id))
      .where(
        and(
          eq(documentShares.documentId, docId),
          eq(documentShares.companyId, ctx.session.companyId)
        )
      )
      .orderBy(desc(documentShares.createdAt))

    const now = Date.now()
    const shares: ShareRow[] = rows.map((r) => ({
      id: r.id,
      scope: r.scope as ShareScope,
      permission: r.permission as SharePermission,
      status: shareStatus(
        {
          revokedAt: r.revokedAt ? r.revokedAt.toISOString() : null,
          expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
        },
        now
      ),
      granteeName: r.granteeFirst ? `${r.granteeFirst} ${r.granteeLast ?? ""}`.trim() : null,
      token: r.token,
      passwordProtected: r.passwordProtected,
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
      accessCount: r.accessCount,
      lastAccessedAt: r.lastAccessedAt ? r.lastAccessedAt.toISOString() : null,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
    }))

    const meta = summarizeShares(
      shares.map((s) => ({
        scope: s.scope,
        revokedAt: s.status === "revoked" ? "x" : null,
        expiresAt: s.expiresAt,
      })),
      now
    )

    return NextResponse.json({ shares, meta })
  }
)

const postSchema = z
  .object({
    scope: z.enum(["internal", "external"]),
    permission: z.enum(["view", "download", "edit", "manage"]).default("view"),
    granteeUserId: z.string().uuid().optional(),
    passwordProtected: z.boolean().default(false),
    expiresAt: z.string().datetime().nullable().optional(),
    note: z.string().max(500).nullable().optional(),
  })
  .refine((d) => d.scope !== "internal" || !!d.granteeUserId, {
    message: "granteeUserId is required for internal shares",
    path: ["granteeUserId"],
  })

// POST /api/documents/[id]/shares — create an internal or external share.
export const POST = withGates(
  { action: "documents.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const docId = documentId(req)
    if (!docId) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const { companyId, userId: actorId, sessionId } = ctx.session

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

    const [doc] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          eq(documents.id, docId),
          eq(documents.companyId, companyId),
          isNull(documents.deletedAt)
        )
      )
      .limit(1)
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 })

    const token = d.scope === "external" ? randomBytes(24).toString("base64url") : null

    const [record] = await db
      .insert(documentShares)
      .values({
        companyId,
        documentId: docId,
        createdById: actorId,
        scope: d.scope,
        permission: d.permission,
        granteeUserId: d.scope === "internal" ? (d.granteeUserId ?? null) : null,
        token,
        passwordProtected: d.passwordProtected,
        expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
        note: d.note ?? null,
      })
      .returning({ id: documentShares.id })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "documents.share.create",
      entityType: "document_share",
      entityId: record?.id ?? docId,
      payload: { documentId: docId, scope: d.scope, permission: d.permission },
      method: "POST",
      path: `/api/documents/${docId}/shares`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record?.id, token }, { status: 201 })
  }
)
