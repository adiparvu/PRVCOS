import { create } from "zustand"
import * as SecureStore from "expo-secure-store"

const KEY = "prv_public_favorites"
const MAX = 100

interface FavoritesState {
  ids: string[]
  isHydrated: boolean
  hydrate: () => Promise<void>
  toggle: (productId: string) => Promise<void>
  clear: () => Promise<void>
}

async function persist(ids: string[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(ids))
  } catch {
    // Non-fatal: favourites degrade to session-only.
  }
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: [],
  isHydrated: false,

  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY)
      set({ ids: raw ? (JSON.parse(raw) as string[]) : [], isHydrated: true })
    } catch {
      set({ ids: [], isHydrated: true })
    }
  },

  toggle: async (productId) => {
    const current = get().ids
    const next = current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [productId, ...current].slice(0, MAX)
    set({ ids: next })
    await persist(next)
  },

  clear: async () => {
    set({ ids: [] })
    await persist([])
  },
}))
