import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { employeeDocuments, users } from "@prv/db/schema"
import { and, eq, asc } from "drizzle-orm"
import { z } from "zod"
import { complianceBand, isCompliant } from "@/lib/compliance"
import { daysUntil } from "@/lib/contract-expiry"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const TYPES = [
  "passport",
  "visa",
  "id_card",
  "driving_license",
  "work_permit",
  "certification",
  "medical",
  "other",
] as const
const STATUSES = ["pending", "verified", "rejected"] as const
const ISO = /^\d{4}-\d{2}-\d{2}$/

export interface ComplianceDoc {
  id: string
  userId: string
  userName: string | null
  docType: (typeof TYPES)[number]
  title: string
  reference: string | null
  issuedDate: string | null
  expiryDate: string | null
  status: (typeof STATUSES)[number]
  band: "expired" | "expiring" | "valid" | "none"
  expiresInDays: number | null
  compliant: boolean
  notes: string | null
}

export interface ComplianceMeta {
  total: number
  verified: number
  pending: number
  expiringSoon: number
  expired: number
  compliant: number
  compliancePct: number
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// GET /api/compliance/documents?userId=&docType= — the HR compliance register.
// Each document is banded by expiry and marked compliant/non-compliant; the meta
// gives the dashboard figures (% compliant, expiring ≤30d, expired, pending).
export const GET = withGates(
  { action: "hr.compliance.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const sp = req.nextUrl.searchParams
    const userId = sp.get("userId")
    const docType = sp.get("docType")

    const conds = [eq(employeeDocuments.companyId, ctx.session.companyId)]
    if (userId) conds.push(eq(employeeDocuments.userId, userId))
    if (docType && (TYPES as readonly string[]).includes(docType)) {
      conds.push(eq(employeeDocuments.docType, docType as (typeof TYPES)[number]))
    }

    const rows = await db
      .select({
        id: employeeDocuments.id,
        userId: employeeDocuments.userId,
        docType: employeeDocuments.docType,
        title: employeeDocuments.title,
        reference: employeeDocuments.reference,
        issuedDate: employeeDocuments.issuedDate,
        expiryDate: employeeDocuments.expiryDate,
        status: employeeDocuments.status,
        notes: employeeDocuments.notes,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(employeeDocuments)
      .leftJoin(users, eq(employeeDocuments.userId, users.id))
      .where(and(...conds))
      .orderBy(asc(employeeDocuments.expiryDate))

    const day = today()
    const docs: ComplianceDoc[] = rows.map((r) => {
      const band = complianceBand(r.expiryDate, day)
      return {
        id: r.id,
        userId: r.userId,
        userName: r.firstName ? `${r.firstName} ${r.lastName}`.trim() : null,
        docType: r.docType as (typeof TYPES)[number],
        title: r.title,
        reference: r.reference,
        issuedDate: r.issuedDate,
        expiryDate: r.expiryDate,
        status: r.status as (typeof STATUSES)[number],
        band,
        expiresInDays: r.expiryDate ? daysUntil(r.expiryDate, day) : null,
        compliant: isCompliant(r.status, band),
        notes: r.notes,
      }
    })

    // Worst first: expired, then expiring, then the rest.
    const rank = { expired: 0, expiring: 1, valid: 2, none: 3 } as const
    docs.sort((a, b) => rank[a.band] - rank[b.band])

    const compliant = docs.filter((d) => d.compliant).length
    const meta: ComplianceMeta = {
      total: docs.length,
      verified: docs.filter((d) => d.status === "verified").length,
      pending: docs.filter((d) => d.status === "pending").length,
      expiringSoon: docs.filter((d) => d.band === "expiring").length,
      expired: docs.filter((d) => d.band === "expired").length,
      compliant,
      compliancePct: docs.length ? Math.round((compliant / docs.length) * 100) : 100,
    }

    return NextResponse.json({ documents: docs, meta })
  }
)

// POST /api/compliance/documents — record a required/held document.
const postSchema = z.object({
  userId: z.string().uuid(),
  docType: z.enum(TYPES).default("other"),
  title: z.string().min(1).max(160),
  reference: z.string().max(120).nullable().optional(),
  issuedDate: z.string().regex(ISO).nullable().optional(),
  expiryDate: z.string().regex(ISO).nullable().optional(),
  status: z.enum(STATUSES).default("pending"),
  notes: z.string().max(5000).nullable().optional(),
})

export const POST = withGates(
  { action: "hr.compliance.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
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

    const [record] = await db
      .insert(employeeDocuments)
      .values({
        companyId,
        userId: d.userId,
        docType: d.docType,
        title: d.title,
        reference: d.reference ?? null,
        issuedDate: d.issuedDate ?? null,
        expiryDate: d.expiryDate ?? null,
        status: d.status,
        notes: d.notes ?? null,
        createdById: actorId,
      })
      .returning({ id: employeeDocuments.id })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "hr.compliance.create",
      entityType: "employee_document",
      entityId: record?.id ?? d.userId,
      payload: { userId: d.userId, docType: d.docType },
      method: "POST",
      path: "/api/compliance/documents",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record?.id }, { status: 201 })
  }
)
