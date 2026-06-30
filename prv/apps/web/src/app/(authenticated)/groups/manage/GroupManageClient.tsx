"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useGroups, useGroupDetail } from "@/lib/api-hooks"

const g1 = "var(--prv-g1)"
const g2 = "var(--prv-g2)"
const t1 = "var(--prv-text-1)"
const t2 = "var(--prv-text-2)"
const t3 = "var(--prv-text-3)"
const bds = "var(--prv-border-subtle)"
const bd = "var(--prv-border)"
const DANGER = "rgba(255,69,58,0.9)"

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mt-6 mb-2.5">
      {children}
    </p>
  )
}

export function GroupManageClient() {
  const searchParams = useSearchParams()
  const { data: groupsData } = useGroups()
  const groups = groupsData?.groups ?? []
  const groupId = searchParams.get("group") ?? groups[0]?.id ?? null

  const { data, isLoading, refetch } = useGroupDetail(groupId)
  const group = data?.group
  const members = data?.members ?? []
  const eligible = data?.eligibleCompanies ?? []

  // Editable identity — seeded once from the server (render-time).
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  const [seeded, setSeeded] = useState(false)
  if (group && !seeded) {
    setSeeded(true)
    setName(group.name)
    setDesc(group.description ?? "")
  }

  const [saving, setSaving] = useState(false)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const dirty = !!group && (name !== group.name || desc !== (group.description ?? ""))

  const setBusy = (id: string, on: boolean) =>
    setPending((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const saveIdentity = async () => {
    if (!groupId || !dirty || saving) return
    setSaving(true)
    try {
      await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: desc.trim() || null }),
      })
      await refetch()
    } finally {
      setSaving(false)
    }
  }

  const addCompany = async (companyId: string) => {
    if (!groupId) return
    setBusy(companyId, true)
    try {
      await fetch(`/api/groups/${groupId}/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      })
      await refetch()
    } finally {
      setBusy(companyId, false)
    }
  }

  const removeCompany = async (companyId: string) => {
    if (!groupId) return
    setBusy(companyId, true)
    try {
      await fetch(`/api/groups/${groupId}/companies?companyId=${companyId}`, { method: "DELETE" })
      await refetch()
    } finally {
      setBusy(companyId, false)
    }
  }

  return (
    <div className="px-4 pb-32">
      {/* Header */}
      <div className="pt-6 pb-1 flex items-center gap-3">
        <Link
          href={groupId ? `/groups` : "/groups"}
          aria-label="Back"
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: g1, border: `1px solid ${bds}` }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke={t2}
            strokeWidth="2.2"
            className="w-[18px] h-[18px]"
          >
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: t3 }}>
            Group · Settings
          </p>
          <h1 className="text-[26px] font-semibold tracking-tight" style={{ color: t1 }}>
            Manage Group
          </h1>
        </div>
      </div>

      {/* Identity */}
      <Label>Identity</Label>
      <div
        className="rounded-[22px] p-[18px]"
        style={{ background: g1, border: `1px solid ${bds}` }}
      >
        <div className="flex items-start gap-3.5">
          <div
            className="w-14 h-14 rounded-[18px] grid place-items-center text-[19px] font-bold flex-shrink-0"
            style={{ background: g2 }}
          >
            {group ? initials(group.name) : "—"}
          </div>
          <div className="flex-1 min-w-0">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
              className="w-full bg-transparent border-0 outline-none text-[19px] font-bold tracking-tight"
              style={{ color: t1 }}
            />
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              placeholder="Add a description…"
              className="w-full bg-transparent border-0 outline-none resize-none text-[13px] mt-1.5 leading-snug"
              style={{ color: t2 }}
            />
          </div>
        </div>
        {dirty && (
          <button
            type="button"
            onClick={saveIdentity}
            disabled={saving || name.trim().length < 2}
            className="mt-3 w-full py-2.5 rounded-[14px] text-[13px] font-semibold disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.92)", color: "#000" }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        )}
      </div>

      {/* Member companies */}
      <Label>Member Companies · {members.length}</Label>
      <div
        className="rounded-[22px] overflow-hidden"
        style={{ background: g1, border: `1px solid ${bds}` }}
      >
        {members.map((m, i) => (
          <div
            key={m.companyId}
            className="flex items-center gap-3 px-4 py-3.5"
            style={{ borderBottom: i < members.length - 1 ? `1px solid ${bds}` : "none" }}
          >
            <div
              className="w-10 h-10 rounded-[12px] grid place-items-center text-[13px] font-bold flex-shrink-0"
              style={{ background: g2, color: t1 }}
            >
              {initials(m.companyName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14.5px] font-semibold truncate" style={{ color: t1 }}>
                {m.companyName}
              </div>
              <div className="text-[11.5px] mt-0.5 flex items-center gap-1.5" style={{ color: t3 }}>
                <span
                  className="w-[5px] h-[5px] rounded-full"
                  style={{ background: m.isActive ? "rgba(48,209,88,0.9)" : t3 }}
                />
                {m.isActive ? "Active" : "Inactive"} · since {m.joinedAt?.slice(0, 10)}
              </div>
            </div>
            {m.companyId === groupId ? null : (
              <button
                type="button"
                onClick={() => removeCompany(m.companyId)}
                disabled={pending.has(m.companyId)}
                aria-label={`Remove ${m.companyName}`}
                className="w-8 h-8 rounded-[9px] grid place-items-center flex-shrink-0 disabled:opacity-40"
                style={{ border: `1px solid ${bds}` }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={DANGER}
                  strokeWidth="2"
                  className="w-[15px] h-[15px]"
                >
                  <path d="M5 12h14" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        ))}
        {!isLoading && members.length === 0 && (
          <p className="px-4 py-6 text-[13px] text-center" style={{ color: t3 }}>
            No member companies yet.
          </p>
        )}
      </div>

      {/* Add company */}
      {eligible.length > 0 && (
        <>
          <Label>Add Company · Eligible</Label>
          <div
            className="rounded-[22px] overflow-hidden"
            style={{ background: g1, border: `1px solid ${bds}` }}
          >
            {eligible.map((c, i) => (
              <div
                key={c.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < eligible.length - 1 ? `1px solid ${bds}` : "none" }}
              >
                <div
                  className="w-9 h-9 rounded-[11px] grid place-items-center text-[12px] font-bold flex-shrink-0"
                  style={{ background: g2, color: t1 }}
                >
                  {initials(c.name)}
                </div>
                <div className="flex-1 text-[13.5px] font-semibold truncate" style={{ color: t1 }}>
                  {c.name}
                </div>
                <button
                  type="button"
                  onClick={() => addCompany(c.id)}
                  disabled={pending.has(c.id)}
                  className="text-[12px] font-bold rounded-full px-3.5 py-1.5 disabled:opacity-50"
                  style={{
                    background: "rgba(255,255,255,0.92)",
                    color: "#000",
                    border: `1px solid ${bd}`,
                  }}
                >
                  {pending.has(c.id) ? "…" : "Add"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {!isLoading && !group && (
        <div
          className="rounded-[22px] p-6 mt-6 text-center text-[13px]"
          style={{ background: g1, border: `1px solid ${bds}`, color: t3 }}
        >
          No group available to manage.
        </div>
      )}
    </div>
  )
}
