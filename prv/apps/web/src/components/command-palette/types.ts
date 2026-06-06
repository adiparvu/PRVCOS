export interface CommandEntry {
  id: string
  label: string
  description?: string
  shortcut?: string
  keywords?: string[]
  section: string
  badge?: string | number
  href?: string
  action?: () => void
}

export type EntityType =
  | "employee"
  | "project"
  | "client"
  | "invoice"
  | "document"
  | "vehicle"
  | "tool"
  | "product"
  | "team"

export type EntityStatus = "active" | "inactive" | "pending" | "review" | "planning" | "completed"

export interface EntityResult {
  id: string
  entityType: EntityType
  title: string
  subtitle?: string
  status?: EntityStatus
  href: string
}
