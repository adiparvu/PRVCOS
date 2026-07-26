import { useEffect } from "react"
import { Stack, useRouter, useSegments } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { QueryClient, onlineManager } from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"
import AsyncStorage from "@react-native-async-storage/async-storage"
import NetInfo from "@react-native-community/netinfo"
import { useAuthStore } from "@/store/auth"
import { flushQueue } from "@/lib/offline-queue"
import { useCartStore } from "@/store/cart"
import { useFavoritesStore } from "@/store/favorites"
import { usePushNotifications } from "@/hooks/usePushNotifications"

// Offline support (audit P2.10). Three pieces:
// 1. onlineManager fed by NetInfo — React Query pauses refetches/mutations
//    while the device is offline instead of burning retries.
// 2. The query cache persists to AsyncStorage, so every screen renders its
//    last-known data instantly on a job site with no signal (24h max age —
//    stale business data older than a shift is worse than an empty state).
// 3. The durable mutation queue (lib/offline-queue) flushes whenever
//    connectivity returns.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      gcTime: 24 * 60 * 60 * 1000, // must be ≥ persister maxAge or restored queries are GC'd
    },
  },
})

const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "prv_query_cache",
  throttleTime: 2_000,
})

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    const online = !!state.isConnected
    setOnline(online)
    if (online) void flushQueue()
  })
)

export default function RootLayout() {
  const { session, isHydrated, hydrate } = useAuthStore()
  const hydrateCart = useCartStore((s) => s.hydrate)
  const hydrateFavorites = useFavoritesStore((s) => s.hydrate)
  const router = useRouter()
  const segments = useSegments()

  usePushNotifications()

  useEffect(() => {
    hydrate()
    // The public shop is usable without a session, so its cart and favourites
    // are restored regardless of auth state.
    void hydrateCart()
    void hydrateFavorites()
    void flushQueue()
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    const inAuthGroup = segments[0] === "(auth)"
    const inPublicGroup = segments[0] === "(public)"
    const inTabsGroup = segments[0] === "(tabs)"
    const inClientGroup = segments[0] === "(client)"
    const isClient = session?.role === "client"

    if (!session && !inAuthGroup && !inPublicGroup) {
      // Unauthenticated users default to the public app
      router.replace("/(public)/home")
    } else if (session && inAuthGroup) {
      // After login: clients → client portal, employees → Business OS
      if (isClient) {
        router.replace("/(client)/overview")
      } else {
        router.replace("/(tabs)/command")
      }
    } else if (session && inPublicGroup) {
      // Authenticated clients may stay in public; employees go to Business OS
      if (!isClient) router.replace("/(tabs)/command")
    } else if (session && isClient && inTabsGroup) {
      // Client who somehow lands on Business OS → client portal
      router.replace("/(client)/overview")
    } else if (session && !isClient && inClientGroup) {
      // Employee who somehow lands on client portal → Business OS
      router.replace("/(tabs)/command")
    }
  }, [session, isHydrated, segments])

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: queryPersister, maxAge: 24 * 60 * 60 * 1000 }}
    >
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
    </PersistQueryClientProvider>
  )
}
