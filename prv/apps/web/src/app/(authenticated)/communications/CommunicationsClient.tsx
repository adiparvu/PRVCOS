"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

// ─── Types ─────────────────────────────────────────────────────────────────

type Tab = "dms" | "channels" | "announcements"
type View = "list" | "thread" | "announcement"

interface Participant {
  conversationId: string
  userId: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  jobTitle: string | null
}

interface DMConversation {
  id: string
  lastMessageAt: string | null
  lastMessagePreview: string | null
  createdAt: string
  participants: Participant[]
}

interface Channel {
  id: string
  name: string
  description: string | null
  type: "public" | "private" | "announcement"
  isArchived: boolean
  lastMessageAt: string | null
  lastMessagePreview: string | null
  createdAt: string
}

interface Announcement {
  id: string
  title: string
  body: string
  audience: string
  isPinned: boolean
  publishedAt: string | null
  readCount: number
  totalAudience: number | null
  createdAt: string
  isRead: boolean
  authorId: string | null
  authorFirstName: string | null
  authorLastName: string | null
  authorAvatarUrl: string | null
}

interface Message {
  id: string
  content: string
  type: string
  parentId?: string | null
  threadCount?: number
  editedAt: string | null
  createdAt: string
  authorId: string | null
  authorFirstName: string | null
  authorLastName: string | null
  authorAvatarUrl: string | null
  authorJobTitle?: string | null
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmtTime(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })
  if (diffDays === 1) return "Ieri"
  if (diffDays < 7) return d.toLocaleDateString("ro-RO", { weekday: "short" })
  return d.toLocaleDateString("ro-RO", { day: "numeric", month: "short" })
}

function fmtLong(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function initials(first: string | null, last: string | null): string {
  return [(first ?? "")[0], (last ?? "")[0]].filter(Boolean).join("").toUpperCase() || "?"
}

function otherParticipants(conv: DMConversation, userId: string): Participant[] {
  return conv.participants.filter((p) => p.userId !== userId)
}

function convName(conv: DMConversation, userId: string): string {
  const others = otherParticipants(conv, userId)
  if (others.length === 0) return "Note personale"
  return others
    .map((p) => [p.firstName, p.lastName].filter(Boolean).join(" ") || "Anonim")
    .join(", ")
}

// ─── Icons ─────────────────────────────────────────────────────────────────

function IconBack() {
  return (
    <svg
      width="10"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function IconSend() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function IconHash() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function IconMegaphone() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
  )
}

function IconPin() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M17.707 7.707l-1.414-1.414L15 7.586V5a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v2.586L6.707 6.293 5.293 7.707 9 11.414V13l-2 2v1h4v4h2v-4h4v-1l-2-2v-1.586l3.707-3.707z" />
    </svg>
  )
}

// ─── Avatar ────────────────────────────────────────────────────────────────

function Avatar({
  url,
  first,
  last,
  size = 36,
}: {
  url?: string | null
  first?: string | null
  last?: string | null
  size?: number
}) {
  const radius = Math.round(size * 0.35)
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flexShrink: 0 }}
    />
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: "rgba(255,255,255,0.12)",
        border: "1px solid rgba(255,255,255,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.33,
        fontWeight: 700,
        color: "rgba(255,255,255,0.60)",
        flexShrink: 0,
      }}
    >
      {initials(first ?? null, last ?? null)}
    </div>
  )
}

// ─── Glass card primitives ─────────────────────────────────────────────────

function GlassRow({
  children,
  onClick,
  unread = false,
}: {
  children: React.ReactNode
  onClick?: () => void
  unread?: boolean
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 16,
        background: unread ? "rgba(255,255,255,0.08)" : "var(--prv-g1)",
        border: `1px solid ${unread ? "rgba(255,255,255,0.14)" : "var(--prv-border-subtle)"}`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
        cursor: onClick ? "pointer" : "default",
        transition: "background 200ms ease",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  )
}

// ─── Empty state ───────────────────────────────────────────────────────────

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 20,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          color: "rgba(255,255,255,0.30)",
        }}
      >
        {icon}
      </div>
      <p
        style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.50)", marginBottom: 6 }}
      >
        {title}
      </p>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", lineHeight: 1.5, maxWidth: 220 }}>
        {sub}
      </p>
    </div>
  )
}

// ─── Skeleton ──────────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: 64,
            borderRadius: 16,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
          }}
          className="animate-pulse"
        />
      ))}
    </div>
  )
}

