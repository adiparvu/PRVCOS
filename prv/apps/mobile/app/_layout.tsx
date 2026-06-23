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

    if (!session && !inAuthGroup && !inPublicGroup) {
      // Unauthenticated users default to the public app
      router.replace("/(public)/home")
    } else if (session && inAuthGroup) {
      // After login, employees go to the Business OS
      router.replace("/(tabs)/command")
    } else if (session && inPublicGroup) {
      // Authenticated employees who somehow land on public → Business OS
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
