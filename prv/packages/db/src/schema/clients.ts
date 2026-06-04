import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"

export const clientTypeEnum = pgEnum("client_type", ["individual", "business"])
export const clientStatusEnum = pgEnum("client_status", [
  "active",
  "inactive",
  "prospect",
  "archived",
])

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    assignedUserId: uuid("assigned_user_id").references(() => users.id, { onDelete: "set null" }),

    type: clientTypeEnum("type").notNull().default("business"),
    status: clientStatusEnum("status").notNull().default("prospect"),

    name: varchar("name", { length: 255 }).notNull(),
    vatNumber: varchar("vat_number", { length: 50 }),
    registrationNumber: varchar("registration_number", { length: 50 }),

    email: varchar("email", { length: 254 }),
    phone: varchar("phone", { length: 32 }),
    website: text("website"),

    country: varchar("country", { length: 2 }).notNull().default("RO"),
    city: varchar("city", { length: 100 }),
    address: text("address"),
    postalCode: varchar("postal_code", { length: 20 }),

    notes: text("notes"),
    tags: jsonb("tags").notNull().default([]),
    metadata: jsonb("metadata").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    index("clients_company_id_idx").on(table.companyId),
    index("clients_assigned_user_id_idx").on(table.assignedUserId),
  ]
)

export const clientContacts = pgTable(
  "client_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    jobTitle: varchar("job_title", { length: 255 }),
    email: varchar("email", { length: 254 }),
    phone: varchar("phone", { length: 32 }),
    isPrimary: boolean("is_primary").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("client_contacts_client_id_idx").on(table.clientId)]
)

export const clientsRelations = relations(clients, ({ one, many }) => ({
  company: one(companies, { fields: [clients.companyId], references: [companies.id] }),
  assignedUser: one(users, { fields: [clients.assignedUserId], references: [users.id] }),
  contacts: many(clientContacts),
}))

export const clientContactsRelations = relations(clientContacts, ({ one }) => ({
  client: one(clients, { fields: [clientContacts.clientId], references: [clients.id] }),
  company: one(companies, { fields: [clientContacts.companyId], references: [companies.id] }),
}))
