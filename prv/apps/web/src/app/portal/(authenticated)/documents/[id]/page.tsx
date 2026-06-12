import { getPortalSession } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { documents, documentSignatures, projects } from "@prv/db/schema"
import { and, desc, eq, isNull, or } from "drizzle-orm"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const [doc] = await db
    .select({ title: documents.title })
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1)
  return { title: doc?.title ?? "Document" }
}

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
  contract: "Contract",
  report: "Report",
  photo: "Photo",
  certificate: "Certificate",
  invoice_doc: "Invoice Document",
  permit: "Permit",
  specification: "Specification",
  other: "Document",
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
  return "rgba(255,255,255,0.45)"
}

function statusBg(s: string) {
  if (s === "signed") return "rgba(140,255,140,0.10)"
  if (s === "under_review") return "rgba(255,220,100,0.10)"
  return "rgba(255,255,255,0.06)"
}

function statusBorder(s: string) {
  if (s === "signed") return "rgba(140,255,140,0.18)"
  if (s === "under_review") return "rgba(255,220,100,0.20)"
  return "rgba(255,255,255,0.09)"
}

function formatBytes(bytes: string | null | undefined) {
  if (!bytes) return null
  const n = parseInt(bytes)
  if (isNaN(n)) return null
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(mimeType: string | null | undefined) {
  return mimeType?.startsWith("image/") ?? false
}

function isPdf(mimeType: string | null | undefined) {
  return mimeType === "application/pdf"
}

export default async function PortalDocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getPortalSession()
  if (!session || !session.clientId) redirect("/portal/login")

  const [doc] = await db
    .select({
      id: documents.id,
      title: documents.title,
      description: documents.description,
      type: documents.type,
      status: documents.status,
      fileUrl: documents.fileUrl,
      fileName: documents.fileName,
      fileSizeBytes: documents.fileSizeBytes,
      mimeType: documents.mimeType,
      isPublic: documents.isPublic,
      expiresAt: documents.expiresAt,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
      clientId: documents.clientId,
      projectId: documents.projectId,
    })
    .from(documents)
    .where(
      and(
        eq(documents.id, id),
        eq(documents.companyId, session.companyId),
        isNull(documents.deletedAt),
        or(
          eq(documents.isPublic, true),
          eq(documents.status, "published"),
          eq(documents.status, "signed")
        )
      )
    )
    .limit(1)

  if (!doc || doc.clientId !== session.clientId) notFound()

  const [signatures, project] = await Promise.all([
    db
      .select({
        id: documentSignatures.id,
        signerName: documentSignatures.signerName,
        signerEmail: documentSignatures.signerEmail,
        signedAt: documentSignatures.signedAt,
        requestedAt: documentSignatures.requestedAt,
      })
      .from(documentSignatures)
      .where(eq(documentSignatures.documentId, doc.id))
      .orderBy(desc(documentSignatures.requestedAt)),

    doc.projectId
      ? db
          .select({ id: projects.id, name: projects.name })
          .from(projects)
          .where(eq(projects.id, doc.projectId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ])

  const typeLabel = TYPE_LABELS[doc.type as DocType] ?? "Document"
  const sizeLabel = formatBytes(doc.fileSizeBytes)

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back */}
      <Link
        href="/portal/documents"
        className="mb-6 flex items-center gap-1.5 text-sm text-white/35 transition-colors hover:text-white/60"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M19 12H5M12 19l-7-7 7-7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Documents
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white/95" style={{ letterSpacing: "-0.03em" }}>
            {doc.title}
          </h1>
          <p className="mt-0.5 text-sm text-white/35">{typeLabel}</p>
          {project && (
            <Link
              href={`/portal/projects/${project.id}`}
              className="mt-0.5 block text-sm text-white/35 transition-colors hover:text-white/55"
            >
              {project.name} →
            </Link>
          )}
        </div>
        <span
          className="mt-1 shrink-0 rounded-full px-3 py-1 text-xs font-medium"
          style={{
            color: statusColor(doc.status),
            background: statusBg(doc.status),
            border: `1px solid ${statusBorder(doc.status)}`,
          }}
        >
          {statusLabel(doc.status)}
        </span>
      </div>

      {/* Description */}
      {doc.description && (
        <p className="mb-6 text-sm leading-relaxed text-white/50">{doc.description}</p>
      )}

      {/* Image preview */}
      {isImage(doc.mimeType) && (
        <div
          className="mb-4 overflow-hidden rounded-[20px]"
          style={{ border: "1px solid rgba(255,255,255,0.10)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={doc.fileUrl}
            alt={doc.title}
            className="w-full object-cover"
            style={{ maxHeight: 480 }}
          />
        </div>
      )}

      {/* PDF inline viewer */}
      {isPdf(doc.mimeType) && (
        <div
          className="mb-4 overflow-hidden rounded-[20px]"
          style={{ border: "1px solid rgba(255,255,255,0.10)" }}
        >
          <iframe
            src={doc.fileUrl}
            title={doc.title}
            className="w-full"
            style={{ height: 520, background: "#111" }}
          />
        </div>
      )}

      {/* File info + download */}
      <div
        className="mb-4 flex items-center justify-between rounded-[20px] px-5 py-4"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-white/85">{doc.fileName}</span>
          <span className="text-xs text-white/35">
            {sizeLabel ?? ""}
            {sizeLabel && doc.mimeType ? " · " : ""}
            {doc.mimeType ?? ""}
          </span>
        </div>
        <a
          href={doc.fileUrl}
          download={doc.fileName}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-4 shrink-0 rounded-full px-4 py-2 text-xs font-medium text-white/80 transition-all hover:text-white/95"
          style={{
            background: "rgba(255,255,255,0.10)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          Download
        </a>
      </div>

      {/* Metadata tiles */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <InfoTile label="Added" value={new Date(doc.createdAt).toLocaleDateString("ro-RO")} />
        <InfoTile label="Updated" value={new Date(doc.updatedAt).toLocaleDateString("ro-RO")} />
        {doc.expiresAt && (
          <InfoTile label="Expires" value={new Date(doc.expiresAt).toLocaleDateString("ro-RO")} />
        )}
      </div>

      {/* Signatures */}
      {signatures.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-white/35">
            Signatures
          </p>
          <div
            className="overflow-hidden rounded-[20px]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {signatures.map((sig, i) => (
              <div
                key={sig.id}
                className="flex items-center justify-between px-5 py-4"
                style={{
                  borderTop: i > 0 ? "1px solid rgba(255,255,255,0.07)" : undefined,
                }}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-white/85">{sig.signerName}</span>
                  <span className="text-xs text-white/35">{sig.signerEmail}</span>
                </div>
                <div className="ml-4 flex shrink-0 flex-col items-end gap-0.5">
                  {sig.signedAt ? (
                    <>
                      <span className="text-[11px]" style={{ color: "rgba(140,255,140,0.75)" }}>
                        Signed
                      </span>
                      <span className="text-xs text-white/30">
                        {new Date(sig.signedAt).toLocaleDateString("ro-RO")}
                      </span>
                    </>
                  ) : (
                    <span className="text-[11px]" style={{ color: "rgba(255,220,100,0.75)" }}>
                      Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex flex-col gap-1 rounded-[16px] p-4"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <span className="text-[11px] text-white/35">{label}</span>
      <span className="text-sm font-medium text-white/85">{value}</span>
    </div>
  )
}