// ─── Message bubble ────────────────────────────────────────────────────────

function MessageBubble({ msg, isOwn }: { msg: Message; isOwn: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: isOwn ? "row-reverse" : "row",
        alignItems: "flex-end",
        gap: 8,
        marginBottom: 10,
      }}
    >
      {!isOwn && (
        <Avatar
          url={msg.authorAvatarUrl}
          first={msg.authorFirstName}
          last={msg.authorLastName}
          size={28}
        />
      )}
      <div
        style={{
          maxWidth: "72%",
          display: "flex",
          flexDirection: "column",
          alignItems: isOwn ? "flex-end" : "flex-start",
        }}
      >
        {!isOwn && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.45)",
              marginBottom: 3,
              marginLeft: 4,
            }}
          >
            {[msg.authorFirstName, msg.authorLastName].filter(Boolean).join(" ") || "Anonim"}
          </span>
        )}
        <div
          style={{
            padding: "9px 13px",
            borderRadius: isOwn ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
            background: isOwn ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.08)",
            border: `1px solid ${isOwn ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)"}`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
          }}
        >
          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.92)",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {msg.content}
          </p>
        </div>
        <span
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.22)",
            marginTop: 3,
            marginLeft: 4,
            marginRight: 4,
          }}
        >
          {fmtTime(msg.createdAt)}
          {msg.editedAt ? " · editat" : ""}
        </span>
      </div>
    </div>
  )
}

// ─── Message thread ────────────────────────────────────────────────────────

function MessageThread({
  title,
  subtitle,
  apiUrl,
  userId,
  onBack,
}: {
  title: string
  subtitle?: string
  apiUrl: string
  userId: string
  onBack: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const load = useCallback(
    async (cursor?: string) => {
      const url = cursor ? `${apiUrl}?cursor=${encodeURIComponent(cursor)}` : apiUrl
      const res = await fetch(url)
      if (!res.ok) return
      const data = (await res.json()) as {
        messages: Message[]
        hasMore: boolean
        nextCursor: string | null
      }
      if (cursor) {
        setMessages((prev) => [...prev, ...data.messages])
      } else {
        setMessages([...data.messages].reverse())
      }
      setHasMore(data.hasMore)
      setNextCursor(data.nextCursor)
      setLoading(false)
    },
    [apiUrl]
  )

  useEffect(() => {
    // Reset the thread when the active conversation changes; messages then load
    // below and are kept live by the realtime subscription.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setMessages([])
    load()
  }, [load])

  useEffect(() => {
    if (!loading) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" })
    }
  }, [loading])

  const handleSend = useCallback(async () => {
    const content = text.trim()
    if (!content || sending) return
    setSending(true)
    setText("")
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      content,
      type: "text",
      editedAt: null,
      createdAt: new Date().toISOString(),
      authorId: userId,
      authorFirstName: null,
      authorLastName: null,
      authorAvatarUrl: null,
    }
    setMessages((prev) => [...prev, optimistic])
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type: "text" }),
      })
      if (res.ok) {
        const data = (await res.json()) as { message: Message }
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? data.message : m)))
      }
    } finally {
      setSending(false)
    }
  }, [text, sending, apiUrl, userId])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        void handleSend()
      }
    },
    [handleSend]
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.45)",
            cursor: "pointer",
            padding: "4px 6px",
            display: "flex",
            alignItems: "center",
          }}
          aria-label="Înapoi"
        >
          <IconBack />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "rgba(255,255,255,0.92)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </p>
          {subtitle && (
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "16px 0" }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  height: 48,
                  borderRadius: 12,
                  background: "var(--prv-g1)",
                  width: `${50 + i * 15}%`,
                  alignSelf: i % 2 === 0 ? "flex-start" : "flex-end",
                }}
                className="animate-pulse"
              />
            ))}
          </div>
        )}

        {hasMore && !loading && (
          <button
            onClick={() => {
              if (nextCursor) void load(nextCursor)
            }}
            style={{
              alignSelf: "center",
              marginBottom: 12,
              fontSize: 12,
              color: "rgba(255,255,255,0.40)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            Încarcă mai vechi
          </button>
        )}

        {!loading && messages.length === 0 && (
          <EmptyState
            icon={
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            }
            title="Nicio conversație"
            sub="Fii primul care trimite un mesaj"
          />
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} isOwn={msg.authorId === userId} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div
        style={{
          padding: "12px 16px 20px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
          display: "flex",
          gap: 10,
          alignItems: "flex-end",
        }}
      >
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Scrie un mesaj…"
          rows={1}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14,
            padding: "10px 14px",
            fontSize: 14,
            color: "rgba(255,255,255,0.90)",
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
            lineHeight: 1.5,
            maxHeight: 120,
            overflowY: "auto",
          }}
          onInput={(e) => {
            const el = e.currentTarget
            el.style.height = "auto"
            el.style.height = `${Math.min(el.scrollHeight, 120)}px`
          }}
        />
        <button
          onClick={() => {
            void handleSend()
          }}
          disabled={!text.trim() || sending}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background:
              text.trim() && !sending ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.10)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: text.trim() && !sending ? "pointer" : "default",
            color: text.trim() && !sending ? "#000" : "rgba(255,255,255,0.25)",
            transition: "background 200ms ease, color 200ms ease",
            flexShrink: 0,
          }}
          aria-label="Trimite"
        >
          <IconSend />
        </button>
      </div>
    </div>
  )
}

