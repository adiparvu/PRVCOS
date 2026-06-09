import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  real,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"

export const courseCategoryEnum = pgEnum("course_category", [
  "safety",
  "leadership",
  "digital",
  "finance",
  "renovation",
  "compliance",
])

export const courseEnrollmentStatusEnum = pgEnum("course_enrollment_status", [
  "new",
  "in_progress",
  "completed",
  "saved",
])

export const achievementColorEnum = pgEnum("achievement_color", ["amber", "green"])

// ─── Courses ─────────────────────────────────────────────────────────────────

export const learningCourses = pgTable(
  "learning_courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    instructorUserId: uuid("instructor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    title: varchar("title", { length: 500 }).notNull(),
    subtitle: text("subtitle"),
    category: courseCategoryEnum("category").notNull().default("safety"),

    totalModules: integer("total_modules").notNull().default(1),
    durationMinutes: integer("duration_minutes").notNull().default(0),
    hasCert: boolean("has_cert").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),

    rating: real("rating").notNull().default(0),
    reviewCount: integer("review_count").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("learning_courses_company_id_idx").on(table.companyId),
    index("learning_courses_category_idx").on(table.category),
  ]
)

// ─── Enrollments ─────────────────────────────────────────────────────────────

export const courseEnrollments = pgTable(
  "course_enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => learningCourses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    status: courseEnrollmentStatusEnum("status").notNull().default("new"),
    progressPct: integer("progress_pct").notNull().default(0),
    currentModule: integer("current_module").notNull().default(0),

    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("course_enrollments_course_user_unique").on(table.courseId, table.userId),
    index("course_enrollments_user_id_idx").on(table.userId),
    index("course_enrollments_company_id_idx").on(table.companyId),
  ]
)

// ─── Achievements ────────────────────────────────────────────────────────────

export const userAchievements = pgTable(
  "user_achievements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    label: varchar("label", { length: 255 }).notNull(),
    detail: text("detail"),
    colorType: achievementColorEnum("color_type").notNull().default("green"),
    achievedAt: timestamp("achieved_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("user_achievements_user_id_idx").on(table.userId),
    index("user_achievements_company_id_idx").on(table.companyId),
  ]
)

// ─── Relations ───────────────────────────────────────────────────────────────

export const learningCoursesRelations = relations(learningCourses, ({ one, many }) => ({
  company: one(companies, { fields: [learningCourses.companyId], references: [companies.id] }),
  instructor: one(users, {
    fields: [learningCourses.instructorUserId],
    references: [users.id],
  }),
  enrollments: many(courseEnrollments),
}))

export const courseEnrollmentsRelations = relations(courseEnrollments, ({ one }) => ({
  course: one(learningCourses, {
    fields: [courseEnrollments.courseId],
    references: [learningCourses.id],
  }),
  user: one(users, { fields: [courseEnrollments.userId], references: [users.id] }),
  company: one(companies, { fields: [courseEnrollments.companyId], references: [companies.id] }),
}))

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, { fields: [userAchievements.userId], references: [users.id] }),
  company: one(companies, { fields: [userAchievements.companyId], references: [companies.id] }),
}))
