import { useEffect } from "react"
import { Stack, useRouter, useSegments } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { useAuthStore } from "@/store/auth"

export default function RootLayout() {
  const { session, isHydrated, hydrate } = useAuthStore()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    hydrate()
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    const inAuthGroup = segments[0] === "(auth)"

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login")
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)/command")
    }
  }, [session, isHydrated, segments])

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
    </>
  )
}
