import { StorageBucket, getSignedUrl } from "@prv/db/storage"

// Client-facing document URLs.
//
// The `documents` bucket is PRIVATE — it holds signed contracts, identity
// documents and other client paperwork, so an unauthenticated public URL is
// not an acceptable access control. Objects we uploaded ourselves record
// their storage path in documents.metadata.storagePath; those are served
// through short-lived signed URLs instead.
//
// Rows created by the legacy staff flow store an arbitrary externally hosted
// URL in fileUrl with no storagePath — those pass through unchanged.

const SIGNED_URL_TTL_SECONDS = 60 * 15

/** Extract the storage path recorded at upload time, if any. */
export function storagePathOf(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null
  const path = (metadata as Record<string, unknown>)["storagePath"]
  return typeof path === "string" && path.length > 0 ? path : null
}

/**
 * Resolve the URL a client should be given for a document. Signs private
 * storage objects; passes external URLs through. Never throws — a signing
 * failure degrades to the stored value rather than breaking the page.
 */
export async function resolveDocumentUrl(fileUrl: string, metadata: unknown): Promise<string> {
  const path = storagePathOf(metadata)
  if (!path) return fileUrl
  try {
    return await getSignedUrl(StorageBucket.DOCUMENTS, path, SIGNED_URL_TTL_SECONDS)
  } catch (err) {
    console.error("[document-url] signing failed, falling back to stored url:", err)
    return fileUrl
  }
}

/** Batch variant — resolves in parallel, preserving order. */
export async function resolveDocumentUrls<T extends { fileUrl: string; metadata?: unknown }>(
  rows: T[]
): Promise<string[]> {
  return Promise.all(rows.map((r) => resolveDocumentUrl(r.fileUrl, r.metadata)))
}
