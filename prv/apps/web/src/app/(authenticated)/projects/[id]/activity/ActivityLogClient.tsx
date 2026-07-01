"use client"

import { useState } from "react"
import Link from "next/link"
import { useProjectActivity, usePostProjectComment, type ActivityEntry } from "@/lib/api-hooks"

function KindIcon({ kind }: { kind: string }) {
  const paths: Record<string, React.ReactNode> = {
    task: (
      <>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </>
    ),
    status: (
      <>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </>
    ),
    risk: (
      <>
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      </>
    ),
    budget: (
      <>
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
      </>
    ),
    comment: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
    member: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </>
    ),
    milestone: (
      <>
        <path d="M4 22V4l14 4-14 4" />
      </>
    ),
    document: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </>
    ),
    general: <circle cx="12" cy="12" r="8" />,
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="15"
      height="15"
      aria-hidden="true"
    >
      {paths[kind] ?? paths.general}
    </svg>
  )
}

function relTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const s = Math.max(0, Math.round((now - then) / 1000))
  if (s < 60) return "just now"
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

function EventRow({ entry }: { entry: ActivityEntry }) {
  return (
    <div style={{ position: "relative", paddingBottom: 20 }}>
      <div
        style={{
          position: "absolute",
          left: -30,
          top: 0,
          width: 34,
          height: 34,
          borderRadius: 10,
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          display: "grid",
          placeItems: "center",
          color: "var(--prv-text-2)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
        }}
      >
        <KindIcon kind={entry.kind} />
      </div>
      <div style={{ paddingTop: 2 }}>
        <div style={{ fontSize: 13.5, color: "var(--prv-text-1)", lineHeight: 1.4 }}>
          {entry.actorName && <b style={{ fontWeight: 660 }}>{entry.actorName} </b>}
          {entry.kind === "comment" ? "commented" : entry.summary}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--prv-text-3)",
            marginTop: 3,
            textTransform: "capitalize",
          }}
        >
          {relTime(entry.createdAt)} · {entry.kind}
        </div>
        {entry.kind === "comment" && (
          <div
            style={{
              marginTop: 7,
              fontSize: 13,
              color: "var(--prv-text-2)",
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 12,
              padding: "9px 12px",
              lineHeight: 1.45,
            }}
          >
            {entry.summary}
          </div>
        )}
      </div>
    </div>
  )
}

export function ActivityLogClient({ id }: { id: string }) {
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useProjectActivity(id)
  const post = usePostProjectComment(id)
  const [comment, setComment] = useState("")

  const entries = data?.pages.flatMap((p) => p.entries) ?? []

  function submit() {
    const text = comment.trim()
    if (!text) return
    post.mutate(text, { onSuccess: () => setComment("") })
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "8px 4px 60px" }}>
      <Link
        href={`/projects/${id}`}
        style={{
          fontSize: 12.5,
          color: "var(--prv-text-3)",
          textDecoration: "none",
          display: "inline-flex",
          gap: 5,
          marginBottom: 12,
        }}
      >
        ‹ Back to project
      </Link>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--prv-text-3)",
        }}
      >
        Project · Activity
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 680, letterSpacing: "-0.02em", margin: "3px 0 22px" }}>
        Activity Log
      </h1>

      <div
        style={{
          borderRadius: 18,
          padding: "12px 14px",
          display: "flex",
          gap: 11,
          alignItems: "center",
          marginBottom: 24,
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
        }}
      >
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit()
          }}
          placeholder="Write a comment…"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--prv-text-1)",
            fontSize: 14,
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={submit}
          disabled={!comment.trim() || post.isPending}
          style={{
            padding: "7px 15px",
            borderRadius: 100,
            background: "rgba(255,255,255,0.92)",
            color: "#000",
            border: "none",
            fontSize: 12.5,
            fontWeight: 640,
            cursor: comment.trim() ? "pointer" : "default",
            opacity: comment.trim() && !post.isPending ? 1 : 0.5,
          }}
        >
          Post
        </button>
      </div>

      {isLoading ? (
        <p style={{ padding: "40px 20px", color: "var(--prv-text-4)" }}>Loading activity…</p>
      ) : entries.length === 0 ? (
        <p
          style={{
            padding: "40px 20px",
            textAlign: "center",
            color: "var(--prv-text-4)",
            fontSize: 14,
          }}
        >
          No activity yet. Task, risk and budget changes will appear here, along with comments.
        </p>
      ) : (
        <>
          <div style={{ position: "relative", paddingLeft: 38 }}>
            <div
              style={{
                position: "absolute",
                left: 16,
                top: 6,
                bottom: 6,
                width: 1,
                background: "var(--prv-border-subtle)",
              }}
            />
            {entries.map((e) => (
              <EventRow key={e.id} entry={e} />
            ))}
          </div>
          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              style={{
                marginTop: 8,
                padding: "9px 16px",
                borderRadius: 100,
                background: "var(--prv-g1)",
                border: "1px solid var(--prv-border)",
                color: "var(--prv-text-2)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {isFetchingNextPage ? "Loading…" : "Load older activity"}
            </button>
          )}
        </>
      )}
    </div>
  )
}
