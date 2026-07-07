// Document storage analytics — Document Center (roadmap Phase 12). Pure +
// unit-tested.
//
// Rolls the document library into a storage picture: total count and bytes, a
// per-type breakdown (count + size), the status mix, and governance counts
// (legal hold, public). File sizes are stored as strings on the record, so they
// are parsed defensively here.

export type DocumentType =
  | "contract"
  | "report"
  | "photo"
  | "certificate"
  | "invoice_doc"
  | "permit"
  | "specification"
  | "other"

export type DocumentStatus = "draft" | "published" | "under_review" | "signed" | "archived"

export interface DocumentInput {
  type: DocumentType
  status: DocumentStatus
  fileSizeBytes: string | null
  legalHold: boolean
  isPublic: boolean
}

export interface TypeBucket {
  type: string
  count: number
  bytes: number
}

export interface DocumentStorage {
  total: number
  totalBytes: number
  avgBytes: number
  legalHold: number
  publicCount: number
  archived: number
  byType: TypeBucket[] // largest by count first
  byStatus: Record<DocumentStatus, number>
}

function parseBytes(v: string | null): number {
  if (!v) return 0
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

/** Aggregate the document library into a storage + governance view. */
export function computeDocumentStorage(docs: DocumentInput[]): DocumentStorage {
  const byStatus: Record<DocumentStatus, number> = {
    draft: 0,
    published: 0,
    under_review: 0,
    signed: 0,
    archived: 0,
  }
  const typeMap = new Map<string, { count: number; bytes: number }>()

  let totalBytes = 0
  let legalHold = 0
  let publicCount = 0

  for (const d of docs) {
    const bytes = parseBytes(d.fileSizeBytes)
    totalBytes += bytes
    if (d.status in byStatus) byStatus[d.status] += 1
    if (d.legalHold) legalHold += 1
    if (d.isPublic) publicCount += 1

    const t = typeMap.get(d.type) ?? { count: 0, bytes: 0 }
    t.count += 1
    t.bytes += bytes
    typeMap.set(d.type, t)
  }

  const total = docs.length
  const byType: TypeBucket[] = [...typeMap.entries()]
    .map(([type, v]) => ({ type, count: v.count, bytes: v.bytes }))
    .sort((a, b) => b.count - a.count || b.bytes - a.bytes || a.type.localeCompare(b.type))

  return {
    total,
    totalBytes,
    avgBytes: total > 0 ? Math.round(totalBytes / total) : 0,
    legalHold,
    publicCount,
    archived: byStatus.archived,
    byType,
    byStatus,
  }
}
