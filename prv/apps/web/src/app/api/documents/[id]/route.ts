import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { documents, users, projects, documentSignatures } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import type { DocStatus, DocCategory, DocExt } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface ActivityEvent {
  id: string
  label: string
  actor: string
  timestamp: string
  color: string
  done: boolean
}

export interface DocumentDetail {
  id: string
  name: string
  ext: DocExt
  category: DocCategory
  categoryLabel: string
  author: string
  date: string
  sizeLabel: string
  status: DocStatus
  project: string | null
  expiresAt: string | null
  expiresAtISO: string | null
  description: string | null
  isPublic: boolean
  version: string | null
  pages: number | null
  signedBy: string | null
  signedAt: string | null
  activity: ActivityEvent[]
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

function fmtSize(bytes: string | null): string {
  if (!bytes) return "—"
  const n = Number(bytes)
  if (isNaN(n)) return bytes
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`
  if (n >= 1_024) return `${(n / 1_024).toFixed(0)} KB`
  return `${n} B`
}

function extFromFileName(fileName: string, mimeType: string | null): DocExt {
  const lower = fileName.toLowerCase()
  if (lower.endsWith(".pdf")) return "PDF"
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) return "DOC"
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "XLS"
  if (mimeType?.includes("pdf")) return "PDF"
  if (mimeType?.includes("word") || mimeType?.includes("document")) return "DOC"
  if (mimeType?.includes("sheet") || mimeType?.includes("excel")) return "XLS"
  return "PDF"
}

function dbTypeToCategory(type: string): { category: DocCategory; categoryLabel: string } {
  switch (type) {
    case "contract":
      return { category: "contracts", categoryLabel: "Contracte" }
    case "invoice_doc":
      return { category: "invoices", categoryLabel: "Facturi" }
    case "report":
    case "specification":
    case "photo":
    case "permit":
    case "certificate":
      return { category: "projects", categoryLabel: "Proiecte" }
    default:
      return { category: "hr", categoryLabel: "HR" }
  }
}

function dbStatusToApi(dbStatus: string, expiresAt: Date | null): DocStatus {
  if (dbStatus === "signed") return "signed"
  if (dbStatus === "draft") return "draft"
  if (dbStatus === "archived") return "expired"
  if (expiresAt && expiresAt < new Date()) return "expired"
  return "pending"
}

export const GET = withGates(
  { action: "documents.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

    const [docRows, sigRows] = await Promise.all([
      db
        .select({
          id: documents.id,
          title: documents.title,
          fileName: documents.fileName,
          fileSizeBytes: documents.fileSizeBytes,
          mimeType: documents.mimeType,
          type: documents.type,
          status: documents.status,
          versionNumber: documents.versionNumber,
          description: documents.description,
          isPublic: documents.isPublic,
          expiresAt: documents.expiresAt,
          createdAt: documents.createdAt,
          authorFirstName: users.firstName,
          authorLastName: users.lastName,
          projectName: projects.name,
        })
        .from(documents)
        .leftJoin(users, eq(documents.uploadedByUserId, users.id))
        .leftJoin(projects, eq(documents.projectId, projects.id))
        .where(
          and(eq(documents.id, id), eq(documents.companyId, companyId), isNull(documents.deletedAt))
        )
        .limit(1),

      db
        .select({
          signerName: documentSignatures.signerName,
          signedAt: documentSignatures.signedAt,
        })
        .from(documentSignatures)
        .where(eq(documentSignatures.documentId, id))
        .limit(1),
    ])

    const row = docRows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const { category, categoryLabel } = dbTypeToCategory(row.type)
    const apiStatus = dbStatusToApi(row.status, row.expiresAt)
    const authorName =
      row.authorFirstName && row.authorLastName
        ? `${row.authorFirstName} ${row.authorLastName}`
        : "—"

    const sig = sigRows[0] ?? null

    const activity: ActivityEvent[] = [
      {
        id: "a-created",
        label: "Document creat",
        actor: authorName,
        timestamp: fmtDate(row.createdAt),
        color: "rgba(255,255,255,0.25)",
        done: false,
      },
    ]
    if (sig?.signedAt) {
      activity.unshift({
        id: "a-signed",
        label: `Semnat de ${sig.signerName}`,
        actor: sig.signerName,
        timestamp: fmtDate(sig.signedAt),
        color: "rgba(48,209,88,0.9)",
        done: true,
      })
    }

    const detail: DocumentDetail = {
      id: row.id,
      name: row.fileName,
      ext: extFromFileName(row.fileName, row.mimeType),
      category,
      categoryLabel,
      author: authorName,
      date: fmtDate(row.createdAt),
      sizeLabel: fmtSize(row.fileSizeBytes),
      status: apiStatus,
      project: row.projectName ?? null,
      expiresAt: row.expiresAt ? fmtDate(row.expiresAt) : null,
      expiresAtISO: row.expiresAt ? row.expiresAt.toISOString().slice(0, 10) : null,
      description: row.description ?? null,
      isPublic: row.isPublic ?? false,
      version: `v${row.versionNumber}`,
      pages: null,
      signedBy: sig?.signerName ?? null,
      signedAt: sig?.signedAt ? fmtDate(sig.signedAt) : null,
      activity,
    }

    return NextResponse.json(detail)
  }
)

// ─── PATCH /api/documents/[id] ────────────────────────────────────────────────

const patchSchema = z
  .object({
    status: z.enum(["draft", "published", "under_review", "signed", "archived"]).optional(),
    description: z.string().max(2000).optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    projectId: z.string().uuid().nullable().optional(),
    isPublic: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.status !== undefined ||
      d.description !== undefined ||
      d.expiresAt !== undefined ||
      d.projectId !== undefined ||
      d.isPublic !== undefined,
    { message: "At least one field required" }
  )

export const PATCH = withGates(
  { action: "documents.update", endpointClass: "api_write" },
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
      .select({ id: documents.id, title: documents.title })
      .from(documents)
      .where(
        and(eq(documents.id, id), eq(documents.companyId, companyId), isNull(documents.deletedAt))
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const d = parsed.data
    const [updated] = await db
      .update(documents)
      .set({
        ...(d.status !== undefined && { status: d.status }),
        ...(d.description !== undefined && { description: d.description }),
        ...(d.expiresAt !== undefined && {
          expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
        }),
        ...(d.projectId !== undefined && { projectId: d.projectId }),
        ...(d.isPublic !== undefined && { isPublic: d.isPublic }),
        updatedAt: new Date(),
      })
      .where(and(eq(documents.id, id), eq(documents.companyId, companyId)))
      .returning({ id: documents.id, status: documents.status })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "documents.update",
      entityType: "document",
      entityId: id,
      payload: { title: existing.title, changes: d },
      method: "PATCH",
      path: `/api/documents/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ─── DELETE /api/documents/[id] ───────────────────────────────────────────────

export const DELETE = withGates(
  { action: "documents.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [existing] = await db
      .select({ id: documents.id, title: documents.title })
      .from(documents)
      .where(
        and(eq(documents.id, id), eq(documents.companyId, companyId), isNull(documents.deletedAt))
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .update(documents)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(documents.id, id), eq(documents.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "documents.delete",
      entityType: "document",
      entityId: id,
      payload: { title: existing.title },
      method: "DELETE",
      path: `/api/documents/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
