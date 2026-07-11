"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useClientDetail } from "@/lib/api-hooks"
import Link from "next/link"
import { useSheetStack } from "@prv/ui"
import type { ClientDetail, ClientActivityType } from "@/app/api/crm/clients/[id]/route"

interface ClientDetailClientProps {
  id: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function getRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 2) return "Acum"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(iso)
}

// ── Icons (SF Symbol style) ───────────────────────────────────────────────────

function IconChevronLeft() {
  return (
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
  )
}

function IconChevronRight() {
  return (
    <svg
      width="7"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function IconPhone() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.5 2 2 0 0 1 3.59 1.3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg
      width="16"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="2,4 12,13 22,4" />
    </svg>
  )
}

function IconMapPin() {
  return (
    <svg
      width="13"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconPencil() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  )
}

function IconList() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function IconFileText() {
  return (
    <svg
      width="14"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function IconStar() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  vip: {
    label: "VIP",
    color: "#ffcc44",
    bg: "rgba(255,204,68,0.13)",
    avatarBg: "rgba(255,204,68,0.16)",
    avatarBorder: "rgba(255,204,68,0.30)",
    avatarColor: "#ffcc44",
  },
  active: {
    label: "Active",
    color: "#5affa0",
    bg: "rgba(90,255,160,0.12)",
    avatarBg: "rgba(255,255,255,0.10)",
    avatarBorder: "rgba(255,255,255,0.15)",
    avatarColor: "rgba(255,255,255,0.75)",
  },
  lead: {
    label: "Lead",
    color: "#7eb8ff",
    bg: "rgba(126,184,255,0.13)",
    avatarBg: "rgba(126,184,255,0.14)",
    avatarBorder: "rgba(126,184,255,0.25)",
    avatarColor: "#7eb8ff",
  },
  cold: {
    label: "Cold",
    color: "rgba(255,255,255,0.35)",
    bg: "rgba(255,255,255,0.07)",
    avatarBg: "rgba(255,255,255,0.07)",
    avatarBorder: "rgba(255,255,255,0.10)",
    avatarColor: "rgba(255,255,255,0.45)",
  },
}

// ── Activity dot config ───────────────────────────────────────────────────────

const ACTIVITY_DOT: Record<ClientActivityType, string> = {
  quote_sent: "#7eb8ff",
  quote_accepted: "#5affa0",
  quote_rejected: "#ff6b6b",
  invoice_paid: "#5affa0",
  invoice_overdue: "#ff6b6b",
  project_started: "#7eb8ff",
  project_completed: "#5affa0",
  note: "rgba(255,255,255,0.35)",
  created: "rgba(255,255,255,0.45)",
}

// ── Quote/Invoice status config ───────────────────────────────────────────────

const QUOTE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "rgba(255,255,255,0.35)", bg: "rgba(255,255,255,0.07)" },
  sent: { label: "Sent", color: "#7eb8ff", bg: "rgba(126,184,255,0.13)" },
  accepted: { label: "Accepted", color: "#5affa0", bg: "rgba(90,255,160,0.12)" },
  rejected: { label: "Rejected", color: "#ff6b6b", bg: "rgba(255,107,107,0.12)" },
  expired: { label: "Expired", color: "rgba(255,255,255,0.35)", bg: "rgba(255,255,255,0.07)" },
}

const INVOICE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "rgba(255,255,255,0.35)", bg: "rgba(255,255,255,0.07)" },
  due: { label: "Due", color: "#ffcc44", bg: "rgba(255,204,68,0.12)" },
  partial: { label: "Partial", color: "#ffcc44", bg: "rgba(255,204,68,0.12)" },
  paid: { label: "Paid", color: "#5affa0", bg: "rgba(90,255,160,0.12)" },
  overdue: { label: "Overdue", color: "#ff6b6b", bg: "rgba(255,107,107,0.12)" },
  void: { label: "Cancelled", color: "rgba(255,255,255,0.35)", bg: "rgba(255,255,255,0.07)" },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number) {
  return "€" + amount.toLocaleString("en-US")
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "rgba(255,255,255,0.35)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        margin: "20px 4px 8px",
      }}
    >
      {children}
    </p>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton({ w, h, radius = 6 }: { w: number | string; h: number; radius?: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        background: "rgba(255,255,255,0.07)",
      }}
    />
  )
}

