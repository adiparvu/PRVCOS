"use client"

import React, { useRef, useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type UploadStatus = "pending" | "uploading" | "complete" | "error"

export interface UploadFile {
  id: string
  name: string
  /** Size in bytes. */
  size: number
  status: UploadStatus
  /** Upload progress 0–100 (used when status is "uploading"). */
  progress?: number
  /** Error message shown when status is "error". */
  error?: string
}

export interface GlassFileUploadProps {
  /** The list of files to render. The parent owns upload + state. */
  files: UploadFile[]
  /** Called with the user-selected/dropped File list. */
  onAdd?: (files: File[]) => void
  /** Called with the id of a file the user removed. */
  onRemove?: (id: string) => void
  /** Native accept string, e.g. ".pdf,.png,image/*". */
  accept?: string
  /** Allow selecting more than one file. */
  multiple?: boolean
  /** Max size in bytes — shown in the hint text only (validation is the parent's job). */
  maxSize?: number
  title?: string
  subtitle?: string
  hint?: string
  /** Disable the dropzone entirely. */
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const val = bytes / Math.pow(1024, i)
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function extLabel(name: string): string {
  const dot = name.lastIndexOf(".")
  if (dot === -1 || dot === name.length - 1) return "FILE"
  return name
    .slice(dot + 1)
    .toUpperCase()
    .slice(0, 4)
}

function CloseIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassFileUpload({
  files,
  onAdd,
  onRemove,
  accept,
  multiple = true,
  maxSize,
  title = "Drop files here or click to browse",
  subtitle,
  hint,
  disabled = false,
  className,
  style,
}: GlassFileUploadProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const emitFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return
    onAdd?.(Array.from(list))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    emitFiles(e.dataTransfer.files)
  }

  const sizeHint = subtitle ?? (maxSize ? `Up to ${formatBytes(maxSize)} per file` : undefined)

  return (
    <div
      className={clsx(className)}
      style={{ padding: 20, width: 420, maxWidth: "100%", ...style }}
    >
      {/* Hidden native input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        style={{ display: "none" }}
        onChange={(e) => {
          emitFiles(e.target.files)
          e.target.value = ""
        }}
      />

      {/* Dropzone */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragging(false)
        }}
        onDrop={handleDrop}
        style={{
          border: `1.5px dashed ${dragging ? "var(--prv-accent, rgba(10,132,255,0.9))" : "var(--prv-border)"}`,
          borderRadius: 16,
          padding: "34px 20px",
          textAlign: "center",
          cursor: disabled ? "default" : "pointer",
          background: dragging ? "var(--prv-g2)" : "var(--prv-g1)",
          opacity: disabled ? 0.5 : 1,
          transition: "background 160ms, border-color 160ms",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            margin: "0 auto 12px",
            background: "var(--prv-g2)",
            border: "1px solid var(--prv-border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--prv-text-2)",
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--prv-text-1)" }}>{title}</div>
        {sizeHint && (
          <div style={{ fontSize: 12, color: "var(--prv-text-3)", marginTop: 4 }}>{sizeHint}</div>
        )}
        {hint && (
          <div style={{ fontSize: 11, color: "var(--prv-text-4)", marginTop: 8 }}>{hint}</div>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div
          style={{
            marginTop: 16,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {files.map((file) => (
            <FileRow key={file.id} file={file} onRemove={onRemove} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── File row ──────────────────────────────────────────────────────────────────

function FileRow({ file, onRemove }: { file: UploadFile; onRemove?: (id: string) => void }) {
  const isError = file.status === "error"
  const isComplete = file.status === "complete"
  const isUploading = file.status === "uploading"
  const progress = Math.max(0, Math.min(100, file.progress ?? 0))

  let metaNode: React.ReactNode
  if (isError) {
    metaNode = <span style={{ color: "rgba(255,59,48,0.9)" }}>{file.error ?? "Upload failed"}</span>
  } else if (isComplete) {
    metaNode = <span style={{ color: "rgba(48,209,88,0.9)" }}>Uploaded</span>
  } else if (isUploading) {
    metaNode = <span>Uploading {Math.floor(progress)}%</span>
  } else {
    metaNode = <span>Pending</span>
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 12px",
        borderRadius: 12,
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        position: "relative",
      }}
    >
      {/* Top specular edge */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "0 0 auto",
          height: 1,
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent)",
          pointerEvents: "none",
        }}
      />

      {/* Type icon */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          background: "var(--prv-g2)",
          border: "1px solid var(--prv-border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--prv-text-2)",
          flexShrink: 0,
          fontSize: 10,
          fontWeight: 700,
        }}
      >
        {extLabel(file.name)}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--prv-text-1)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {file.name}
        </div>
        <div style={{ fontSize: 11, color: "var(--prv-text-3)", marginTop: 2 }}>
          {formatBytes(file.size)} · {metaNode}
        </div>

        {isUploading && (
          <div
            style={{
              height: 4,
              borderRadius: 100,
              background: "var(--prv-g2)",
              marginTop: 7,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                borderRadius: 100,
                background: "var(--prv-accent, rgba(10,132,255,0.9))",
                transition: "width 400ms cubic-bezier(0.4,0,0.2,1)",
              }}
            />
          </div>
        )}
      </div>

      {/* Remove */}
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${file.name}`}
          onClick={() => onRemove(file.id)}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "var(--prv-g2)",
            border: "1px solid var(--prv-border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--prv-text-3)",
            cursor: "pointer",
            flexShrink: 0,
            transition: "background 150ms, color 150ms",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = "rgba(255,59,48,0.12)"
            el.style.color = "rgba(255,59,48,0.9)"
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = "var(--prv-g2)"
            el.style.color = "var(--prv-text-3)"
          }}
        >
          <CloseIcon />
        </button>
      )}
    </div>
  )
}
