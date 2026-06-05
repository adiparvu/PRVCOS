import type { EntityConfig, EntityType } from "./types"

const VIEW_ICON = "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
const EDIT_ICON =
  "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"
const MAIL_ICON =
  "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2ZM22 6l-10 7L2 6"
const PHONE_ICON =
  "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 13 19.79 19.79 0 0 1 1 4.18 2 2 0 0 1 2.98 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 17Z"
const ARCHIVE_ICON = "M21 8v13H3V8M1 3h22v5H1ZM10 12h4"
const TRASH_ICON =
  "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
const SHARE_ICON = "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"
const CARD_ICON =
  "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2ZM16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"

const ENTITY_REGISTRY: Record<EntityType, EntityConfig> = {
  employee: {
    entityType: "employee",
    requiredPermission: "presence.view_team",
    renderer: "person",
    modules: ["presence", "social", "business_card", "context_menu"],
    primaryDestination: "/people/[id]",
    contextActions: [
      { id: "view", label: "View Profile", icon: VIEW_ICON },
      { id: "mail", label: "Send Email", icon: MAIL_ICON },
      { id: "call", label: "Call", icon: PHONE_ICON },
      {
        id: "share_card",
        label: "Share Card",
        icon: CARD_ICON,
        requiredPermission: "business_card.view_others",
      },
      {
        id: "edit",
        label: "Edit Profile",
        icon: EDIT_ICON,
        requiredPermission: "employees.update",
      },
    ],
  },
  client: {
    entityType: "client",
    requiredPermission: "clients.read",
    renderer: "person",
    modules: ["social", "context_menu"],
    primaryDestination: "/crm/clients/[id]",
    contextActions: [
      { id: "view", label: "View Client", icon: VIEW_ICON },
      { id: "mail", label: "Send Email", icon: MAIL_ICON },
      { id: "edit", label: "Edit", icon: EDIT_ICON, requiredPermission: "clients.update" },
      {
        id: "archive",
        label: "Archive",
        icon: ARCHIVE_ICON,
        requiredPermission: "clients.delete",
        destructive: true,
      },
    ],
  },
  supplier: {
    entityType: "supplier",
    requiredPermission: "suppliers.read",
    renderer: "person",
    modules: ["context_menu"],
    primaryDestination: "/suppliers/[id]",
    contextActions: [
      { id: "view", label: "View Supplier", icon: VIEW_ICON },
      { id: "edit", label: "Edit", icon: EDIT_ICON, requiredPermission: "suppliers.update" },
    ],
  },
  project: {
    entityType: "project",
    requiredPermission: "projects.read",
    renderer: "project",
    modules: ["context_menu"],
    primaryDestination: "/projects/[id]",
    contextActions: [
      { id: "view", label: "View Project", icon: VIEW_ICON },
      { id: "edit", label: "Edit", icon: EDIT_ICON, requiredPermission: "projects.update" },
      {
        id: "archive",
        label: "Archive",
        icon: ARCHIVE_ICON,
        requiredPermission: "projects.archive",
        destructive: true,
      },
    ],
  },
  product: {
    entityType: "product",
    requiredPermission: "products.read",
    renderer: "product",
    modules: ["context_menu"],
    primaryDestination: "/shop/products/[id]",
    contextActions: [
      { id: "view", label: "View Product", icon: VIEW_ICON },
      { id: "edit", label: "Edit", icon: EDIT_ICON, requiredPermission: "products.update" },
      { id: "share", label: "Share", icon: SHARE_ICON },
    ],
  },
  order: {
    entityType: "order",
    requiredPermission: "orders.read",
    renderer: "product",
    modules: ["context_menu"],
    primaryDestination: "/shop/orders/[id]",
    contextActions: [
      { id: "view", label: "View Order", icon: VIEW_ICON },
      { id: "edit", label: "Update Status", icon: EDIT_ICON, requiredPermission: "orders.update" },
    ],
  },
  invoice: {
    entityType: "invoice",
    requiredPermission: "invoices.read",
    renderer: "finance",
    modules: ["context_menu"],
    primaryDestination: "/finance/invoices/[id]",
    contextActions: [
      { id: "view", label: "View Invoice", icon: VIEW_ICON },
      { id: "send", label: "Send", icon: MAIL_ICON, requiredPermission: "invoices.send" },
      { id: "edit", label: "Edit", icon: EDIT_ICON, requiredPermission: "invoices.update" },
      {
        id: "delete",
        label: "Delete",
        icon: TRASH_ICON,
        requiredPermission: "invoices.delete",
        destructive: true,
      },
    ],
  },
  document: {
    entityType: "document",
    requiredPermission: "documents.read",
    renderer: "document",
    modules: ["context_menu"],
    primaryDestination: "/documents/[id]",
    contextActions: [
      { id: "view", label: "View Document", icon: VIEW_ICON },
      { id: "share", label: "Share", icon: SHARE_ICON },
      { id: "edit", label: "Edit", icon: EDIT_ICON, requiredPermission: "documents.update" },
    ],
  },
  vehicle: {
    entityType: "vehicle",
    requiredPermission: "fleet.read",
    renderer: "asset",
    modules: ["context_menu"],
    primaryDestination: "/fleet/vehicles/[id]",
    contextActions: [
      { id: "view", label: "View Vehicle", icon: VIEW_ICON },
      { id: "edit", label: "Edit", icon: EDIT_ICON, requiredPermission: "fleet.update" },
    ],
  },
  tool: {
    entityType: "tool",
    requiredPermission: "tools.read",
    renderer: "asset",
    modules: ["context_menu"],
    primaryDestination: "/fleet/tools/[id]",
    contextActions: [
      { id: "view", label: "View Tool", icon: VIEW_ICON },
      { id: "edit", label: "Edit", icon: EDIT_ICON, requiredPermission: "tools.update" },
    ],
  },
  team: {
    entityType: "team",
    requiredPermission: "teams.read",
    renderer: "team",
    modules: ["context_menu"],
    primaryDestination: "/people/teams/[id]",
    contextActions: [
      { id: "view", label: "View Team", icon: VIEW_ICON },
      { id: "edit", label: "Edit Team", icon: EDIT_ICON, requiredPermission: "teams.update" },
    ],
  },
  company: {
    entityType: "company",
    requiredPermission: "companies.read",
    renderer: "team",
    modules: ["context_menu"],
    primaryDestination: "/companies/[id]",
    contextActions: [
      { id: "view", label: "View Company", icon: VIEW_ICON },
      {
        id: "edit",
        label: "Edit Settings",
        icon: EDIT_ICON,
        requiredPermission: "companies.update",
      },
    ],
  },
}

export function getEntityConfig(entityType: EntityType): EntityConfig {
  return ENTITY_REGISTRY[entityType]
}

export function getAllEntityTypes(): EntityType[] {
  return Object.keys(ENTITY_REGISTRY) as EntityType[]
}
