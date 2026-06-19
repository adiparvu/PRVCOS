import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"

// ─── Enums ────────────────────────────────────────────────────────────────────

export const channelTypeEnum = pgEnum("channel_type", ["public", "private", "announcement"])

export const channelMemberRoleEnum = pgEnum("channel_member_role", ["admin", "member"])

export const chatMessageTypeEnum = pgEnum("chat_message_type", ["text", "file", "image", "system"])

export const announcementAudienceEnum = pgEnum("announcement_audience", [
  "all",
  "managers",
  "employees",
  "department",
  "team",
])

// ─── Chat Channels ────────────────────────────────────────────────────────────

export const chatChannels = pgTable(
  "chat_channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    type: channelTypeEnum("type").notNull().default("public"),
    isArchived: boolean("is_archived").notNull().default(false),

    // last message denorm for fast inbox view
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    lastMessagePreview: varchar("last_message_preview", { length: 200 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("chat_channels_company_id_idx").on(table.companyId),
    index("chat_channels_type_idx").on(table.type),
    index("chat_channels_last_message_at_idx").on(table.lastMessageAt),
    unique("chat_channels_company_name_unique").on(table.companyId, table.name),
  ]
)

// ─── Channel Members ──────────────────────────────────────────────────────────

export const channelMembers = pgTable(
  "channel_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => chatChannels.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    role: channelMemberRoleEnum("role").notNull().default("member"),
    isMuted: boolean("is_muted").notNull().default(false),

    // last read position for unread badge
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),

    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("channel_members_channel_user_unique").on(table.channelId, table.userId),
    index("channel_members_channel_id_idx").on(table.channelId),
    index("channel_members_user_id_idx").on(table.userId),
    index("channel_members_company_id_idx").on(table.companyId),
  ]
)

// ─── Channel Messages ─────────────────────────────────────────────────────────

export const channelMessages = pgTable(
  "channel_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => chatChannels.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    content: text("content").notNull(),
    type: chatMessageTypeEnum("type").notNull().default("text"),

    // thread support
    parentId: uuid("parent_id"),
    threadCount: integer("thread_count").notNull().default(0),

    // reaction counts stored as jsonb: { "👍": 3, "❤️": 1 }
    reactions: jsonb("reactions").$type<Record<string, number>>().default({}),

    // attachment metadata for file/image messages
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

    // mention user IDs
    mentionedUserIds: uuid("mentioned_user_ids").array().default([]),

    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("channel_messages_channel_id_idx").on(table.channelId),
    index("channel_messages_user_id_idx").on(table.userId),
    index("channel_messages_company_id_idx").on(table.companyId),
    index("channel_messages_created_at_idx").on(table.createdAt),
    index("channel_messages_parent_id_idx").on(table.parentId),
  ]
)

// ─── Direct Message Conversations ─────────────────────────────────────────────

export const directConversations = pgTable(
  "direct_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    lastMessagePreview: varchar("last_message_preview", { length: 200 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("direct_conversations_company_id_idx").on(table.companyId),
    index("direct_conversations_last_message_at_idx").on(table.lastMessageAt),
  ]
)

// ─── DM Participants ──────────────────────────────────────────────────────────

export const dmParticipants = pgTable(
  "dm_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => directConversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    isMuted: boolean("is_muted").notNull().default(false),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("dm_participants_conv_user_unique").on(table.conversationId, table.userId),
    index("dm_participants_conversation_id_idx").on(table.conversationId),
    index("dm_participants_user_id_idx").on(table.userId),
    index("dm_participants_company_id_idx").on(table.companyId),
  ]
)

// ─── DM Messages ─────────────────────────────────────────────────────────────

export const dmMessages = pgTable(
  "dm_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => directConversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    content: text("content").notNull(),
    type: chatMessageTypeEnum("type").notNull().default("text"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("dm_messages_conversation_id_idx").on(table.conversationId),
    index("dm_messages_user_id_idx").on(table.userId),
    index("dm_messages_company_id_idx").on(table.companyId),
    index("dm_messages_created_at_idx").on(table.createdAt),
  ]
)

