import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams, useRouter } from "expo-router"
import {
  useCourseDetail,
  useEnrollCourse,
  useUpdateCourseProgress,
} from "@/hooks/useLearning"
import { colors, radius, spacing } from "@/tokens"

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIcon}>
        <Text style={s.infoIconText}>{icon}</Text>
      </View>
      <View style={s.infoContent}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  )
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <View style={s.progressTrack}>
      <View style={[s.progressFill, { width: `${pct}%` }]} />
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CourseDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data, isLoading, isError, refetch } = useCourseDetail(id ?? "")
  const { mutate: enroll, isPending: isEnrolling } = useEnrollCourse(id ?? "")
  const { mutate: updateProgress, isPending: isUpdating } = useUpdateCourseProgress(id ?? "")

  if (isLoading) {
    return (
      <View style={[s.root, s.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.text3} />
      </View>
    )
  }

  if (isError || !data) {
    return (
      <View style={[s.root, s.center, { paddingTop: insets.top }]}>
        <Text style={s.errText}>Could not load course.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => void refetch()} activeOpacity={0.8}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const { course } = data

  const isNew = course.status === "new" || course.status === "saved"
  const isInProgress = course.status === "in_progress"
  const isCompleted = course.status === "completed"

  const stars = "★".repeat(Math.round(course.rating)) + "☆".repeat(5 - Math.round(course.rating))

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Nav */}
      <View style={s.navbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navTitle} numberOfLines={1}>{course.categoryLabel}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroShine} pointerEvents="none" />

          <View style={s.heroHeader}>
            {isCompleted ? (
              <View style={s.certBadge}>
                <Text style={s.certBadgeText}>✓ Completed</Text>
              </View>
            ) : course.isFeatured ? (
              <View style={s.featuredBadge}>
                <Text style={s.featuredBadgeText}>Featured</Text>
              </View>
            ) : null}
          </View>

          <Text style={s.heroTitle} numberOfLines={3}>{course.title}</Text>
          {course.subtitle ? (
            <Text style={s.heroSubtitle} numberOfLines={2}>{course.subtitle}</Text>
          ) : null}

          <View style={s.heroMeta}>
            <Text style={s.heroMetaText}>{course.instructorName}</Text>
            <Text style={s.heroMetaDot}>·</Text>
            <Text style={s.heroMetaText}>{course.durationLabel}</Text>
            <Text style={s.heroMetaDot}>·</Text>
            <Text style={s.heroMetaText}>{course.totalModules} modules</Text>
          </View>

          {/* Progress (if enrolled) */}
          {isInProgress ? (
            <View style={s.progressSection}>
              <View style={s.progressLabelRow}>
                <Text style={s.progressLabel}>Progress</Text>
                <Text style={s.progressPct}>{course.progress}%</Text>
              </View>
              <ProgressBar value={course.progress} />
            </View>
          ) : null}
        </View>

        {/* Primary CTA */}
        {isNew ? (
          <TouchableOpacity
            style={s.enrollBtn}
            activeOpacity={0.8}
            onPress={() => enroll()}
            disabled={isEnrolling}
          >
            <View style={s.actionShine} pointerEvents="none" />
            {isEnrolling ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <>
                <Text style={s.enrollIcon}>▶</Text>
                <Text style={s.enrollLabel}>Start Course</Text>
              </>
            )}
          </TouchableOpacity>
        ) : isInProgress ? (
          <TouchableOpacity
            style={s.continueBtn}
            activeOpacity={0.8}
            onPress={() => updateProgress({ progressPct: Math.min(100, course.progress + 10) })}
            disabled={isUpdating}
          >
            <View style={s.actionShine} pointerEvents="none" />
            {isUpdating ? (
              <ActivityIndicator color={colors.text1} />
            ) : (
              <>
                <Text style={s.continueIcon}>↻</Text>
                <Text style={s.continueLabel}>Continue Learning</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {/* Mark complete (if in_progress and near end) */}
        {isInProgress && course.progress >= 80 ? (
          <TouchableOpacity
            style={s.completeBtn}
            activeOpacity={0.8}
            onPress={() => updateProgress({ progressPct: 100, status: "completed" })}
            disabled={isUpdating}
          >
            <Text style={s.completeBtnText}>Mark as Complete</Text>
          </TouchableOpacity>
        ) : null}

        {/* Details card */}
        <View style={s.card}>
          <View style={s.cardShine} pointerEvents="none" />
          <InfoRow icon="◉" label="Category" value={course.categoryLabel} />
          <InfoRow icon="◎" label="Instructor" value={course.instructorName} />
          <InfoRow icon="◴" label="Duration" value={course.durationLabel} />
          <InfoRow icon="☰" label="Modules" value={`${course.totalModules} modules`} />
          {course.hasCert ? (
            <InfoRow icon="✦" label="Certificate" value="Included on completion" />
          ) : null}
          <InfoRow icon="★" label="Rating" value={`${stars}  ${course.rating}/5 (${course.reviewCount})`} />
          <InfoRow icon="◷" label="Updated" value={course.updatedDate} />
        </View>
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },

  navbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 22, color: colors.text1, lineHeight: 26, marginTop: -1 },
  navTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    color: colors.text1,
    letterSpacing: -0.3,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  hero: {
    backgroundColor: colors.glass1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  heroShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shine,
  },
  heroHeader: { flexDirection: "row", marginBottom: spacing.sm },
  certBadge: {
    backgroundColor: "rgba(34,197,94,0.15)",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  certBadgeText: { fontSize: 12, fontWeight: "600", color: colors.green },
  featuredBadge: {
    backgroundColor: colors.glass2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  featuredBadgeText: { fontSize: 12, fontWeight: "600", color: colors.text2 },

  heroTitle: { fontSize: 22, fontWeight: "700", color: colors.text1, letterSpacing: -0.5, marginBottom: 6 },
  heroSubtitle: { fontSize: 14, color: colors.text2, marginBottom: spacing.sm },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroMetaText: { fontSize: 13, color: colors.text3 },
  heroMetaDot: { fontSize: 13, color: colors.text4 },

  progressSection: { marginTop: spacing.md },
  progressLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressLabel: { fontSize: 13, color: colors.text3 },
  progressPct: { fontSize: 13, fontWeight: "600", color: colors.text2 },
  progressTrack: {
    height: 4,
    backgroundColor: colors.glass2,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.text1, borderRadius: 2 },

  enrollBtn: {
    backgroundColor: colors.text1,
    borderRadius: radius.base,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  continueBtn: {
    backgroundColor: colors.glass2,
    borderRadius: radius.base,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  actionShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shine,
  },
  enrollIcon: { fontSize: 15, color: colors.bg },
  enrollLabel: { fontSize: 16, fontWeight: "600", color: colors.bg },
  continueIcon: { fontSize: 16, color: colors.text1 },
  continueLabel: { fontSize: 16, fontWeight: "600", color: colors.text1 },

  completeBtn: {
    backgroundColor: "transparent",
    borderRadius: radius.base,
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  completeBtnText: { fontSize: 14, color: colors.text2, fontWeight: "500" },

  card: {
    backgroundColor: colors.glass1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  cardShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shine,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoIcon: {
    width: 32,
    height: 32,
    backgroundColor: colors.glass2,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  infoIconText: { fontSize: 14, color: colors.text2 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: colors.text3, marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.4 },
  infoValue: { fontSize: 14, color: colors.text1, fontWeight: "500" },

  errText: { fontSize: 15, color: colors.text2, marginBottom: spacing.md },
  retryBtn: {
    backgroundColor: colors.glass1,
    borderRadius: radius.base,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: { fontSize: 14, color: colors.text2, fontWeight: "500" },
})
