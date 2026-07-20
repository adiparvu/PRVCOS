import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  date,
  timestamp,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"

// Structured performance reviews (roadmap 8.4). Review cycles (annual /
// semi-annual / quarterly) and per-employee review submissions that move through
// a self → manager → HR → sign-off workflow, each stage capturing a rating and
// comments. Company-scoped.
export const reviewCadenceEnum = pgEnum("review_cadence", ["annual", "semi_annual", "quarterly"])
export const reviewCycleStatusEnum = pgEnum("review_cycle_status", ["draft", "active", "closed"])
export const reviewStageEnum = pgEnum("review_stage", [
  "self_review",
  "manager_review",
  "hr_review",
  "signed_off",
])

export const reviewCycles = pgTable(
  "review_cycles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    cadence: reviewCadenceEnum("cadence").notNull().default("annual"),
    status: reviewCycleStatusEnum("status").notNull().default("draft"),
    periodStart: date("period_start"),
    periodEnd: date("period_end"),
    dueDate: date("due_date"),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("review_cycles_company_id_idx").on(table.companyId)]
)

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    cycleId: uuid("cycle_id")
      .notNull()
      .references(() => reviewCycles.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "set null" }),
    stage: reviewStageEnum("stage").notNull().default("self_review"),
    selfRating: integer("self_rating"),
    managerRating: integer("manager_rating"),
    hrRating: integer("hr_rating"),
    overallRating: integer("overall_rating"),
    selfComments: text("self_comments"),
    managerComments: text("manager_comments"),
    hrComments: text("hr_comments"),
    signedOffAt: timestamp("signed_off_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("reviews_cycle_user_unique").on(table.cycleId, table.userId),
    index("reviews_company_id_idx").on(table.companyId),
    index("reviews_cycle_id_idx").on(table.cycleId),
    index("reviews_user_id_idx").on(table.userId),
  ]
)

// 360° peer feedback (roadmap 8.4). A review can request feedback from any
// number of peers; each peer independently submits a 1–5 rating and comments, or
// declines. The aggregate complements the self/manager/HR dimensions already on
// the review row. One request per (review, peer). A peer is never the review
// subject (enforced at the API). Confidentiality: the review SUBJECT sees only
// the aggregate; managers/HR see attributed detail.
export const peerFeedbackStatusEnum = pgEnum("peer_feedback_status", [
  "pending",
  "submitted",
  "declined",
])

export const reviewPeerFeedback = pgTable(
  "review_peer_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    peerId: uuid("peer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    requestedById: uuid("requested_by_id").references(() => users.id, { onDelete: "set null" }),
    status: peerFeedbackStatusEnum("status").notNull().default("pending"),
    rating: integer("rating"),
    comments: text("comments"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (table) => [
    unique("review_peer_feedback_review_peer_unique").on(table.reviewId, table.peerId),
    index("review_peer_feedback_company_id_idx").on(table.companyId),
    index("review_peer_feedback_review_id_idx").on(table.reviewId),
    index("review_peer_feedback_peer_id_idx").on(table.peerId),
  ]
)

export const reviewPeerFeedbackRelations = relations(reviewPeerFeedback, ({ one }) => ({
  company: one(companies, {
    fields: [reviewPeerFeedback.companyId],
    references: [companies.id],
  }),
  review: one(reviews, { fields: [reviewPeerFeedback.reviewId], references: [reviews.id] }),
  peer: one(users, { fields: [reviewPeerFeedback.peerId], references: [users.id] }),
}))

export const reviewCyclesRelations = relations(reviewCycles, ({ one, many }) => ({
  company: one(companies, { fields: [reviewCycles.companyId], references: [companies.id] }),
  reviews: many(reviews),
}))

export const reviewsRelations = relations(reviews, ({ one }) => ({
  company: one(companies, { fields: [reviews.companyId], references: [companies.id] }),
  cycle: one(reviewCycles, { fields: [reviews.cycleId], references: [reviewCycles.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
}))

export type ReviewCadence = (typeof reviewCadenceEnum.enumValues)[number]
export type ReviewStage = (typeof reviewStageEnum.enumValues)[number]
export type PeerFeedbackStatus = (typeof peerFeedbackStatusEnum.enumValues)[number]