// ─── Announcements ────────────────────────────────────────────────────────────

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    title: varchar("title", { length: 300 }).notNull(),
    body: text("body").notNull(),

    audience: announcementAudienceEnum("audience").notNull().default("all"),
    // when audience is 'department' or 'team', store the target id
    audienceTargetId: uuid("audience_target_id"),

    isPinned: boolean("is_pinned").notNull().default(false),
    sendEmail: boolean("send_email").notNull().default(false),

    publishedAt: timestamp("published_at", { withTimezone: true }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),

    readCount: integer("read_count").notNull().default(0),
    totalAudience: integer("total_audience").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("announcements_company_id_idx").on(table.companyId),
    index("announcements_published_at_idx").on(table.publishedAt),
    index("announcements_scheduled_at_idx").on(table.scheduledAt),
    index("announcements_is_pinned_idx").on(table.isPinned),
  ]
)

// ─── Announcement Reads ───────────────────────────────────────────────────────

export const announcementReads = pgTable(
  "announcement_reads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    announcementId: uuid("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("announcement_reads_unique").on(table.announcementId, table.userId),
    index("announcement_reads_announcement_id_idx").on(table.announcementId),
    index("announcement_reads_user_id_idx").on(table.userId),
    index("announcement_reads_company_id_idx").on(table.companyId),
  ]
)

// ─── Relations ────────────────────────────────────────────────────────────────

export const chatChannelsRelations = relations(chatChannels, ({ one, many }) => ({
  company: one(companies, { fields: [chatChannels.companyId], references: [companies.id] }),
  createdBy: one(users, { fields: [chatChannels.createdByUserId], references: [users.id] }),
  members: many(channelMembers),
  messages: many(channelMessages),
}))

export const channelMembersRelations = relations(channelMembers, ({ one }) => ({
  channel: one(chatChannels, { fields: [channelMembers.channelId], references: [chatChannels.id] }),
  user: one(users, { fields: [channelMembers.userId], references: [users.id] }),
  company: one(companies, { fields: [channelMembers.companyId], references: [companies.id] }),
}))

export const channelMessagesRelations = relations(channelMessages, ({ one }) => ({
  channel: one(chatChannels, {
    fields: [channelMessages.channelId],
    references: [chatChannels.id],
  }),
  user: one(users, { fields: [channelMessages.userId], references: [users.id] }),
  company: one(companies, { fields: [channelMessages.companyId], references: [companies.id] }),
}))

export const directConversationsRelations = relations(directConversations, ({ one, many }) => ({
  company: one(companies, { fields: [directConversations.companyId], references: [companies.id] }),
  participants: many(dmParticipants),
  messages: many(dmMessages),
}))

export const dmParticipantsRelations = relations(dmParticipants, ({ one }) => ({
  conversation: one(directConversations, {
    fields: [dmParticipants.conversationId],
    references: [directConversations.id],
  }),
  user: one(users, { fields: [dmParticipants.userId], references: [users.id] }),
  company: one(companies, { fields: [dmParticipants.companyId], references: [companies.id] }),
}))

export const dmMessagesRelations = relations(dmMessages, ({ one }) => ({
  conversation: one(directConversations, {
    fields: [dmMessages.conversationId],
    references: [directConversations.id],
  }),
  user: one(users, { fields: [dmMessages.userId], references: [users.id] }),
  company: one(companies, { fields: [dmMessages.companyId], references: [companies.id] }),
}))

export const announcementsRelations = relations(announcements, ({ one, many }) => ({
  company: one(companies, { fields: [announcements.companyId], references: [companies.id] }),
  author: one(users, { fields: [announcements.authorUserId], references: [users.id] }),
  reads: many(announcementReads),
}))

export const announcementReadsRelations = relations(announcementReads, ({ one }) => ({
  announcement: one(announcements, {
    fields: [announcementReads.announcementId],
    references: [announcements.id],
  }),
  user: one(users, { fields: [announcementReads.userId], references: [users.id] }),
  company: one(companies, { fields: [announcementReads.companyId], references: [companies.id] }),
}))
