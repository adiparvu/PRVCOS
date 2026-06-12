import { getPortalSession } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { documents } from "@prv/db/schema"
import { and, desc, eq, isNull, or } from "drizzle-orm"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Documents" }
export const dynamic = "force-dynamic"

type DocType =
  | "contract"
  | "report"
  | "photo"
  | "certificate"
  | "invoice_doc"
  | "permit"
  | "specification"
  | "other"

const TYPE_LABELS: Record<DocType, string> = {
  contract: "Contracts",
  report: "Reports",
  photo: "Photos",
  certificate: "Certificates",
  invoice_doc: "Invoice Documents",
  permit: "Permits",
  specification: "Specifications",
  other: "Other",
}

const TYPE_ORDER: DocType[] = [
  "contract",
  "report",
  "certificate",
  "permit",
  "specification",
  "photo",
  "invoice_doc",
  "other",
]

function docIcon(type: DocType) {
  switch (type) {
    case "photo":
      return "🖼"
    case "contract":
      return "📄"
    case "certificate":
      return "🏅"
    case "permit":
      return "🔖"
    case "report":
      return "📊"
    case "specification":
      return "📐"
    case "invoice_doc":
      return "🧾"
    default:
      return "📁"
  }
}

function statusLabel(s: string) {
  const m: Record<string, string> = {
    draft: "Draft",
    published: "Published",
    under_review: "Under Review",
    signed: "Signed",
    archived: "Archived",
  }
  return m[s] ?? s
}

function statusColor(s: string) {
  if (s === "signed") return "rgba(140,255,140,0.75)"
  if (s === "under_review") return "rgba(255,220,100,0.85)"
  if (s === "archived") return "rgba(255,255,255,0.25)"
  return "rgba(255,255,255,0.40)"
}

function formatBytes(bytes: string | null | undefined) {
  if (!bytes) return null
  const n = parseInt(bytes)
  if (isNaN(n)) return null
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export default async function PortalDocumentsPage() {
  const session = await getPortalSession()
  if (!session || !session.clientId) redirect("/portal/login")

  const allDocs = await db
    .select({
      id: documents.id,
      title: documents.title,
      type: documents.type,
      status: documents.status,
      fileName: documents.fileName,
      fileSizeBytes: documents.fileSizeBytes,
      mimeType: documents.mimeType,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, session.companyId),
        eq(documents.clientId, session.clientId),
        isNull(documents.deletedAt),
        or(
          eq(documents.isPublic, true),
          eq(documents.status, "published"),
          eq(documents.status, "signed")
        )
      )
    )
    .orderBy(desc(documents.updatedAt))

  const grouped = TYPE_ORDER.map((t) => ({
    type: t,
    items: allDocs.filter((d) => d.type === t),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="mx-auto max-w-2xl">
      <h1
        className="mb-6 text-2xl font-semibold text-white/95"
        style={{ letterSpacing: "-0.03em" }}
      >
        Documents
      </h1>

      {/* Count summary */}
      {allDocs.length > 0 && (
        <div
          className="mb-6 flex items-center gap-2 rounded-[16px] px-4 py-3"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
          }}
        >
          <span className="text-sm text-white/50">
            {allDocs.length} document{allDocs.length !== 1 ? "s" : ""} across {grouped.length}{" "}
            categor{grouped.length !== 1 ? "ies" : "y"}
          </span>
        </div>
      )}

      {allDocs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(({ type, items }) => (
            <div key={type}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <span className="text-base">{docIcon(type as DocType)}</span>
                <span className="text-[11px] font-medium uppercase tracking-wider text-white/35">
                  {TYPE_LABELS[type as DocType]} · {items.length}
                </span>
              </div>
              <div
                className="overflow-hidden rounded-[20px]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                {items.map((doc, i) => (
                  <Link
                    key={doc.id}
                    href={`/portal/documents/${doc.id}`}
                    className="flex items-center justify-between px-5 py-4 transition-all hover:bg-white/[0.03]"
                    style={{
                      borderTop: i > 0 ? "1px solid rgba(255,255,255,0.07)" : undefined,
                    }}
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium text-white/90">
                        {doc.title}
                      </span>
                      <span className="text-xs text-white/35">
                        {new Date(doc.updatedAt).toLocaleDateString("ro-RO")}
                        {formatBytes(doc.fileSizeBytes)
                          ? ` · ${formatBytes(doc.fileSizeBytes)}`
                          : ""}
                      </span>
                    </div>
                    <div className="ml-4 flex shrink-0 items-center gap-2">
                      <span className="text-[11px]" style={{ color: statusColor(doc.status) }}>
                        {statusLabel(doc.status)}
                      </span>
                      <ChevronIcon />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 18l6-6-6-6"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function EmptyState() {
  return (
    <div className="mt-16 flex flex-col items-center gap-3 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="13 2 13 9 20 9"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="text-sm text-white/45">No documents shared yet.</p>
    </div>
  )
}
