import { useEffect } from "react"
import { Stack, useRouter, useSegments } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useAuthStore } from "@/store/auth"
import { usePushNotifications } from "@/hooks/usePushNotifications"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
})

export default function RootLayout() {
  const { session, isHydrated, hydrate } = useAuthStore()
  const router = useRouter()
  const segments = useSegments()

  usePushNotifications()

  useEffect(() => {
    hydrate()
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
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
    </QueryClientProvider>
  )
}
