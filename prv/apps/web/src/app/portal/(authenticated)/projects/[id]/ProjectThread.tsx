"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

interface Message {
  id: string
  author: string
  staff: boolean
  mine: boolean
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

export function ProjectThread({ projectId }: { projectId: string }) {
  const qc = useQueryClient()
  const [text, setText] = useState("")
  const { data } = useQuery<{ messages: Message[] }>({
    queryKey: ["portal-project-messages", projectId],
    queryFn: () => fetch(`/api/portal/projects/${projectId}/messages`).then((r) => r.json()),
  })
  const messages = data?.messages ?? []

  const send = useMutation({
    mutationFn: (body: string) =>
      fetch(`/api/portal/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      }).then((r) => {
        if (!r.ok) throw new Error("Could not send message")
        return r.json()
      }),
    onSuccess: () => {
      setText("")
      void qc.invalidateQueries({ queryKey: ["portal-project-messages", projectId] })
    },
  })

  return (
    <div className="mt-6">
      <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-white/35">
        Messages
      </p>
      <div
        className="rounded-[20px] p-4"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {messages.length === 0 ? (
          <p className="py-4 text-center text-sm text-white/35">
            No messages yet. Ask a question about your project.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col gap-1 ${m.mine ? "items-end" : "items-start"}`}
              >
                <div
                  className="max-w-[85%] rounded-2xl px-3.5 py-2.5"
                  style={{
                    background: m.mine ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.06)",
                    border: m.mine ? "none" : "1px solid rgba(255,255,255,0.10)",
                    color: m.mine ? "#000" : "rgba(255,255,255,0.90)",
                  }}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                </div>
                <span className="px-1 text-[10.5px] text-white/30">
                  {m.mine ? "You" : m.author} · {time(m.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a message…"
            rows={2}
            className="flex-1 resize-none rounded-2xl px-3.5 py-2.5 text-sm text-white/90 outline-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          />
          <button
            type="button"
            disabled={send.isPending || text.trim() === ""}
            onClick={() => send.mutate(text.trim())}
            className="shrink-0 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all"
            style={{
              background: text.trim() === "" ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.92)",
              color: text.trim() === "" ? "rgba(255,255,255,0.40)" : "#000",
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
