"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

// ── Types ──────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: "user" | "ai"
  text: string
  streaming?: boolean
  complete?: boolean
  feedback?: "up" | "down" | null
}

// ── Agent config ───────────────────────────────────────────────────────────────

const AGENT_CONFIG: Record<string, { label: string; description: string; queries: string[] }> = {
  general: {
    label: "General",
    description: "Business overview & analysis",
    queries: [
      "What's our performance this week?",
      "Show company summary",
      "Any critical issues today?",
    ],
  },
  finance: {
    label: "Finance",
    description: "Revenue, costs & cash flow",
    queries: ["What's our cash position?", "Show overdue invoices", "Revenue vs last month?"],
  },
  hr: {
    label: "HR",
    description: "People, payroll & attendance",
    queries: ["Who's absent today?", "Next payroll run?", "Show leave requests"],
  },
  project: {
    label: "Projects",
    description: "Status, milestones & risks",
    queries: ["Overdue projects?", "Budget burn rate?", "Any blockers this week?"],
  },
  renovation: {
    label: "Renovation",
    description: "Jobs, phases & client approvals",
    queries: ["Active renovation jobs?", "Any phase overruns?", "Pending client sign-offs?"],
  },
  report_builder: {
    label: "Report Builder",
    description: "Generate business reports",
    queries: [
      "Revenue by store last quarter",
      "Attendance summary this month",
      "Top 10 clients by revenue",
    ],
  },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

let msgCounter = 0
function newId() {
  return `msg-${++msgCounter}`
}

// ── Root Client ────────────────────────────────────────────────────────────────

export function AgentChatClient({ agentType, role: _role }: { agentType: string; role: string }) {
  const router = useRouter()
  const config = AGENT_CONFIG[agentType] ?? AGENT_CONFIG.general!
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = useCallback(
    async (q: string) => {
      const question = q.trim()
      if (!question || busy) return
      setInput("")
      setBusy(true)

      const userMsg: ChatMessage = { id: newId(), role: "user", text: question }
      const aiId = newId()
      const aiMsg: ChatMessage = {
        id: aiId,
        role: "ai",
        text: "",
        streaming: true,
        complete: false,
        feedback: null,
      }

      setMessages((prev) => [...prev, userMsg, aiMsg])

      try {
        const res = await fetch("/api/intelligence/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: question,
            conversationId,
            agentType,
          }),
        })

        const newConvId = res.headers.get("X-Conversation-Id")
        if (newConvId && !conversationId) setConversationId(newConvId)

        if (!res.ok || !res.body) throw new Error("failed")

        const reader = res.body.getReader()
        const dec = new TextDecoder()
        let full = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          full += dec.decode(value, { stream: true })
          setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, text: full } : m)))
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId ? { ...m, text: full, streaming: false, complete: true } : m
          )
        )
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? {
                  ...m,
                  text: "Unable to get a response. Please try again.",
                  streaming: false,
                  complete: true,
                }
              : m
          )
        )
      } finally {
        setBusy(false)
        inputRef.current?.focus()
      }
    },
    [busy, conversationId, agentType]
  )

  const sendFeedback = useCallback(async (messageId: string, rating: "up" | "down") => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, feedback: rating } : m)))
    try {
      await fetch("/api/intelligence/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, rating }),
      })
    } catch {
      // silent
    }
  }, [])

  const empty = messages.length === 0

  return (
    <div className="flex flex-col pt-14 pb-28 max-w-2xl mx-auto" style={{ minHeight: "100dvh" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 sticky top-14 z-10"
        style={{
          background: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white/60"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-white/92 leading-tight">{config.label} AI</p>
          <p className="text-[11px] text-white/40 truncate">{config.description}</p>
        </div>

        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] flex-shrink-0"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "rgba(48,209,88,0.9)",
              animation: "pulse 1.8s ease-in-out infinite",
            }}
          />
          <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wide">
            PRV AI
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 px-4 py-4">
        {empty ? (
          <div className="flex flex-col gap-3 mt-4">
            <div className="text-center mb-2">
              <p className="text-[22px] font-bold text-white/88 tracking-tight">
                {config.label} AI
              </p>
              <p className="text-[13px] text-white/40 mt-1">{config.description}</p>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[.1em] text-white/25 mx-1 mt-3 mb-1">
              Suggested
            </p>
            {config.queries.map((q) => (
              <button
                key={q}
                onClick={() => void send(q)}
                className="flex items-center gap-2.5 px-3.5 py-3 rounded-[14px] text-left"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.09)",
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white/25 flex-shrink-0"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
                <span className="text-[13px] text-white/60">{q}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg) =>
              msg.role === "user" ? (
                <div key={msg.id} className="flex justify-end">
                  <div
                    className="max-w-[80%] px-3.5 py-2.5 rounded-[14px_14px_3px_14px] text-[13px] font-medium text-white/90 leading-relaxed"
                    style={{
                      background: "rgba(255,255,255,0.12)",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex flex-col items-start gap-1.5 max-w-[92%]">
                  <div
                    className="w-full px-3.5 py-3 rounded-[3px_14px_14px_14px]"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-[9px] font-bold uppercase tracking-[.1em] text-white/30">
                        PRV AI · {config.label}
                      </p>
                      {msg.streaming && (
                        <div className="flex gap-0.5">
                          {[0, 1, 2].map((d) => (
                            <div
                              key={d}
                              className="w-1 h-1 rounded-full bg-white/40"
                              style={{
                                animation: `bounce 0.9s ease-in-out ${d * 0.15}s infinite`,
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-[13px] text-white/70 leading-relaxed whitespace-pre-line">
                      {msg.text}
                    </p>
                  </div>
                  {msg.complete && (
                    <div className="flex items-center gap-1.5 px-1">
                      <button
                        onClick={() => void sendFeedback(msg.id, "up")}
                        className="flex items-center justify-center w-6 h-6 rounded-[7px] transition-colors"
                        style={{
                          background:
                            msg.feedback === "up"
                              ? "rgba(48,209,88,0.18)"
                              : "rgba(255,255,255,0.06)",
                          border:
                            msg.feedback === "up"
                              ? "1px solid rgba(48,209,88,0.3)"
                              : "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <span className="text-[11px]">👍</span>
                      </button>
                      <button
                        onClick={() => void sendFeedback(msg.id, "down")}
                        className="flex items-center justify-center w-6 h-6 rounded-[7px] transition-colors"
                        style={{
                          background:
                            msg.feedback === "down"
                              ? "rgba(255,69,58,0.18)"
                              : "rgba(255,255,255,0.06)",
                          border:
                            msg.feedback === "down"
                              ? "1px solid rgba(255,69,58,0.3)"
                              : "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <span className="text-[11px]">👎</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div
        className="fixed bottom-20 left-0 right-0 px-4 z-20"
        style={{ maxWidth: "672px", margin: "0 auto" }}
      >
        <div
          className="flex items-end gap-2.5 px-3.5 py-2.5 rounded-[20px]"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
        >
          <textarea
            ref={inputRef}
            className="flex-1 bg-transparent text-[13px] text-white/80 placeholder-white/25 outline-none resize-none leading-relaxed"
            placeholder={`Ask ${config.label} AI…`}
            value={input}
            rows={1}
            style={{ maxHeight: "120px" }}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = "auto"
              e.target.style.height = `${e.target.scrollHeight}px`
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void send(input)
              }
            }}
            disabled={busy}
          />
          <button
            onClick={() => void send(input)}
            disabled={busy || !input.trim()}
            className="w-7 h-7 rounded-[10px] flex items-center justify-center flex-shrink-0 transition-opacity"
            style={{
              background:
                busy || !input.trim() ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.92)",
              opacity: busy || !input.trim() ? 0.5 : 1,
            }}
          >
            {busy ? (
              <div className="w-3 h-3 border-2 border-black/30 border-t-black/70 rounded-full animate-spin" />
            ) : (
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke={input.trim() ? "#000" : "rgba(255,255,255,0.5)"}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.65)} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
      `}</style>
    </div>
  )
}
