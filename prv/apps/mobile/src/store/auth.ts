import { create } from "zustand"
import { getSession, saveSession, clearSession, type StoredSession } from "@/lib/session"

interface AuthState {
  session: StoredSession | null
  isLoading: boolean
  isHydrated: boolean
  hydrate: () => Promise<void>
  login: (session: StoredSession) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: false,
  isHydrated: false,

  hydrate: async () => {
    const session = await getSession()
    set({ session, isHydrated: true })
  },

  login: async (session) => {
    set({ isLoading: true })
    await saveSession(session)
    set({ session, isLoading: false })
  },

  logout: async () => {
    await clearSession()
    set({ session: null })
  },
}))
