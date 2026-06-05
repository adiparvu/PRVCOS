import { create } from "zustand"
import type { PresenceStatus } from "../PresenceDot"

export interface PresenceMember {
  userId: string
  status: PresenceStatus
  statusMessage: string | null
  platform: string | null
  lastSeenAt: string
}

interface PresenceStore {
  members: Map<string, PresenceMember>
  setMembers: (members: PresenceMember[]) => void
  upsertMember: (member: PresenceMember) => void
  removeMember: (userId: string) => void
  reset: () => void
}

export const usePresenceStore = create<PresenceStore>((set) => ({
  members: new Map(),

  setMembers: (incoming) =>
    set(() => {
      const m = new Map<string, PresenceMember>()
      incoming.forEach((p) => m.set(p.userId, p))
      return { members: m }
    }),

  upsertMember: (member) =>
    set((state) => {
      const next = new Map(state.members)
      next.set(member.userId, member)
      return { members: next }
    }),

  removeMember: (userId) =>
    set((state) => {
      const next = new Map(state.members)
      next.delete(userId)
      return { members: next }
    }),

  reset: () => set({ members: new Map() }),
}))
