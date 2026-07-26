import { create } from "zustand"
import * as SecureStore from "expo-secure-store"
import type { PublicProduct } from "@/hooks/usePublicShop"

const KEY = "prv_public_cart"
/** SecureStore values are size-limited on Android; the checkout API caps a cart
 *  at 100 lines anyway, so bound it well below both. */
const MAX_LINES = 50

export interface CartLine {
  productId: string
  name: string
  price: number
  imageUrl: string | null
  quantity: number
}

interface CartState {
  lines: CartLine[]
  isHydrated: boolean
  hydrate: () => Promise<void>
  add: (product: PublicProduct, quantity?: number) => Promise<void>
  setQuantity: (productId: string, quantity: number) => Promise<void>
  remove: (productId: string) => Promise<void>
  clear: () => Promise<void>
}

async function persist(lines: CartLine[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(lines))
  } catch {
    // A full/unavailable keystore must not break shopping — the cart simply
    // stays in memory for this session.
  }
}

export const useCartStore = create<CartState>((set, get) => ({
  lines: [],
  isHydrated: false,

  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY)
      set({ lines: raw ? (JSON.parse(raw) as CartLine[]) : [], isHydrated: true })
    } catch {
      set({ lines: [], isHydrated: true })
    }
  },

  add: async (product, quantity = 1) => {
    const lines = [...get().lines]
    const existing = lines.find((l) => l.productId === product.id)
    if (existing) {
      existing.quantity = Math.min(existing.quantity + quantity, 999)
    } else {
      if (lines.length >= MAX_LINES) return
      lines.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        quantity: Math.min(Math.max(quantity, 1), 999),
      })
    }
    set({ lines })
    await persist(lines)
  },

  setQuantity: async (productId, quantity) => {
    const next =
      quantity <= 0
        ? get().lines.filter((l) => l.productId !== productId)
        : get().lines.map((l) =>
            l.productId === productId ? { ...l, quantity: Math.min(quantity, 999) } : l
          )
    set({ lines: next })
    await persist(next)
  },

  remove: async (productId) => {
    const next = get().lines.filter((l) => l.productId !== productId)
    set({ lines: next })
    await persist(next)
  },

  clear: async () => {
    set({ lines: [] })
    await persist([])
  },
}))

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((n, l) => n + l.quantity, 0)
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((n, l) => n + l.price * l.quantity, 0)
}
