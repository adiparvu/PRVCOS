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

export const lessonTypeEnum = pgEnum("lesson_type", ["video", "text", "quiz", "document"])

export const lessonStatusEnum = pgEnum("lesson_status", ["draft", "published"])

export const quizAttemptStatusEnum = pgEnum("quiz_attempt_status", ["passed", "failed"])

export const mandatoryAssignmentStatusEnum = pgEnum("mandatory_assignment_status", [
  "pending",
  "in_progress",
  "completed",
  "overdue",
])

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
    description: text("description"),
    category: courseCategoryEnum("category").notNull().default("safety"),

    totalModules: integer("total_modules").notNull().default(1),
    durationMinutes: integer("duration_minutes").notNull().default(0),
    hasCert: boolean("has_cert").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    passScore: integer("pass_score").notNull().default(70),
    totalLessons: integer("total_lessons").notNull().default(0),
    isMandatory: boolean("is_mandatory").notNull().default(false),

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

export const courseModules = pgTable(
  "course_modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => learningCourses.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("course_modules_course_id_idx").on(table.courseId)]
)

export const courseLessons = pgTable(
  "course_lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => learningCourses.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id").references(() => courseModules.id, { onDelete: "set null" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    type: lessonTypeEnum("type").default("text"),
    content: text("content"),
    durationMinutes: integer("duration_minutes").default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").default(true),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("course_lessons_course_id_idx").on(table.courseId),
    index("course_lessons_module_id_idx").on(table.moduleId),
  ]
)

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => courseLessons.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => learningCourses.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
    timeSpentSeconds: integer("time_spent_seconds").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("lesson_progress_lesson_user_unique").on(table.lessonId, table.userId),
    index("lesson_progress_user_course_idx").on(table.userId, table.courseId),
  ]
)

export const quizQuestions = pgTable(
  "quiz_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => courseLessons.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    questionText: text("question_text").notNull(),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("quiz_questions_lesson_id_idx").on(table.lessonId)]
)

export const quizOptions = pgTable(
  "quiz_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => quizQuestions.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    optionText: text("option_text").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    explanation: text("explanation"),
    sortOrder: integer("sort_order").default(0),
  },
  (table) => [index("quiz_options_question_id_idx").on(table.questionId)]
)

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => courseLessons.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => learningCourses.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    status: quizAttemptStatusEnum("status").notNull(),
    totalQuestions: integer("total_questions").notNull(),
    correctAnswers: integer("correct_answers").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("quiz_attempts_user_lesson_idx").on(table.userId, table.lessonId)]
)

export const courseCertificates = pgTable(
  "course_certificates",
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
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    certificateUrl: text("certificate_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("course_certificates_course_user_unique").on(table.courseId, table.userId),
    index("course_certificates_user_id_idx").on(table.userId),
  ]
)

export const courseMandatoryAssignments = pgTable(
  "course_mandatory_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => learningCourses.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    targetRole: varchar("target_role", { length: 255 }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    dueDate: timestamp("due_date", { withTimezone: true }),
    assignedBy: uuid("assigned_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("course_mandatory_assignments_course_id_idx").on(table.courseId),
    index("course_mandatory_assignments_company_id_idx").on(table.companyId),
  ]
)

export const learningCoursesRelations = relations(learningCourses, ({ one, many }) => ({
  company: one(companies, { fields: [learningCourses.companyId], references: [companies.id] }),
  instructor: one(users, {
    fields: [learningCourses.instructorUserId],
    references: [users.id],
  }),
  enrollments: many(courseEnrollments),
  modules: many(courseModules),
  lessons: many(courseLessons),
  certificates: many(courseCertificates),
  mandatoryAssignments: many(courseMandatoryAssignments),
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

export const courseModulesRelations = relations(courseModules, ({ one, many }) => ({
  course: one(learningCourses, {
    fields: [courseModules.courseId],
    references: [learningCourses.id],
  }),
  company: one(companies, { fields: [courseModules.companyId], references: [companies.id] }),
  lessons: many(courseLessons),
}))

export const courseLessonsRelations = relations(courseLessons, ({ one, many }) => ({
  course: one(learningCourses, {
    fields: [courseLessons.courseId],
    references: [learningCourses.id],
  }),
  module: one(courseModules, {
    fields: [courseLessons.moduleId],
    references: [courseModules.id],
  }),
  company: one(companies, { fields: [courseLessons.companyId], references: [companies.id] }),
  progress: many(lessonProgress),
  questions: many(quizQuestions),
  attempts: many(quizAttempts),
}))

export const lessonProgressRelations = relations(lessonProgress, ({ one }) => ({
  lesson: one(courseLessons, {
    fields: [lessonProgress.lessonId],
    references: [courseLessons.id],
  }),
  user: one(users, { fields: [lessonProgress.userId], references: [users.id] }),
  company: one(companies, { fields: [lessonProgress.companyId], references: [companies.id] }),
  course: one(learningCourses, {
    fields: [lessonProgress.courseId],
    references: [learningCourses.id],
  }),
}))

export const quizQuestionsRelations = relations(quizQuestions, ({ one, many }) => ({
  lesson: one(courseLessons, {
    fields: [quizQuestions.lessonId],
    references: [courseLessons.id],
  }),
  company: one(companies, { fields: [quizQuestions.companyId], references: [companies.id] }),
  options: many(quizOptions),
}))

export const quizOptionsRelations = relations(quizOptions, ({ one }) => ({
  question: one(quizQuestions, {
    fields: [quizOptions.questionId],
    references: [quizQuestions.id],
  }),
  company: one(companies, { fields: [quizOptions.companyId], references: [companies.id] }),
}))

export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
  lesson: one(courseLessons, {
    fields: [quizAttempts.lessonId],
    references: [courseLessons.id],
  }),
  user: one(users, { fields: [quizAttempts.userId], references: [users.id] }),
  company: one(companies, { fields: [quizAttempts.companyId], references: [companies.id] }),
  course: one(learningCourses, {
    fields: [quizAttempts.courseId],
    references: [learningCourses.id],
  }),
}))

export const courseCertificatesRelations = relations(courseCertificates, ({ one }) => ({
  course: one(learningCourses, {
    fields: [courseCertificates.courseId],
    references: [learningCourses.id],
  }),
  user: one(users, { fields: [courseCertificates.userId], references: [users.id] }),
  company: one(companies, { fields: [courseCertificates.companyId], references: [companies.id] }),
}))

export const courseMandatoryAssignmentsRelations = relations(
  courseMandatoryAssignments,
  ({ one }) => ({
    course: one(learningCourses, {
      fields: [courseMandatoryAssignments.courseId],
      references: [learningCourses.id],
    }),
    company: one(companies, {
      fields: [courseMandatoryAssignments.companyId],
      references: [companies.id],
    }),
    user: one(users, {
      fields: [courseMandatoryAssignments.userId],
      references: [users.id],
      relationName: "assignedToUser",
    }),
    assignedByUser: one(users, {
      fields: [courseMandatoryAssignments.assignedBy],
      references: [users.id],
      relationName: "assignedByUser",
    }),
  })
)
