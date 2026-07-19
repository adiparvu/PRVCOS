"use client"

import { useState } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

interface Message {
  id: string
  author: string
  staff: boolean
  body: string
  createdAt: string
}

function time(iso: string): string {
  return new Date(iso).toLocaleString("ro-RO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ProjectMessagesClient({ id }: { id: string }) {
  const qc = useQueryClient()
  const [text, setText] = useState("")
  const { data, isLoading } = useQuery<{ messages: Message[] }>({
    queryKey: ["project-messages", id],
    queryFn: () => fetch(`/api/projects/${id}/messages`).then((r) => r.json()),
  })
  const messages = data?.messages ?? []

  const send = useMutation({
    mutationFn: (body: string) =>
      fetch(`/api/projects/${id}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      }).then((r) => {
        if (!r.ok) throw new Error("Could not send message")
        return r.json()
      }),
    onSuccess: () => {
      setText("")
      void qc.invalidateQueries({ queryKey: ["project-messages", id] })
    },
  })

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px 120px" }}>
      <Link
        href={`/projects/${id}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--prv-text-2)",
          fontSize: 14,
          fontWeight: 500,
          textDecoration: "none",
          marginBottom: 18,
        }}
      >
        <svg
          width="9"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Project
      </Link>

      <h1 style={{ fontSize: 26, fontWeight: 640, letterSpacing: "-0.02em", margin: "0 0 6px" }}>
        Messages
      </h1>
      <p style={{ color: "var(--prv-text-3)", fontSize: 13.5, margin: "0 0 20px" }}>
        Conversation with the client on this project.
      </p>

      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 18,
          padding: 16,
        }}
      >
        {isLoading && (
          <p style={{ color: "var(--prv-text-3)", fontSize: 14, textAlign: "center", padding: 12 }}>
            Se încarcă…
          </p>
        )}
        {!isLoading && messages.length === 0 && (
          <p style={{ color: "var(--prv-text-3)", fontSize: 14, textAlign: "center", padding: 12 }}>
            No messages yet.
          </p>
        )}
        {messages.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: m.staff ? "flex-end" : "flex-start",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    maxWidth: "85%",
                    borderRadius: 16,
                    padding: "9px 13px",
                    background: m.staff ? "rgba(10,132,255,0.9)" : "var(--prv-g2)",
                    border: m.staff ? "none" : "1px solid var(--prv-border-subtle)",
                    color: m.staff ? "#fff" : "var(--prv-text-1)",
                  }}
                >
                  <p style={{ fontSize: 13.5, lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>
                    {m.body}
                  </p>
                </div>
                <span style={{ fontSize: 10.5, color: "var(--prv-text-3)", padding: "0 2px" }}>
                  {m.staff ? m.author : `${m.author} · client`} · {time(m.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginTop: 16 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Reply to the client…"
            rows={2}
            style={{
              flex: 1,
              boxSizing: "border-box",
              resize: "none",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14,
              padding: "10px 12px",
              color: "rgba(255,255,255,0.92)",
              fontSize: 13.5,
              fontFamily: "inherit",
            }}
          />
          <button
            type="button"
            disabled={send.isPending || text.trim() === ""}
            onClick={() => send.mutate(text.trim())}
            style={{
              flexShrink: 0,
              padding: "10px 18px",
              borderRadius: 12,
              border: 0,
              background: text.trim() === "" ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.92)",
              color: text.trim() === "" ? "rgba(255,255,255,0.4)" : "#000",
              fontSize: 13,
              fontWeight: 600,
              cursor: send.isPending || text.trim() === "" ? "default" : "pointer",
              opacity: send.isPending ? 0.6 : 1,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
