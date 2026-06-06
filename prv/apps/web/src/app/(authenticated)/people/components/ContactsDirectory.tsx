"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { AlphabetScrubber } from "./AlphabetScrubber"
import { ContactRow, type ContactMember } from "./ContactRow"
import { ContactDetailSheet } from "./ContactDetailSheet"
import { usePresence } from "@/components/presence/hooks/usePresence"
import { usePresenceStore } from "@/components/presence/store/presenceStore"

interface DirectoryData {
  members: ContactMember[]
  count: number
  nextCursor: string | null
}

async function fetchMembers(search: string, status: string): Promise<DirectoryData> {
  const params = new URLSearchParams({ limit: "100" })
  if (search) params.set("search", search)
  if (status) params.set("status", status)
  const res = await fetch(`/api/people?${params}`)
  if (!res.ok) throw new Error("Failed to fetch members")
  return res.json()
}

interface ContactsDirectoryProps {
  companyId: string
  initialStatusFilter?: string
}

export function ContactsDirectory({ companyId, initialStatusFilter = "" }: ContactsDirectoryProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter)
  const [selectedMember, setSelectedMember] = useState<ContactMember | null>(null)
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())

  // Subscribe to presence for live status updates
  usePresence({ companyId })
  const presenceMap = usePresenceStore((s) => s.members)

  const { data, isLoading, error } = useQuery({
    queryKey: ["people", search, statusFilter],
    queryFn: () => fetchMembers(search, statusFilter),
    staleTime: 30_000,
  })

  // Merge presence store live data into member list
  const members = useMemo(() => {
    if (!data?.members) return []
    return data.members.map((m) => {
      const live = presenceMap.get(m.id)
      if (live) {
        return {
          ...m,
          presence: {
            status: live.status,
            statusMessage: live.statusMessage ?? null,
            lastSeenAt: live.lastSeenAt ?? null,
          },
        }
      }
      return m
    })
  }, [data?.members, presenceMap])

  // Group by first letter of last name
  const grouped = useMemo(() => {
    const map = new Map<string, ContactMember[]>()
    for (const m of members) {
      const letter = (m.lastName?.charAt(0) ?? m.firstName?.charAt(0) ?? "#").toUpperCase()
      if (!map.has(letter)) map.set(letter, [])
      map.get(letter)!.push(m)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [members])

  const letters = grouped.map(([l]) => l)

  const handleJump = useCallback((letter: string) => {
    const el = sectionRefs.current.get(letter)
    el?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  const STATUS_FILTERS = [
    { value: "", label: "All" },
    { value: "online", label: "Online" },
    { value: "away", label: "Away" },
    { value: "busy", label: "Busy" },
    { value: "in_meeting", label: "In Meeting" },
  ]

  return (
    <div className="relative">
      {/* Search bar */}
      <div
        className="sticky top-0 z-10 px-4 pb-3 pt-1"
        style={{
          background: "rgba(0,0,0,0.80)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        <div
          className="flex items-center gap-2 px-3 rounded-[14px]"
          style={{
            background: "var(--prv-border-subtle)",
            border: "1px solid var(--prv-g2)",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--prv-text-3)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Search people…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent py-2.5 text-[15px] text-white/80 outline-none placeholder:text-white/25"
          />
        </div>

        {/* Status filters */}
        <div className="flex gap-1.5 mt-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium"
              style={{
                background: statusFilter === value ? "var(--prv-g3)" : "var(--prv-g1)",
                border: `1px solid ${statusFilter === value ? "var(--prv-g3)" : "var(--prv-border)"}`,
                color: statusFilter === value ? "var(--prv-text-1)" : "var(--prv-text-2)",
                transition: "all 150ms",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Member list */}
      <div className="pb-28 pr-8">
        {isLoading && (
          <div className="px-4 space-y-1 mt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div
                  className="w-10 h-10 rounded-full shrink-0"
                  style={{ background: "var(--prv-border-subtle)" }}
                />
                <div className="flex-1 space-y-1.5">
                  <div
                    className="h-3 rounded-full"
                    style={{ background: "var(--prv-border)", width: `${50 + i * 8}%` }}
                  />
                  <div
                    className="h-2.5 rounded-full w-1/3"
                    style={{ background: "var(--prv-border-subtle)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="text-white/35 text-[14px] text-center py-12">Failed to load members</p>
        )}

        {!isLoading && grouped.length === 0 && (
          <p className="text-white/35 text-[14px] text-center py-12">No members found</p>
        )}

        {grouped.map(([letter, sectionMembers]) => (
          <div
            key={letter}
            ref={(el) => {
              if (el) sectionRefs.current.set(letter, el)
              else sectionRefs.current.delete(letter)
            }}
          >
            {/* Section header */}
            <div
              className="px-4 py-1.5 sticky top-[88px] z-[5]"
              style={{
                background: "rgba(0,0,0,0.60)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            >
              <p className="text-white/35 text-[13px] font-semibold">{letter}</p>
            </div>

            {sectionMembers.map((member) => (
              <ContactRow key={member.id} member={member} onClick={setSelectedMember} />
            ))}
          </div>
        ))}
      </div>

      {/* Alphabet scrubber */}
      {letters.length > 3 && <AlphabetScrubber letters={letters} onJump={handleJump} />}

      {/* Contact detail sheet */}
      {selectedMember && (
        <ContactDetailSheet member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}
    </div>
  )
}
