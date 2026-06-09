import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { documents, users, projects, documentSignatures } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
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
      version: null,
      pages: null,
      signedBy: sig?.signerName ?? null,
      signedAt: sig?.signedAt ? fmtDate(sig.signedAt) : null,
      activity,
    }

    return NextResponse.json(detail)
  }
)
