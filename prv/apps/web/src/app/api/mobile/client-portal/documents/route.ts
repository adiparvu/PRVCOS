import { NextRequest, NextResponse } from "next/server"
import { withPortalMobileAuth } from "@/lib/mobile/portal-auth"
import type { PortalSessionContext } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { documents, projects } from "@prv/db/schema"
import { and, desc, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type MobileDocType = "contract" | "photo" | "report" | "invoice" | "other"

function mapDocType(dbType: string): { type: MobileDocType; label: string } {
  switch (dbType) {
    case "contract":
      return { type: "contract", label: "Contract" }
    case "photo":
      return { type: "photo", label: "Photo" }
    case "report":
      return { type: "report", label: "Report" }
    case "invoice_doc":
      return { type: "invoice", label: "Invoice" }
    case "certificate":
      return { type: "other", label: "Certificate" }
    case "permit":
      return { type: "other", label: "Permit" }
    case "specification":
      return { type: "other", label: "Specification" }
    default:
      return { type: "other", label: "Document" }
  }
}

export const GET = withPortalMobileAuth(
  async (req: NextRequest, ctx: PortalSessionContext): Promise<NextResponse> => {
    if (!ctx.clientId) {
      return NextResponse.json(
        { error: "No client profile linked to this account" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const typeFilter = searchParams.get("type")

    const conditions = [
      eq(documents.companyId, ctx.companyId),
      eq(documents.clientId, ctx.clientId),
      isNull(documents.deletedAt),
    ]

    const rows = await db
      .select({
        id: documents.id,
        title: documents.title,
        type: documents.type,
        fileUrl: documents.fileUrl,
        fileName: documents.fileName,
        fileSizeBytes: documents.fileSizeBytes,
        createdAt: documents.createdAt,
        projectName: projects.name,
      })
      .from(documents)
      .leftJoin(projects, eq(documents.projectId, projects.id))
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt))
      .limit(100)

    const mobileTypeMappings: Record<string, MobileDocType> = {
      contract: "contract",
      photo: "photo",
      report: "report",
      invoice_doc: "invoice",
    }

    const docs = rows
      .filter((r) => {
        if (!typeFilter) return true
        const mapped = mobileTypeMappings[r.type] ?? "other"
        return mapped === typeFilter
      })
      .map((r) => {
        const { type, label } = mapDocType(r.type)
        const sizeKb = r.fileSizeBytes ? Math.round(Number(r.fileSizeBytes) / 1024) : 0
        return {
          id: r.id,
          name: r.title,
          type,
          typeLabel: label,
          url: r.fileUrl,
          sizeKb,
          createdAt: r.createdAt.toISOString(),
          projectName: r.projectName ?? null,
        }
      })

    return NextResponse.json({ documents: docs })
  },
  { portalType: "client" }
)
