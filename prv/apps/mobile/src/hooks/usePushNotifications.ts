import { useEffect, useRef } from "react"
import * as Notifications from "expo-notifications"
import * as SecureStore from "expo-secure-store"
import { Platform } from "react-native"
import { useAuthStore } from "@/store/auth"
import { api } from "@/lib/api"

const KEY_DEVICE_ID = "prv_device_id"

async function getOrCreateDeviceId(): Promise<string> {
  let id = await SecureStore.getItemAsync(KEY_DEVICE_ID)
  if (!id) {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
    await SecureStore.setItemAsync(KEY_DEVICE_ID, id)
  }
  return id
}

// Configure how notifications are presented when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export function usePushNotifications() {
  const { session } = useAuthStore()
  const deviceIdRef = useRef<string | null>(null)
  const prevUserIdRef = useRef<string | null>(null)

  // Register when session is active
  useEffect(() => {
    if (!session) return

    let cancelled = false

    async function register() {
      // Android needs an explicit notification channel
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "PRV Notifications",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FFFFFF",
        })
      }

      const { status: existing } = await Notifications.getPermissionsAsync()
      let finalStatus = existing

      if (existing !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      if (finalStatus !== "granted" || cancelled) return

      let token: string
      try {
        const result = await Notifications.getExpoPushTokenAsync()
        token = result.data
      } catch {
        return
      }

      if (cancelled) return

      const deviceId = await getOrCreateDeviceId()
      deviceIdRef.current = deviceId
      const platform =
        Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "unknown"

      try {
        await api.post("/api/mobile/push-token", { token, deviceId, platform })
      } catch {
        // silently fail — will retry on next session
      }
    }

    register()
    return () => {
      cancelled = true
    }
  }, [session?.userId])

  // Deregister when session ends (logout)
  useEffect(() => {
    const prevUserId = prevUserIdRef.current
    prevUserIdRef.current = session?.userId ?? null

    if (prevUserId && !session && deviceIdRef.current) {
      const deviceId = deviceIdRef.current
      deviceIdRef.current = null
      api.delWithBody("/api/mobile/push-token", { deviceId }).catch(() => {})
    }
  }, [session])
}
