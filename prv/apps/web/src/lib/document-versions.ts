// Phase 12.2 — Document file version control (pure logic).
//
// Model: the live file always sits on the `documents` row with a `versionNumber`.
// Replacing the file snapshots the current live file into `document_versions` at
// its current number, then writes the new file to the row and bumps the number.
// Restoring an old version snapshots the current live file too, then copies the
// chosen historical file onto the row under a NEW (incremented) number — an old
// number is never reused, so the chain stays append-only and auditable.

export interface LiveFile {
  versionNumber: number
  fileUrl: string
  fileName: string
  fileSizeBytes: string | null
  mimeType: string | null
  legalHold: boolean
}

export interface FileUpload {
  fileUrl: string
  fileName: string
  fileSizeBytes?: string | null
  mimeType?: string | null
  changeNote?: string | null
}

export interface VersionSnapshot {
  version: number
  fileUrl: string
  fileName: string
  fileSizeBytes: string | null
  mimeType: string | null
}

export interface HistoricalVersion {
  version: number
  fileUrl: string
  fileName: string
  fileSizeBytes: string | null
  mimeType: string | null
}

export interface LiveFileFields {
  fileUrl: string
  fileName: string
  fileSizeBytes: string | null
  mimeType: string | null
  versionNumber: number
}

// The next version number in the chain. Guards against a corrupt/zero counter so
// a fresh document (implicitly v1) still advances to v2 rather than to 1.
export function nextVersion(current: number): number {
  const base = Number.isFinite(current) && current >= 1 ? Math.floor(current) : 1
  return base + 1
}

// The row to archive the current live file into document_versions before it is
// overwritten. Captures the file exactly as it stands at its current number.
export function snapshotFromLive(doc: LiveFile): VersionSnapshot {
  return {
    version: doc.versionNumber,
    fileUrl: doc.fileUrl,
    fileName: doc.fileName,
    fileSizeBytes: doc.fileSizeBytes,
    mimeType: doc.mimeType,
  }
}

// The new live-file fields when a fresh file is uploaded as the next version.
export function liveFromUpload(doc: LiveFile, upload: FileUpload): LiveFileFields {
  return {
    fileUrl: upload.fileUrl,
    fileName: upload.fileName,
    fileSizeBytes: upload.fileSizeBytes ?? null,
    mimeType: upload.mimeType ?? null,
    versionNumber: nextVersion(doc.versionNumber),
  }
}

// The new live-file fields when an old version is restored: the chosen historical
// file is promoted onto the row, but under a NEW number (never the old one).
export function liveFromRestore(doc: LiveFile, chosen: HistoricalVersion): LiveFileFields {
  return {
    fileUrl: chosen.fileUrl,
    fileName: chosen.fileName,
    fileSizeBytes: chosen.fileSizeBytes,
    mimeType: chosen.mimeType,
    versionNumber: nextVersion(doc.versionNumber),
  }
}

// Whether the document's file may be replaced/restored. Legal hold freezes the
// live file: altering a document under hold would break its chain of custody,
// which is exactly what legal hold exists to prevent.
export function canMutateVersions(doc: Pick<LiveFile, "legalHold">): {
  ok: boolean
  reason?: string
} {
  if (doc.legalHold) {
    return { ok: false, reason: "Document is under legal hold and cannot be modified" }
  }
  return { ok: true }
}

// A human label for a version number, e.g. 3 → "v3".
export function versionLabel(version: number): string {
  return `v${version}`
}
