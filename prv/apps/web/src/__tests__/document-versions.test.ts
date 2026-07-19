import { describe, it, expect } from "vitest"
import {
  nextVersion,
  snapshotFromLive,
  liveFromUpload,
  liveFromRestore,
  canMutateVersions,
  versionLabel,
  type LiveFile,
} from "@/lib/document-versions"

const liveDoc: LiveFile = {
  versionNumber: 3,
  fileUrl: "https://store/live-v3.pdf",
  fileName: "contract-v3.pdf",
  fileSizeBytes: "2048",
  mimeType: "application/pdf",
  legalHold: false,
}

describe("nextVersion", () => {
  it("increments the current number", () => {
    expect(nextVersion(1)).toBe(2)
    expect(nextVersion(3)).toBe(4)
  })
  it("treats a corrupt/zero/negative counter as v1 and advances to v2", () => {
    expect(nextVersion(0)).toBe(2)
    expect(nextVersion(-5)).toBe(2)
    expect(nextVersion(Number.NaN)).toBe(2)
  })
  it("floors a fractional counter before incrementing", () => {
    expect(nextVersion(2.9)).toBe(3)
  })
})

describe("snapshotFromLive", () => {
  it("captures the live file at its current version number", () => {
    expect(snapshotFromLive(liveDoc)).toEqual({
      version: 3,
      fileUrl: "https://store/live-v3.pdf",
      fileName: "contract-v3.pdf",
      fileSizeBytes: "2048",
      mimeType: "application/pdf",
    })
  })
})

describe("liveFromUpload", () => {
  it("promotes the new file and bumps the version number", () => {
    const next = liveFromUpload(liveDoc, {
      fileUrl: "https://store/live-v4.pdf",
      fileName: "contract-v4.pdf",
      fileSizeBytes: "3000",
      mimeType: "application/pdf",
    })
    expect(next).toEqual({
      fileUrl: "https://store/live-v4.pdf",
      fileName: "contract-v4.pdf",
      fileSizeBytes: "3000",
      mimeType: "application/pdf",
      versionNumber: 4,
    })
  })
  it("defaults missing size/mime to null", () => {
    const next = liveFromUpload(liveDoc, {
      fileUrl: "u",
      fileName: "f.pdf",
    })
    expect(next.fileSizeBytes).toBeNull()
    expect(next.mimeType).toBeNull()
    expect(next.versionNumber).toBe(4)
  })
})

describe("liveFromRestore", () => {
  it("copies the chosen historical file onto the row under a NEW number, never reusing the old one", () => {
    const restored = liveFromRestore(liveDoc, {
      version: 1,
      fileUrl: "https://store/live-v1.pdf",
      fileName: "contract-v1.pdf",
      fileSizeBytes: "1000",
      mimeType: "application/pdf",
    })
    expect(restored.fileUrl).toBe("https://store/live-v1.pdf")
    expect(restored.fileName).toBe("contract-v1.pdf")
    // restored file content is v1, but it becomes version 4 (3 + 1) — not 1
    expect(restored.versionNumber).toBe(4)
  })
})

describe("canMutateVersions", () => {
  it("allows mutation when not on legal hold", () => {
    expect(canMutateVersions({ legalHold: false })).toEqual({ ok: true })
  })
  it("blocks mutation under legal hold with a reason", () => {
    const res = canMutateVersions({ legalHold: true })
    expect(res.ok).toBe(false)
    expect(res.reason).toMatch(/legal hold/i)
  })
})

describe("versionLabel", () => {
  it("prefixes the number with v", () => {
    expect(versionLabel(1)).toBe("v1")
    expect(versionLabel(12)).toBe("v12")
  })
})
