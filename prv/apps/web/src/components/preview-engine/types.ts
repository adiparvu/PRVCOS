// ─── Entity Types ─────────────────────────────────────────────────────────────

export type EntityType =
  | "employee"
  | "client"
  | "supplier"
  | "project"
  | "product"
  | "order"
  | "invoice"
  | "document"
  | "vehicle"
  | "tool"
  | "team"
  | "company"

export type RendererType =
  | "person"
  | "project"
  | "product"
  | "finance"
  | "document"
  | "asset"
  | "team"
  | "generic"

// ─── Preview Actions ──────────────────────────────────────────────────────────

export interface PreviewAction {
  id: string
  label: string
  icon: string // SVG path d= string
  requiredPermission?: string
  destructive?: boolean
  href?: string
  onClick?: string // action identifier, handled by consumer
}

// ─── Entity Config ────────────────────────────────────────────────────────────

export interface EntityConfig {
  entityType: EntityType
  requiredPermission: string
  renderer: RendererType
  modules: Array<"presence" | "social" | "business_card" | "context_menu">
  primaryDestination: string
  contextActions: PreviewAction[]
}

// ─── Preview Payload — what the API returns ───────────────────────────────────

export interface PresenceInfo {
  status: string
  statusMessage: string | null
  lastSeenAt: string
}

export interface MetadataRow {
  label: string
  value: string
}

export interface PreviewPayload {
  entityType: EntityType
  id: string
  name: string
  subtitle: string | null
  avatarUrl: string | null
  iconPath: string | null // SF Symbol-style SVG path for non-person entities
  presence: PresenceInfo | null // only for person entities
  metadata: MetadataRow[] // ordered key-value pairs
  socialCount: number // social profiles count (person entities)
  hasBusinessCard: boolean
  actions: PreviewAction[] // permission-filtered at API layer
}

// ─── Sheet State ──────────────────────────────────────────────────────────────

export type SheetState = "closed" | "partial" | "full"

export interface PreviewEngineState {
  isOpen: boolean
  sheetState: SheetState
  entityType: EntityType | null
  entityId: string | null
}
