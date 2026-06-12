// Expo Push Notifications — HTTP API (no SDK needed)
// Docs: https://docs.expo.dev/push-notifications/sending-notifications/

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

export interface ExpoPushMessage {
  to: string | string[]
  title?: string
  body?: string
  data?: Record<string, unknown>
  sound?: "default" | null
  badge?: number
  channelId?: string
  priority?: "default" | "normal" | "high"
}

export interface ExpoPushTicket {
  status: "ok" | "error"
  id?: string
  message?: string
  details?: { error?: string }
}

export interface ExpoPushReceipt {
  status: "ok" | "error"
  message?: string
  details?: { error?: string }
}

// Returns per-token tickets — caller should check for DeviceNotRegistered errors
export async function sendExpoPushNotifications(
  messages: ExpoPushMessage[],
  accessToken?: string
): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) return []

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
  }
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`

  // Expo accepts up to 100 messages per request
  const chunks: ExpoPushMessage[][] = []
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100))
  }

  const tickets: ExpoPushTicket[] = []
  for (const chunk of chunks) {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(chunk),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      throw new Error(`Expo push API error ${res.status}: ${text}`)
    }
    const json = (await res.json()) as { data: ExpoPushTicket[] }
    tickets.push(...json.data)
  }

  return tickets
}

export function isExpoToken(token: string): boolean {
  return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[")
}