// ─── Announcement detail ───────────────────────────────────────────────────

function AnnouncementDetail({
  ann,
  onBack,
  onRead,
}: {
  ann: Announcement
  onBack: () => void
  onRead: (id: string) => void
}) {
  useEffect(() => {
    if (!ann.isRead) {
      void fetch(`/api/communications/announcements/${ann.id}/read`, { method: "POST" })
      onRead(ann.id)
    }
  }, [ann.id, ann.isRead, onRead])

  const readPct =
    ann.totalAudience && ann.totalAudience > 0
      ? Math.round((ann.readCount / ann.totalAudience) * 100)
      : null

  return (
    <div style={{ padding: "16px 16px 48px" }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.45)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 20,
          fontSize: 13,
          padding: 0,
        }}
      >
        <IconBack />
        <span>Anunțuri</span>
      </button>

      {/* Pinned badge */}
      {ann.isPinned && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "rgba(255,200,80,0.85)",
            background: "rgba(255,180,0,0.10)",
            border: "1px solid rgba(255,180,0,0.20)",
            borderRadius: 6,
            padding: "3px 8px",
            marginBottom: 12,
          }}
        >
          <IconPin />
          Fixat
        </div>
      )}

      {/* Title */}
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "rgba(255,255,255,0.95)",
          lineHeight: 1.3,
          letterSpacing: "-0.4px",
          marginBottom: 12,
        }}
      >
        {ann.title}
      </h1>

      {/* Meta */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Avatar
          url={ann.authorAvatarUrl}
          first={ann.authorFirstName}
          last={ann.authorLastName}
          size={28}
        />
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.65)" }}>
            {[ann.authorFirstName, ann.authorLastName].filter(Boolean).join(" ") || "PRV"}
          </p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.30)" }}>
            {fmtLong(ann.publishedAt ?? ann.createdAt)}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 20 }} />

      {/* Body */}
      <div
        style={{
          fontSize: 15,
          color: "rgba(255,255,255,0.82)",
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {ann.body}
      </div>

      {/* Read stats */}
      {readPct !== null && (
        <div
          style={{
            marginTop: 32,
            padding: "14px 16px",
            borderRadius: 14,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "rgba(255,255,255,0.35)",
              marginBottom: 8,
            }}
          >
            VIZIBILITATE ANUNȚ
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                flex: 1,
                height: 4,
                background: "rgba(255,255,255,0.10)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${readPct}%`,
                  background: "rgba(255,255,255,0.50)",
                  borderRadius: 2,
                  transition: "width 600ms ease",
                }}
              />
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(255,255,255,0.55)",
                flexShrink: 0,
              }}
            >
              {ann.readCount} / {ann.totalAudience} citit
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────

interface Props {
  userId: string
  companyId: string
}