function LoadingSkeleton() {
  return (
    <div>
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 18,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <Skeleton w={64} h={64} radius={32} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton w="55%" h={16} />
            <Skeleton w="40%" h={12} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <Skeleton w={80} h={32} radius={10} />
          <Skeleton w={80} h={32} radius={10} />
          <Skeleton w={80} h={32} radius={10} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <Skeleton w="100%" h={52} radius={12} />
          <Skeleton w="100%" h={52} radius={12} />
          <Skeleton w="100%" h={52} radius={12} />
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

function AssignManagerForm({
  onSubmit,
  onCancel,
  pending,
}: {
  onSubmit: (userId: string) => void
  onCancel: () => void
  pending: boolean
}) {
  const [userId, setUserId] = useState("")
  const { data: peopleData } = useQuery<{
    members: { id: string; firstName: string; lastName: string; role: string }[]
  }>({
    queryKey: ["people", "picker"],
    queryFn: () => fetch("/api/people?limit=200").then((r) => r.json()),
  })
  const people = peopleData?.members ?? []
  return (
    <div style={{ padding: "12px 16px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, color: "var(--prv-text-3)", lineHeight: 1.5, padding: "0 2px" }}>
        Assign the account manager responsible for this client relationship.
      </div>
      <select
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          padding: 12,
          color: "rgba(255,255,255,0.92)",
          fontSize: 13.5,
          fontFamily: "inherit",
        }}
      >
        <option value="">Select an account manager…</option>
        {people.map((m) => (
          <option key={m.id} value={m.id}>
            {m.firstName} {m.lastName} · {m.role}
          </option>
        ))}
      </select>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          disabled={pending || !userId}
          onClick={() => onSubmit(userId)}
          style={{
            padding: "10px 18px",
            background: userId ? "rgba(126,184,255,0.9)" : "rgba(255,255,255,0.07)",
            border: 0,
            borderRadius: 10,
            color: userId ? "#00224a" : "rgba(255,255,255,0.4)",
            fontSize: 13,
            fontWeight: 700,
            cursor: pending || !userId ? "default" : "pointer",
          }}
        >
          Assign
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "10px 18px",
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            color: "rgba(255,255,255,0.75)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export function ClientDetailClient({ id }: ClientDetailClientProps) {
  const { data, isError, isLoading: loading } = useClientDetail(id)
  const client = data?.client ?? null
  const error = isError ? "Failed to load client." : null
  const { openSheet } = useSheetStack()
  const queryClient = useQueryClient()

  const assignMutation = useMutation({
    mutationFn: (assignedUserId: string) =>
      fetch(`/api/crm/clients/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assignedUserId }),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Assign failed")
        return r.json()
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["client-detail", id] })
      void queryClient.invalidateQueries({ queryKey: ["clients"] })
    },
  })

  const openAssignManager = () => {
    openSheet({
      snapPoints: ["mid"],
      defaultSnap: "mid",
      title: "Assign Account Manager",
      render: (onClose) => (
        <AssignManagerForm
          pending={assignMutation.isPending}
          onCancel={onClose}
          onSubmit={(userId) => {
            assignMutation.mutate(userId)
            onClose()
          }}
        />
      ),
    })
  }

  function openActions() {
    if (!client) return
    openSheet({
      snapPoints: ["mid", "full"],
      defaultSnap: "mid",
      title: client.name,
      render: (onClose) => (
        <div
          style={{ padding: "8px 20px 32px", display: "flex", flexDirection: "column", gap: 10 }}
        >
          {/* Contact card */}
          <div
            style={{
              background: "var(--prv-g2)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 14,
              padding: "12px 14px",
              display: "flex",
              gap: 10,
            }}
          >
            <a
              href={`tel:${client.phone}`}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                padding: "10px 0",
                borderRadius: 10,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid var(--prv-border-subtle)",
                color: "rgba(255,255,255,0.80)",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <IconPhone />
              Call
            </a>
            <a
              href={`mailto:${client.email}`}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                padding: "10px 0",
                borderRadius: 10,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid var(--prv-border-subtle)",
                color: "rgba(255,255,255,0.80)",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <IconMail />
              Email
            </a>
          </div>
          {/* Assign account manager */}
          <button
            onClick={() => {
              onClose()
              openAssignManager()
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(126,184,255,0.12)",
              border: "1px solid rgba(126,184,255,0.22)",
              color: "#7eb8ff",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "rgba(126,184,255,0.14)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7eb8ff"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <div>
              Assign account manager
              <div
                style={{ fontSize: 12, color: "var(--prv-text-3)", fontWeight: 400, marginTop: 2 }}
              >
                {client.owner ? `Current: ${client.owner}` : "No manager assigned"}
              </div>
            </div>
          </button>
          {/* New quote */}
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(126,184,255,0.12)",
              border: "1px solid rgba(126,184,255,0.22)",
              color: "#7eb8ff",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "rgba(126,184,255,0.14)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconFileText />
            </div>
            New Quote
          </button>
          {/* New invoice */}
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(90,255,160,0.09)",
              border: "1px solid rgba(90,255,160,0.18)",
              color: "#5affa0",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "rgba(90,255,160,0.11)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconFileText />
            </div>
            New Invoice
          </button>
          {/* Edit */}
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 16px",
              borderRadius: 14,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              color: "rgba(255,255,255,0.75)",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconPencil />
            </div>
            Edit Client
          </button>
          {/* All quotes */}
          <Link
            href={`/crm/quotes?clientId=${client.id}`}
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 16px",
              borderRadius: 14,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              color: "rgba(255,255,255,0.65)",
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconList />
            </div>
            Toate Ofertele
          </Link>
        </div>
      ),
    })
  }

  if (loading) {
    return (
      <div style={{ padding: "56px 16px 112px", maxWidth: 640, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginBottom: 20,
            color: "rgba(255,255,255,0.45)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <Link
            href="/crm/clients"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              color: "rgba(255,255,255,0.45)",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <IconChevronLeft />
            Clients
          </Link>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  if (error || !client) {
    return (
      <div style={{ padding: "56px 16px 112px", maxWidth: 640, margin: "0 auto" }}>
        <Link
          href="/crm/clients"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginBottom: 20,
            color: "rgba(255,255,255,0.45)",
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <IconChevronLeft />
          Clients
        </Link>
        <div
          style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.35)",
            fontSize: 14,
            paddingTop: 60,
          }}
        >
          {error ?? "Client not found."}
        </div>
      </div>
    )
  }

  const s = STATUS_CONFIG[client.status]
  const unpaid = client.totalInvoiced - client.totalPaid
  const activeProjects = client.projects.filter(
    (p) => p.status === "active" || p.status === "review" || p.status === "planning"
  )
  const HEALTH_LABEL: Record<string, string> = {
    vip: "VIP",
    healthy: "Sănătos",
    at_risk: "În risc",
    dormant: "Inactiv",
  }
  const healthColor =
    client.health.band === "vip" || client.health.band === "healthy"
      ? "rgba(255,255,255,0.92)"
      : "rgba(255,190,90,0.92)"

  return (
    <div style={{ padding: "56px 16px 112px", maxWidth: 640, margin: "0 auto" }}>
      {/* Back nav */}
      <Link
        href="/crm/clients"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          marginBottom: 20,
          color: "rgba(255,255,255,0.45)",
          textDecoration: "none",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        <IconChevronLeft />
        Clients
      </Link>

      {/* Hero card */}
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 20,
          padding: 16,
          marginBottom: 12,
          ...(client.status === "vip"
            ? {
                borderLeft: "3px solid transparent",
                borderImage: "linear-gradient(180deg,#d4a800,#ffcc44) 1",
                paddingLeft: 13,
              }
            : {}),
        }}
      >
        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: s.avatarBg,
              border: `1.5px solid ${s.avatarBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 800,
              color: s.avatarColor,
              flexShrink: 0,
              letterSpacing: "-0.5px",
            }}
          >
            {client.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
              {client.status === "vip" && (
                <span style={{ color: "#ffcc44" }}>
                  <IconStar />
                </span>
              )}
              <p
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.92)",
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {client.name}
              </p>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>
              {client.location} · {client.cifVat} · desde {client.since}
            </p>
          </div>
        </div>

        {/* Pills row: status + contact actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "5px 10px",
              borderRadius: 8,
              background: s.bg,
              color: s.color,
            }}
          >
            {s.label}
          </span>
          <a
            href={`tel:${client.phone}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              padding: "5px 11px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid var(--prv-border-subtle)",
              color: "rgba(255,255,255,0.70)",
              textDecoration: "none",
            }}
          >
            <IconPhone />
            Call
          </a>
          <a
            href={`mailto:${client.email}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              padding: "5px 11px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid var(--prv-border-subtle)",
              color: "rgba(255,255,255,0.70)",
              textDecoration: "none",
            }}
          >
            <IconMail />
            Email
          </a>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              fontWeight: 500,
              padding: "5px 10px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.30)",
            }}
          >
            <IconMapPin />
            {client.address.split(",")[0]}
          </span>
        </div>

        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            {
              v: fmt(client.totalInvoiced),
              l: "Facturat",
              color: "#5affa0",
            },
            {
              v: unpaid > 0 ? fmt(unpaid) : fmt(client.totalPaid),
              l: unpaid > 0 ? "Restant" : "Achitat",
              color: unpaid > 0 ? "#ff6b6b" : "#5affa0",
            },
            {
              v: `${client.health.score}`,
              l: HEALTH_LABEL[client.health.band] ?? "Health",
              color: healthColor,
            },
          ].map(({ v, l, color }) => (
            <div
              key={l}
              style={{
                padding: "10px 0",
                borderRadius: 12,
                textAlign: "center",
                background: "var(--prv-g2)",
              }}
            >
              <p style={{ fontSize: 15, fontWeight: 700, color, margin: 0 }}>{v}</p>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.35)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  margin: "3px 0 0",
                }}
              >
                {l}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Oferte section */}
      {client.quotes.length > 0 && (
        <>
          <SectionLabel>Oferte</SectionLabel>
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              overflow: "hidden",
              marginBottom: 4,
            }}
          >
            {client.quotes.map((q, idx) => {
              const qs = QUOTE_STATUS[q.status] ?? {
                label: q.status,
                color: "rgba(255,255,255,0.35)",
                bg: "rgba(255,255,255,0.07)",
              }
              return (
                <Link
                  key={q.id}
                  href={`/crm/quotes/${q.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "13px 16px",
                    borderBottom:
                      idx < client.quotes.length - 1
                        ? "1px solid var(--prv-border-subtle)"
                        : "none",
                    textDecoration: "none",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.85)",
                        margin: "0 0 3px",
                      }}
                    >
                      {q.ref}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.35)",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {q.projectName}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.80)",
                        margin: 0,
                      }}
                    >
                      {fmt(q.amount)}
                    </p>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: qs.bg,
                        color: qs.color,
                      }}
                    >
                      {qs.label}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.20)" }}>
                      <IconChevronRight />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
          <div style={{ textAlign: "right", marginBottom: 4 }}>
            <Link
              href={`/crm/quotes?clientId=${client.id}`}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#7eb8ff",
                textDecoration: "none",
                padding: "4px 4px",
              }}
            >
              Toate quotesle →
            </Link>
          </div>
        </>
      )}

      {/* Facturi section */}
      {client.invoices.length > 0 && (
        <>
          <SectionLabel>Facturi</SectionLabel>
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              overflow: "hidden",
              marginBottom: 4,
            }}
          >
            {client.invoices.map((inv, idx) => {
              const is = INVOICE_STATUS[inv.status] ?? {
                label: inv.status,
                color: "rgba(255,255,255,0.35)",
                bg: "rgba(255,255,255,0.07)",
              }
              return (
                <div
                  key={inv.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "13px 16px",
                    borderBottom:
                      idx < client.invoices.length - 1
                        ? "1px solid var(--prv-border-subtle)"
                        : "none",
                    ...(inv.status === "overdue"
                      ? {
                          borderLeft: "3px solid transparent",
                          borderImage: "linear-gradient(180deg,#ff4444,#ff6b6b) 1",
                          paddingLeft: 13,
                        }
                      : {}),
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.85)",
                        margin: "0 0 3px",
                      }}
                    >
                      {inv.ref}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.35)",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {inv.projectName}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: inv.status === "overdue" ? "#ff6b6b" : "rgba(255,255,255,0.80)",
                        margin: 0,
                      }}
                    >
                      {fmt(inv.amount)}
                    </p>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: is.bg,
                        color: is.color,
                      }}
                    >
                      {is.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ textAlign: "right", marginBottom: 4 }}>
            <Link
              href={`/finance/invoices?clientId=${client.id}`}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#7eb8ff",
                textDecoration: "none",
                padding: "4px 4px",
              }}
            >
              Toate facturile →
            </Link>
          </div>
        </>
      )}

      {/* Active projects section */}
      {activeProjects.length > 0 && (
        <>
          <SectionLabel>Proiecte active</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
            {activeProjects.map((p) => {
              const pct = Math.min(p.completionPct, 100)
              const budgetRatio = p.spent / p.budget
              const barColor =
                budgetRatio > 1 ? "#ff6b6b" : budgetRatio > 0.8 ? "#ffcc44" : "#5affa0"
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  style={{
                    display: "block",
                    background: "var(--prv-g1)",
                    border: "1px solid var(--prv-border-subtle)",
                    borderRadius: 14,
                    padding: "12px 14px",
                    textDecoration: "none",
                    ...(budgetRatio > 1
                      ? {
                          borderLeft: "3px solid transparent",
                          borderImage: "linear-gradient(180deg,#ff4444,#ff6b6b) 1",
                          paddingLeft: 11,
                        }
                      : {}),
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.85)",
                        margin: 0,
                      }}
                    >
                      {p.name}
                    </p>
                    <span
                      style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.65)" }}
                    >
                      {pct}%
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div
                    style={{
                      height: 3,
                      borderRadius: 2,
                      background: "rgba(255,255,255,0.08)",
                      marginBottom: 8,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        borderRadius: 2,
                        background: barColor,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.35)",
                        margin: 0,
                      }}
                    >
                      {p.currentPhaseName}
                      {p.daysLeft > 0 ? ` · ${p.daysLeft}d left` : ""}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: budgetRatio > 1 ? "#ff6b6b" : "rgba(255,255,255,0.35)",
                        margin: 0,
                        fontWeight: budgetRatio > 1 ? 600 : 400,
                      }}
                    >
                      {fmt(p.spent)} / {fmt(p.budget)}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}

      {/* Activity feed */}
      {client.activities.length > 0 && (
        <>
          <SectionLabel>Activitate</SectionLabel>
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              overflow: "hidden",
            }}
          >
            {client.activities.map((act, idx) => (
              <div
                key={act.id}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom:
                    idx < client.activities.length - 1
                      ? "1px solid var(--prv-border-subtle)"
                      : "none",
                }}
              >
                {/* Dot */}
                <div style={{ paddingTop: 4, flexShrink: 0 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: ACTIVITY_DOT[act.type] ?? "rgba(255,255,255,0.25)",
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.75)",
                      margin: "0 0 3px",
                      lineHeight: 1.4,
                    }}
                  >
                    {act.text}
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", margin: 0 }}>
                    {getRelativeTime(act.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* FAB */}
      <button
        onClick={openActions}
        style={{
          position: "fixed",
          bottom: 96,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          border: "1px solid rgba(255,255,255,0.28)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.22)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.90)",
          cursor: "pointer",
          zIndex: 40,
        }}
      >
        <IconPlus />
      </button>
    </div>
  )
}
