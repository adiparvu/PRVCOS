import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { documents, users, projects } from "@prv/db/schema"
import { and, desc, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type DocStatus = "signed" | "pending" | "draft" | "expired"
export type DocCategory = "contracts" | "invoices" | "projects" | "hr" | "fleet"
export type DocExt = "PDF" | "DOC" | "XLS"

export interface DocumentRecord {
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
  version: string | null
  pages: number | null
}

export interface DocumentsMeta {
  total: number
  pendingCount: number
  expiredCount: number
  recentCount: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  // published / under_review
  if (expiresAt && expiresAt < new Date()) return "expired"
  return "pending"
}

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "documents.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const category = req.nextUrl.searchParams.get("category")

    const rows = await db
      .select({
        id: documents.id,
        fileName: documents.fileName,
        fileSizeBytes: documents.fileSizeBytes,
        mimeType: documents.mimeType,
        type: documents.type,
        status: documents.status,
        expiresAt: documents.expiresAt,
        createdAt: documents.createdAt,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
        projectName: projects.name,
      })
      .from(documents)
      .leftJoin(users, eq(documents.uploadedByUserId, users.id))
      .leftJoin(projects, eq(documents.projectId, projects.id))
      .where(and(eq(documents.companyId, ctx.session.companyId), isNull(documents.deletedAt)))
      .orderBy(desc(documents.createdAt))

    const all: DocumentRecord[] = rows.map((r) => {
      const { category: cat, categoryLabel } = dbTypeToCategory(r.type)
      const apiStatus = dbStatusToApi(r.status, r.expiresAt)
      const authorName =
        r.authorFirstName && r.authorLastName ? `${r.authorFirstName} ${r.authorLastName}` : "—"
      return {
        id: r.id,
        name: r.fileName,
        ext: extFromFileName(r.fileName, r.mimeType),
        category: cat,
        categoryLabel,
        author: authorName,
        date: fmtDate(r.createdAt),
        sizeLabel: fmtSize(r.fileSizeBytes),
        status: apiStatus,
        project: r.projectName ?? null,
        expiresAt: r.expiresAt ? fmtDate(r.expiresAt) : null,
        version: null,
        pages: null,
      }
    })

    const filtered = category ? all.filter((d) => d.category === category) : all

    const meta: DocumentsMeta = {
      total: all.length,
      pendingCount: all.filter((d) => d.status === "pending").length,
      expiredCount: all.filter((d) => d.status === "expired").length,
      recentCount: all.filter((d) => d.status === "signed" || d.status === "draft").length,
    }

    return NextResponse.json({ documents: filtered, count: filtered.length, meta })
  }
)
