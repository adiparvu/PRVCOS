"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string
  agentType: string
  title: string
  messageCount: number
  updatedAt: string
}

interface Anomaly {
  type: "risk" | "spike" | "opportunity"
  severity: "high" | "medium" | "low"
  domain: string
  title: string
  description: string
  metric: string
  actionLabel: string
  href: string
}

// ── Design helpers ─────────────────────────────────────────────────────────────

function GlassCard({
  children,
  className = "",
  style,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
}) {
  return (
    <div
      className={`rounded-[18px] relative overflow-hidden ${className}`}
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
      onClick={onClick}
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)",
        }}
      />
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[.1em] text-white/30 mx-1 mt-5 mb-2">
      {children}
    </p>
  )
}

function AgentBadge({ agentType }: { agentType: string }) {
  const labels: Record<string, string> = {
    general: "General",
    finance: "Finance",
    hr: "HR",
    project: "Projects",
    renovation: "Renovation",
    report_builder: "Report Builder",
  }
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-[.08em] px-2 py-0.5 rounded-[100px] text-white/50"
      style={{
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {labels[agentType] ?? agentType}
    </span>
  )
}

// ── Agent config ───────────────────────────────────────────────────────────────

const AGENTS = [
  { value: "all", label: "All" },
  { value: "general", label: "General" },
  { value: "finance", label: "Finance" },
  { value: "hr", label: "HR" },
  { value: "project", label: "Projects" },
  { value: "renovation", label: "Renovation" },
  { value: "report_builder", label: "Report Builder" },
]

const ANOMALY_STYLE = {
  risk: {
    bg: "rgba(255,69,58,0.07)",
    border: "rgba(255,69,58,0.14)",
    typeColor: "rgba(255,69,58,0.8)",
    prefix: "⚠ Risk",
  },
  spike: {
    bg: "rgba(255,159,10,0.07)",
    border: "rgba(255,159,10,0.14)",
    typeColor: "rgba(255,159,10,0.8)",
    prefix: "↑ Spike",
  },
  opportunity: {
    bg: "rgba(48,209,88,0.07)",
    border: "rgba(48,209,88,0.14)",
    typeColor: "rgba(48,209,88,0.8)",
    prefix: "✓ Opportunity",
  },
}

// ── Relative time ──────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Signals inline (collapsed) ─────────────────────────────────────────────────

function SignalsInline() {
  const router = useRouter()
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch("/api/intelligence/anomalies")
      .then((r) => r.json())
      .then((d) => {
        setAnomalies((d.anomalies ?? []).slice(0, 3))
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  if (!anomalies.length) {
    return <p className="text-[12px] text-white/35 text-center py-4">No signals detected</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {anomalies.map((a, i) => {
        const s = ANOMALY_STYLE[a.type]
        return (
          <button
            key={i}
            onClick={() => router.push(a.href)}
            className="w-full flex items-start gap-2.5 p-3 rounded-[13px] text-left"
            style={{ background: s.bg, border: `1px solid ${s.border}` }}
          >
            <div className="flex-1 min-w-0">
              <p
                className="text-[9px] font-bold uppercase tracking-[.1em] mb-0.5"
                style={{ color: s.typeColor }}
              >
                {s.prefix} · {a.domain}
              </p>
              <p className="text-[12px] font-semibold text-white/80 leading-tight truncate">
                {a.title}
              </p>
              <p className="text-[11px] font-bold mt-1" style={{ color: s.typeColor }}>
                {a.metric}
              </p>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white/25 flex-shrink-0 mt-0.5"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )
      })}
    </div>
  )
}

// ── Root Client ───────────────────────────────────────────────────────────────

export function AIBriefingClient({ role: _role }: { role: string }) {
  const router = useRouter()
  const [selectedAgent, setSelectedAgent] = useState("all")
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [convsLoaded, setConvsLoaded] = useState(false)
  const agentScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/intelligence/conversations")
      .then((r) => r.json())
      .then((d) => {
        setConversations(d.conversations ?? d ?? [])
        setConvsLoaded(true)
      })
      .catch(() => setConvsLoaded(true))
  }, [])

  const filteredConvs =
    selectedAgent === "all"
      ? conversations.slice(0, 5)
      : conversations.filter((c) => c.agentType === selectedAgent).slice(0, 5)

  function startConversation(agentType: string) {
    router.push(`/intelligence/ai/${agentType}`)
  }

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-white/35 text-[13px] font-medium mb-0.5">Intelligence</p>
          <h1 className="text-white/92 text-[26px] font-bold tracking-tight leading-tight">
            AI Assistant
          </h1>
          <p className="text-white/40 text-[12px] mt-0.5">6 specialized agents</p>
        </div>
        <button
          onClick={() => router.push("/intelligence/ai/general")}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12px] font-semibold"
          style={{ background: "rgba(255,255,255,0.92)", color: "#000" }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Agent selector */}
      <div
        ref={agentScrollRef}
        className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1"
        style={{ scrollbarWidth: "none" }}
      >
        {AGENTS.map((agent) => {
          const selected = selectedAgent === agent.value
          return (
            <button
              key={agent.value}
              onClick={() => setSelectedAgent(agent.value)}
              className="flex-shrink-0 px-3.5 py-2 rounded-[100px] text-[12px] font-semibold whitespace-nowrap transition-all"
              style={
                selected
                  ? { background: "rgba(255,255,255,0.92)", color: "#000" }
                  : {
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.6)",
                    }
              }
            >
              {agent.label}
            </button>
          )
        })}
      </div>

      {/* Recent Conversations */}
      <SectionLabel>Recent Conversations</SectionLabel>
      <GlassCard className="mb-1" style={{ padding: "8px" }}>
        {!convsLoaded ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : filteredConvs.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="text-[12px] text-white/35">No conversations yet</p>
            <button
              onClick={() => startConversation(selectedAgent === "all" ? "general" : selectedAgent)}
              className="mt-2 text-[12px] font-semibold text-white/55 underline"
            >
              Start one
            </button>
          </div>
        ) : (
          filteredConvs.map((conv, i) => (
            <button
              key={conv.id}
              onClick={() => router.push(`/intelligence/ai/${conv.agentType}/${conv.id}`)}
              className="w-full flex items-center gap-3 p-3 rounded-[12px] text-left hover:bg-white/5 transition-colors"
              style={{ marginBottom: i < filteredConvs.length - 1 ? "4px" : 0 }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <AgentBadge agentType={conv.agentType} />
                </div>
                <p className="text-[13px] font-semibold text-white/88 leading-tight truncate">
                  {conv.title}
                </p>
                <p className="text-[10px] text-white/35 mt-0.5">
                  {conv.messageCount} message{conv.messageCount !== 1 ? "s" : ""} ·{" "}
                  {relativeTime(conv.updatedAt)}
                </p>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white/25 flex-shrink-0"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))
        )}
      </GlassCard>
      <button
        onClick={() => router.push("/intelligence/ai/general")}
        className="w-full text-center text-[12px] text-white/40 py-2 mb-1 hover:text-white/60 transition-colors"
      >
        View all conversations →
      </button>

      {/* Quick Actions */}
      <SectionLabel>Quick Actions</SectionLabel>
      <div className="grid grid-cols-2 gap-2.5 mb-1">
        {[
          {
            title: "Morning Briefing",
            subtitle: "60-second business overview",
            icon: "☀",
            href: "/intelligence/ai/briefing",
          },
          {
            title: "Build a Report",
            subtitle: "AI-powered report generation",
            icon: "◈",
            href: "/intelligence/ai/report-builder",
          },
          {
            title: "Ask Finance AI",
            subtitle: "Revenue, costs & cash flow",
            icon: "€",
            href: null,
            agentType: "finance",
          },
          {
            title: "Project Status",
            subtitle: "Milestones, risks & blockers",
            icon: "◎",
            href: null,
            agentType: "project",
          },
        ].map((action) => (
          <button
            key={action.title}
            onClick={() =>
              action.href ? router.push(action.href) : startConversation(action.agentType!)
            }
            className="flex flex-col items-start gap-2 p-3.5 rounded-[18px] text-left relative overflow-hidden"
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)",
              }}
            />
            <div
              className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[16px]"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              {action.icon}
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white/88 leading-tight">
                {action.title}
              </p>
              <p className="text-[10px] text-white/40 mt-0.5 leading-snug">{action.subtitle}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Intelligence: Signals */}
      <SectionLabel>Intelligence · Signals</SectionLabel>
      <SignalsInline />

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.65)} }
      `}</style>
    </div>
  )
}
