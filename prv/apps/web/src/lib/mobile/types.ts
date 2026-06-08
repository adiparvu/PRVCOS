// Canonical types for the mobile API — must stay in sync with
// apps/mobile/src/hooks/useCommand.ts

export interface KPIItem {
  value: string
  label: string
  delta: string | null
  deltaType: "up" | "down" | "neutral"
  valueColor?: string
}

export interface AlertItem {
  id: string
  severity: "amber" | "red"
  title: string
  subtitle: string
  timeAgo: string
}

export interface InboxItem {
  id: string
  initials: string
  sender: string
  preview: string
  timeAgo: string
  unread: boolean
}

export interface QuickAction {
  id: string
  icon: string
  label: string
  route: string
}

export interface CommandData {
  user: {
    firstName: string
    role: string
    scopeName: string
  }
  kpis: KPIItem[]
  secondary: {
    label: string
    value: string
    valueColor?: string
  }[]
  aiBriefing: {
    summary: string
    insights: string[]
  } | null
  alerts: AlertItem[]
  quickActions: QuickAction[]
  inbox: InboxItem[]
}
