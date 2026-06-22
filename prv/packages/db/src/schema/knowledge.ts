import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"

export const articleFeedbackRatingEnum = pgEnum("article_feedback_rating", [
  "helpful",
  "not_helpful",
])

export const articleTypeEnum = pgEnum("article_type", ["sop", "policy", "guide", "faq"])

export const articleCategoryEnum = pgEnum("article_category", [
  "operations",
  "hr",
  "finance",
  "procurement",
  "fleet",
  "projects",
])

export const knowledgeSpaces = pgTable(
  "knowledge_spaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    icon: varchar("icon", { length: 50 }).default("book"),
    color: varchar("color", { length: 30 }).default("glass"),
    slug: varchar("slug", { length: 200 }).notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    articleCount: integer("article_count").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("knowledge_spaces_company_id_idx").on(t.companyId),
    unique("knowledge_spaces_company_slug_unique").on(t.companyId, t.slug),
  ]
)

export const knowledgeArticles = pgTable(
  "knowledge_articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),

    title: varchar("title", { length: 500 }).notNull(),
    type: articleTypeEnum("type").notNull().default("guide"),
    category: articleCategoryEnum("category").notNull().default("operations"),

    spaceId: uuid("space_id").references(() => knowledgeSpaces.id, { onDelete: "set null" }),
    content: text("content"),
    excerpt: text("excerpt"),
    aiTags: text("ai_tags"),
    version: varchar("version", { length: 20 }),
    isPinned: boolean("is_pinned").notNull().default(false),
    readMinutes: integer("read_minutes"),
    views: integer("views").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("knowledge_articles_company_id_idx").on(table.companyId),
    index("knowledge_articles_type_idx").on(table.type),
    index("knowledge_articles_category_idx").on(table.category),
    index("knowledge_articles_is_pinned_idx").on(table.isPinned),
  ]
)

export const articleReadProgress = pgTable(
  "article_read_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => knowledgeArticles.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    progressPct: integer("progress_pct").notNull().default(0),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("article_read_progress_article_user_unique").on(table.articleId, table.userId),
    index("article_read_progress_user_id_idx").on(table.userId),
  ]
)

export const articleFeedback = pgTable(
  "article_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => knowledgeArticles.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    rating: articleFeedbackRatingEnum("rating").notNull(),
    suggestion: text("suggestion"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("article_feedback_article_user_unique").on(t.articleId, t.userId),
    index("article_feedback_article_id_idx").on(t.articleId),
  ]
)

export const articleVersions = pgTable(
  "article_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => knowledgeArticles.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
    version: integer("version").notNull().default(1),
    title: varchar("title", { length: 500 }).notNull(),
    content: text("content"),
    changeNote: text("change_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("article_versions_article_id_idx").on(t.articleId),
    index("article_versions_company_id_idx").on(t.companyId),
  ]
)

export const knowledgeArticlesRelations = relations(knowledgeArticles, ({ one, many }) => ({
  company: one(companies, { fields: [knowledgeArticles.companyId], references: [companies.id] }),
  author: one(users, { fields: [knowledgeArticles.authorUserId], references: [users.id] }),
  readProgress: many(articleReadProgress),
  feedback: many(articleFeedback),
  versions: many(articleVersions),
}))

export const articleReadProgressRelations = relations(articleReadProgress, ({ one }) => ({
  article: one(knowledgeArticles, {
    fields: [articleReadProgress.articleId],
    references: [knowledgeArticles.id],
  }),
  user: one(users, { fields: [articleReadProgress.userId], references: [users.id] }),
  company: one(companies, { fields: [articleReadProgress.companyId], references: [companies.id] }),
}))

export const articleFeedbackRelations = relations(articleFeedback, ({ one }) => ({
  article: one(knowledgeArticles, {
    fields: [articleFeedback.articleId],
    references: [knowledgeArticles.id],
  }),
  user: one(users, { fields: [articleFeedback.userId], references: [users.id] }),
  company: one(companies, { fields: [articleFeedback.companyId], references: [companies.id] }),
}))

export const articleVersionsRelations = relations(articleVersions, ({ one }) => ({
  article: one(knowledgeArticles, {
    fields: [articleVersions.articleId],
    references: [knowledgeArticles.id],
  }),
  author: one(users, { fields: [articleVersions.authorUserId], references: [users.id] }),
  company: one(companies, { fields: [articleVersions.companyId], references: [companies.id] }),
}))
