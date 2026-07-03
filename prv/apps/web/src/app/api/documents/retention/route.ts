import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { documents, retentionPolicies } from "@prv/db/schema"
import { and, desc, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import {
  evaluateRetention,
  summarizeRetention,
  DEFAULT_RETENTION_MONTHS,
  type DocumentType,
  type RetentionBand,
  type RetentionResult,
  type RetentionSummary,
} from "@/lib/document-retention"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const DOC_TYPES = [
  "contract",
  "report",
  "photo",
  "certificate",
  "invoice_doc",
  "permit",
  "specification",
  "other",
] as const

export interface RetentionRow {
  id: string
  title: string
  type: DocumentType
  status: string
  legalHold: boolean
  legalHoldReason: string | null
  band: RetentionBand
  effectiveExpiry: string
  daysUntilExpiry: number
  autoArchiveEligible: boolean
  gdprEraseEligible: boolean
}

export interface RetentionPolicyRow {
  documentType: DocumentType
  retentionMonths: number
  autoArchive: boolean
  isDefault: boolean
}

export interface RetentionResponse {
  documents: RetentionRow[]
  policies: RetentionPolicyRow[]
  meta: RetentionSummary
}

// GET /api/documents/retention — retention/expiry dashboard: every active
// document banded by retention state, plus the effective per-type policies.
export const GET = withGates(
  { action: "documents.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const companyId = ctx.session.companyId

    const [docRows, policyRows] = await Promise.all([
      db
        .select({
          id: documents.id,
          title: documents.title,
          type: documents.type,
          status: documents.status,
          createdAt: documents.createdAt,
          expiresAt: documents.expiresAt,
          legalHold: documents.legalHold,
          legalHoldReason: documents.legalHoldReason,
        })
        .from(documents)
        .where(and(eq(documents.companyId, companyId), isNull(documents.deletedAt)))
        .orderBy(desc(documents.createdAt)),
      db
        .select({
          documentType: retentionPolicies.documentType,
          retentionMonths: retentionPolicies.retentionMonths,
          autoArchive: retentionPolicies.autoArchive,
        })
        .from(retentionPolicies)
        .where(eq(retentionPolicies.companyId, companyId)),
    ])

    const policyByType = new Map(policyRows.map((p) => [p.documentType as DocumentType, p]))
    const now = Date.now()

    const results: RetentionResult[] = []
    const rows: RetentionRow[] = docRows.map((d) => {
      const type = d.type as DocumentType
      const policy = policyByType.get(type)
      const r = evaluateRetention(
        {
          type,
          createdAt: d.createdAt.toISOString(),
          expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
          status: d.status,
          legalHold: d.legalHold,
        },
        policy
          ? { retentionMonths: policy.retentionMonths, autoArchive: policy.autoArchive }
          : undefined,
        now
      )
      results.push(r)
      return {
        id: d.id,
        title: d.title,
        type,
        status: d.status,
        legalHold: d.legalHold,
        legalHoldReason: d.legalHoldReason,
        band: r.band,
        effectiveExpiry: r.effectiveExpiry,
        daysUntilExpiry: r.daysUntilExpiry,
        autoArchiveEligible: r.autoArchiveEligible,
        gdprEraseEligible: r.gdprEraseEligible,
      }
    })

    // Sort: most urgent first (expired/approaching), then active, hold last.
    const bandRank: Record<RetentionBand, number> = {
      expired: 0,
      approaching_14: 1,
      approaching_30: 2,
      active: 3,
      on_hold: 4,
    }
    rows.sort(
      (a, b) => bandRank[a.band] - bandRank[b.band] || a.daysUntilExpiry - b.daysUntilExpiry
    )

    const policies: RetentionPolicyRow[] = DOC_TYPES.map((t) => {
      const p = policyByType.get(t)
      return {
        documentType: t,
        retentionMonths: p?.retentionMonths ?? DEFAULT_RETENTION_MONTHS[t],
        autoArchive: p?.autoArchive ?? true,
        isDefault: !p,
      }
    })

    return NextResponse.json({ documents: rows, policies, meta: summarizeRetention(results) })
  }
)

const putSchema = z.object({
  documentType: z.enum(DOC_TYPES),
  retentionMonths: z.number().int().min(1).max(600),
  autoArchive: z.boolean(),
})

// PUT /api/documents/retention — upsert the retention policy for a document type.
export const PUT = withGates(
  { action: "documents.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId: actorId, sessionId } = ctx.session

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    const parsed = putSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data

    await db
      .insert(retentionPolicies)
      .values({
        companyId,
        documentType: d.documentType,
        retentionMonths: d.retentionMonths,
        autoArchive: d.autoArchive,
      })
      .onConflictDoUpdate({
        target: [retentionPolicies.companyId, retentionPolicies.documentType],
        set: {
          retentionMonths: d.retentionMonths,
          autoArchive: d.autoArchive,
          updatedAt: new Date(),
        },
      })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "documents.retention.policy",
      entityType: "retention_policy",
      entityId: d.documentType,
      payload: d,
      method: "PUT",
      path: "/api/documents/retention",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ ok: true, documentType: d.documentType })
  }
)
