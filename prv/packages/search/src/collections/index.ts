import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections"

// All Typesense collection schemas — defined here, created via bootstrap script
// Collections added as modules are implemented (Epic 02 onward)

// Every document includes company_id for multi-tenant filtering
const sharedFields = [
  { name: "company_id", type: "string" as const, facet: true, index: true },
  { name: "created_at", type: "int64" as const, sort: true },
] as const

export const collections = {
  users: {
    name: "users",
    fields: [
      ...sharedFields,
      { name: "id", type: "string" as const },
      { name: "full_name", type: "string" as const },
      { name: "email", type: "string" as const },
      { name: "role", type: "string" as const, facet: true },
      { name: "department", type: "string" as const, facet: true, optional: true },
    ],
    default_sorting_field: "created_at",
    enable_nested_fields: false,
  },

  projects: {
    name: "projects",
    fields: [
      ...sharedFields,
      { name: "id", type: "string" as const },
      { name: "title", type: "string" as const },
      { name: "status", type: "string" as const, facet: true },
      { name: "client_name", type: "string" as const, optional: true },
    ],
    default_sorting_field: "created_at",
    enable_nested_fields: false,
  },

  documents: {
    name: "documents",
    fields: [
      ...sharedFields,
      { name: "id", type: "string" as const },
      { name: "title", type: "string" as const },
      { name: "content_excerpt", type: "string" as const, optional: true },
      { name: "folder_path", type: "string" as const },
      { name: "mime_type", type: "string" as const, facet: true },
    ],
    default_sorting_field: "created_at",
    enable_nested_fields: false,
  },

  invoices: {
    name: "invoices",
    fields: [
      ...sharedFields,
      { name: "id", type: "string" as const },
      { name: "invoice_number", type: "string" as const },
      { name: "client_name", type: "string" as const },
      { name: "status", type: "string" as const, facet: true },
      { name: "total_amount", type: "float" as const, sort: true },
    ],
    default_sorting_field: "created_at",
    enable_nested_fields: false,
  },
} as const satisfies Record<string, Omit<CollectionCreateSchema, "fields"> & { fields: object[] }>

export type CollectionName = keyof typeof collections
