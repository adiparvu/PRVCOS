import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { documents } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import {
  computeDocumentStorage,
  type DocumentStorage,
  type DocumentType,
  type DocumentStatus,
} from "@/lib/document-storage"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type DocumentStorageResponse = DocumentStorage

// GET /api/analytics/document-storage — document library storage + governance:
// count/bytes, per-type and per-status breakdown, legal-hold and public counts.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select({
        type: documents.type,
        status: documents.status,
        fileSizeBytes: documents.fileSizeBytes,
        legalHold: documents.legalHold,
        isPublic: documents.isPublic,
      })
      .from(documents)
      .where(and(eq(documents.companyId, ctx.session.companyId), isNull(documents.deletedAt)))

    const storage = computeDocumentStorage(
      rows.map((r) => ({
        type: r.type as DocumentType,
        status: r.status as DocumentStatus,
        fileSizeBytes: r.fileSizeBytes,
        legalHold: Boolean(r.legalHold),
        isPublic: Boolean(r.isPublic),
      }))
    )

    return NextResponse.json(storage)
  }
)
