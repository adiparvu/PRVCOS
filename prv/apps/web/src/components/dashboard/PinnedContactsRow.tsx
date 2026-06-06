"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { usePreviewEngine } from "@/components/preview-engine/PreviewEngine"
import { PresenceDot } from "@/components/presence/PresenceDot"
import { usePresenceStore } from "@/components/presence/store/presenceStore"

interface PinnedContact {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  jobTitle: string | null
  presence: { status: string }
}

async function fetchPinnedContacts(): Promise<PinnedContact[]> {
  const res = await fetch("/api/me/pinned-contacts")
  if (!res.ok) return []
  const data = await res.json()
  return data.contacts ?? []
}

async function updatePinnedContacts(ids: string[]): Promise<void> {
  await fetch("/api/me/pinned-contacts", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contactIds: ids }),
  })
}

export function PinnedContactsRow() {
  const qc = useQueryClient()
  const { open: openPreview } = usePreviewEngine()
  const presenceMap = usePresenceStore((s) => s.members)
  const [removing, setRemoving] = useState<string | null>(null)

  const { data: contacts } = useQuery({
    queryKey: ["pinned-contacts"],
    queryFn: fetchPinnedContacts,
    staleTime: 60_000,
  })

  const updatePinned = useMutation({
    mutationFn: updatePinnedContacts,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pinned-contacts"] }),
  })

  const handleRemove = (id: string) => {
    setRemoving(id)
    const newIds = (contacts ?? []).filter((c) => c.id !== id).map((c) => c.id)
    updatePinned.mutate(newIds, { onSettled: () => setRemoving(null) })
  }

  if (!contacts || contacts.length === 0) return null

  return (
    <div
      className="rounded-[20px] p-4 mb-5"
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border)",
        boxShadow: "inset 0 1px 0 var(--prv-g2-spec)",
      }}
    >
      <p className="text-[11px] font-medium uppercase tracking-widest mb-3" style={{ color: "var(--prv-text-3)" }}>
        Quick Access
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {contacts.map((contact) => {
          const live = presenceMap.get(contact.id)
          const status = live?.status ?? contact.presence.status

          return (
            <button
              key={contact.id}
              onClick={() => openPreview("employee", contact.id)}
              onContextMenu={(e) => {
                e.preventDefault()
                handleRemove(contact.id)
              }}
              className="flex flex-col items-center gap-1.5 shrink-0"
              style={{ opacity: removing === contact.id ? 0.4 : 1, transition: "opacity 200ms" }}
            >
              <div className="relative">
                <div
                  className="w-12 h-12 rounded-[14px] overflow-hidden"
                  style={{
                    background: "var(--prv-g2)",
                    border: "1px solid var(--prv-border)",
                  }}
                >
                  {contact.avatarUrl ? (
                    <img src={contact.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[18px] font-medium" style={{ color: "var(--prv-text-3)" }}>
                      {contact.firstName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5">
                  <PresenceDot status={status as never} size={10} />
                </div>
              </div>
              <p className="text-[11px] font-medium leading-tight max-w-[52px] text-center truncate" style={{ color: "var(--prv-text-2)" }}>
                {contact.firstName}
              </p>
            </button>
          )
        })}
      </div>
      <p className="text-[11px] mt-2" style={{ color: "var(--prv-text-3)" }}>Long-press contact to unpin</p>
    </div>
  )
}