export function CommunicationsClient({ userId, companyId }: Props) {
  const [tab, setTab] = useState<Tab>("dms")
  const [view, setView] = useState<View>("list")

  const queryClient = useQueryClient()

  // Selected items — local UI state.
  const [activeDm, setActiveDm] = useState<DMConversation | null>(null)
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null)
  const [activeAnn, setActiveAnn] = useState<Announcement | null>(null)

  // DMs load on mount; channels / announcements load lazily when their tab opens.
  const { data: dmsData, isLoading: dmsLoading } = useQuery({
    queryKey: ["comms", "dms"],
    queryFn: () =>
      fetch("/api/communications/dms").then(
        (r) => r.json() as Promise<{ conversations: DMConversation[] }>
      ),
  })
  const dms = dmsData?.conversations ?? []

  const { data: channelsData, isLoading: channelsLoading } = useQuery({
    queryKey: ["comms", "channels"],
    queryFn: () =>
      fetch("/api/communications/channels").then(
        (r) => r.json() as Promise<{ channels: Channel[] }>
      ),
    enabled: tab === "channels",
  })
  const channels = channelsData?.channels ?? []

  const { data: annData, isLoading: annLoading } = useQuery({
    queryKey: ["comms", "announcements"],
    queryFn: () =>
      fetch("/api/communications/announcements").then(
        (r) => r.json() as Promise<{ announcements: Announcement[] }>
      ),
    enabled: tab === "announcements",
  })
  const announcements = annData?.announcements ?? []

  // Supabase realtime — new DM received
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    const ch = supabase
      .channel(`comms-dm:${userId}:${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
        },
        () => {
          // Refresh the DM list preview through the query cache.
          void queryClient.invalidateQueries({ queryKey: ["comms", "dms"] })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(ch)
    }
  }, [userId, companyId, queryClient])

  const handleOpenDm = useCallback((dm: DMConversation) => {
    setActiveDm(dm)
    setView("thread")
  }, [])

  const handleOpenChannel = useCallback((ch: Channel) => {
    setActiveChannel(ch)
    setView("thread")
  }, [])

  const handleOpenAnn = useCallback((ann: Announcement) => {
    setActiveAnn(ann)
    setView("announcement")
  }, [])

  const handleBack = useCallback(() => {
    setView("list")
    setActiveDm(null)
    setActiveChannel(null)
    setActiveAnn(null)
  }, [])

  const handleMarkRead = useCallback(
    (id: string) => {
      queryClient.setQueryData<{ announcements: Announcement[] }>(
        ["comms", "announcements"],
        (prev) =>
          prev
            ? {
                announcements: prev.announcements.map((a) =>
                  a.id === id ? { ...a, isRead: true } : a
                ),
              }
            : prev
      )
      if (activeAnn?.id === id) setActiveAnn((prev) => (prev ? { ...prev, isRead: true } : prev))
    },
    [activeAnn?.id, queryClient]
  )

  const unreadAnn = announcements.filter((a) => !a.isRead).length

  // ── Thread view ──────────────────────────────────────────────────────────
  if (view === "thread" && activeDm) {
    return (
      <div className="max-w-2xl mx-auto pt-14">
        <MessageThread
          title={convName(activeDm, userId)}
          subtitle={
            otherParticipants(activeDm, userId)
              .map((p) => p.jobTitle)
              .filter(Boolean)
              .join(" · ") || undefined
          }
          apiUrl={`/api/communications/dms/${activeDm.id}/messages`}
          userId={userId}
          onBack={handleBack}
        />
      </div>
    )
  }

  if (view === "thread" && activeChannel) {
    return (
      <div className="max-w-2xl mx-auto pt-14">
        <MessageThread
          title={`#${activeChannel.name}`}
          subtitle={activeChannel.description ?? undefined}
          apiUrl={`/api/communications/channels/${activeChannel.id}/messages`}
          userId={userId}
          onBack={handleBack}
        />
      </div>
    )
  }

  if (view === "announcement" && activeAnn) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-14 pb-28">
        <AnnouncementDetail ann={activeAnn} onBack={handleBack} onRead={handleMarkRead} />
      </div>
    )
  }

  // ── List view ────────────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--prv-text-3)", marginBottom: 2 }}>
          PRV
        </p>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "rgba(255,255,255,0.95)",
          }}
        >
          Comunicații
        </h1>
      </div>

      {/* Tab strip */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: 4,
          borderRadius: 14,
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          marginBottom: 20,
        }}
      >
        {(
          [
            { id: "dms" as Tab, label: "Mesaje" },
            { id: "channels" as Tab, label: "Canale" },
            {
              id: "announcements" as Tab,
              label: "Anunțuri",
              badge: unreadAnn > 0 ? unreadAnn : undefined,
            },
          ] as { id: Tab; label: string; badge?: number }[]
        ).map(({ id, label, badge }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              flex: 1,
              padding: "8px 4px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              background: tab === id ? "var(--prv-g2)" : "transparent",
              color: tab === id ? "var(--prv-text-1)" : "var(--prv-text-3)",
              cursor: "pointer",
              transition: "background 200ms ease, color 200ms ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            {label}
            {badge !== undefined && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: "rgba(255,69,58,0.80)",
                  color: "#fff",
                  borderRadius: 100,
                  padding: "1px 5px",
                  lineHeight: 1.4,
                }}
              >
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── DMs tab ─────────────────────────────────────────────────────── */}
      {tab === "dms" && (
        <>
          {dmsLoading && <ListSkeleton />}
          {!dmsLoading && dms.length === 0 && (
            <EmptyState
              icon={
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              }
              title="Nicio conversație"
              sub="Conversațiile directe vor apărea aici"
            />
          )}
          {!dmsLoading &&
            dms.map((dm) => {
              const others = otherParticipants(dm, userId)
              const name = convName(dm, userId)
              const first = others[0]
              return (
                <GlassRow key={dm.id} onClick={() => handleOpenDm(dm)}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <Avatar
                      url={first?.avatarUrl}
                      first={first?.firstName}
                      last={first?.lastName}
                      size={40}
                    />
                    {others.length > 1 && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: -2,
                          right: -2,
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.15)",
                          border: "1.5px solid rgba(0,0,0,0.6)",
                          fontSize: 9,
                          fontWeight: 700,
                          color: "rgba(255,255,255,0.70)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        +{others.length - 1}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: 3,
                      }}
                    >
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "rgba(255,255,255,0.92)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {name}
                      </p>
                      {dm.lastMessageAt && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.28)",
                            flexShrink: 0,
                            marginLeft: 8,
                          }}
                        >
                          {fmtTime(dm.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.35)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {dm.lastMessagePreview ?? "Apasă pentru a citi mesajele"}
                    </p>
                  </div>
                </GlassRow>
              )
            })}
        </>
      )}

      {/* ── Channels tab ────────────────────────────────────────────────── */}
      {tab === "channels" && (
        <>
          {channelsLoading && <ListSkeleton />}
          {!channelsLoading && channels.length === 0 && (
            <EmptyState
              icon={<IconHash />}
              title="Niciun canal"
              sub="Canalele de comunicare vor apărea aici"
            />
          )}
          {!channelsLoading &&
            channels.map((ch) => (
              <GlassRow key={ch.id} onClick={() => handleOpenChannel(ch)}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: "rgba(255,255,255,0.50)",
                  }}
                >
                  {ch.type === "private" ? <IconLock /> : <IconHash />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 3,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.92)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      #{ch.name}
                    </p>
                    {ch.lastMessageAt && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.28)",
                          flexShrink: 0,
                          marginLeft: 8,
                        }}
                      >
                        {fmtTime(ch.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.35)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ch.lastMessagePreview ?? ch.description ?? "Apasă pentru a intra în canal"}
                  </p>
                </div>
              </GlassRow>
            ))}
        </>
      )}

      {/* ── Announcements tab ───────────────────────────────────────────── */}
      {tab === "announcements" && (
        <>
          {annLoading && <ListSkeleton />}
          {!annLoading && announcements.length === 0 && (
            <EmptyState
              icon={<IconMegaphone />}
              title="Niciun anunț"
              sub="Anunțurile companiei vor apărea aici"
            />
          )}
          {!annLoading &&
            announcements.map((ann) => (
              <GlassRow key={ann.id} onClick={() => handleOpenAnn(ann)} unread={!ann.isRead}>
                {/* Unread dot */}
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: ann.isRead ? "transparent" : "rgba(255,255,255,0.70)",
                    flexShrink: 0,
                    marginRight: -4,
                  }}
                />
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: ann.isPinned ? "rgba(255,180,0,0.10)" : "rgba(255,255,255,0.07)",
                    border: `1px solid ${ann.isPinned ? "rgba(255,180,0,0.20)" : "rgba(255,255,255,0.12)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: ann.isPinned ? "rgba(255,200,80,0.80)" : "rgba(255,255,255,0.45)",
                  }}
                >
                  {ann.isPinned ? <IconPin /> : <IconMegaphone />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 3,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: ann.isRead ? 500 : 700,
                        color: ann.isRead ? "rgba(255,255,255,0.70)" : "rgba(255,255,255,0.95)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      {ann.title}
                    </p>
                    <span
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.28)",
                        flexShrink: 0,
                        marginLeft: 8,
                      }}
                    >
                      {fmtTime(ann.publishedAt ?? ann.createdAt)}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.32)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ann.body.slice(0, 80)}
                  </p>
                </div>
              </GlassRow>
            ))}
        </>
      )}
    </div>
  )
}
