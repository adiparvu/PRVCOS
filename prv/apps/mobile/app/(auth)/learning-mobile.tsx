import { useState } from "react"
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { GlassCard } from "@/components/Glass"
import { SkeletonRow } from "@/components/Skeleton"
import {
  useLearning,
  type CourseItem,
  type CourseStatus,
  type CourseCategory,
} from "@/hooks/useLearning"
import { colors, radius, spacing, type as t } from "@/tokens"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_GLYPH: Record<CourseCategory, string> = {
  safety: "◌",
  leadership: "◎",
  digital: "⊞",
  finance: "⟁",
  renovation: "◈",
  compliance: "◉",
}

function statusColor(status: CourseStatus): string {
  switch (status) {
    case "in_progress":
      return colors.amber
    case "completed":
      return colors.green
    case "saved":
      return "#64d2ff"
    default:
      return colors.text3
  }
}

function statusBg(status: CourseStatus): string {
  switch (status) {
    case "in_progress":
      return "rgba(255,159,10,0.12)"
    case "completed":
      return "rgba(48,209,88,0.12)"
    case "saved":
      return "rgba(100,210,255,0.12)"
    default:
      return colors.glass1
  }
}

function statusLabel(status: CourseStatus): string {
  switch (status) {
    case "in_progress":
      return "In Progress"
    case "completed":
      return "Done"
    case "saved":
      return "Saved"
    default:
      return "New"
  }
}

type FilterKey = "all" | CourseStatus

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "in_progress", label: "In Progress" },
  { key: "new", label: "New" },
  { key: "completed", label: "Completed" },
  { key: "saved", label: "Saved" },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetaChip({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string | number
  valueColor?: string
}) {
  return (
    <View style={s.metaChip}>
      <View style={s.metaChipShine} pointerEvents="none" />
      <Text style={[s.metaChipValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      <Text style={s.metaChipLabel}>{label}</Text>
    </View>
  )
}

function CourseCard({ item }: { item: CourseItem }) {
  const router = useRouter()
  const glyph = CATEGORY_GLYPH[item.category] ?? "◈"
  const sc = statusColor(item.status)
  const sb = statusBg(item.status)
  const sl = statusLabel(item.status)

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: "/(auth)/course-detail", params: { id: item.id } })}
    >
      <GlassCard style={s.courseCard}>
        <View style={s.cardShine} pointerEvents="none" />
        <View style={s.courseRow}>
          {/* Left icon */}
          <View style={s.courseCircle}>
            <Text style={s.courseGlyph}>{glyph}</Text>
          </View>

          {/* Center info */}
          <View style={s.courseInfo}>
            <Text style={s.courseTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {item.subtitle ? (
              <Text style={s.courseSub} numberOfLines={1}>
                {item.subtitle}
              </Text>
            ) : null}
            <Text style={s.courseMeta} numberOfLines={1}>
              {item.categoryLabel} · {item.durationLabel}
              {item.hasCert ? " · 🏅" : ""}
            </Text>
            {item.status === "in_progress" && item.progress > 0 ? (
              <View style={s.progressWrap}>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${item.progress}%` }]} />
                </View>
                <Text style={s.progressLabel}>{item.progress}%</Text>
              </View>
            ) : null}
          </View>

          {/* Right */}
          <View style={s.courseRight}>
            <View style={[s.statusPill, { backgroundColor: sb }]}>
              <Text style={[s.statusPillText, { color: sc }]}>{sl}</Text>
            </View>
            {item.isFeatured ? <Text style={s.featuredBadge}>Featured</Text> : null}
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  )
}

function AchievementChip({
  label,
  date,
  colorType,
}: {
  label: string
  date: string
  colorType: "amber" | "green"
}) {
  const color = colorType === "green" ? colors.green : colors.amber
  const bg = colorType === "green" ? "rgba(48,209,88,0.12)" : "rgba(255,159,10,0.12)"
  return (
    <View style={[s.achievementChip, { backgroundColor: bg, borderColor: color + "33" }]}>
      <Text style={[s.achievementLabel, { color }]}>{label}</Text>
      <Text style={s.achievementDate}>{date}</Text>
    </View>
  )
}

function SkeletonState() {
  return (
    <View style={s.skeletonWrap}>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LearningMobileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [filter, setFilter] = useState<FilterKey>("all")
  const { data, isLoading, refetch, isRefetching } = useLearning(
    filter === "all" ? undefined : { status: filter as CourseStatus }
  )

  const courses = data?.courses ?? []
  const achievements = data?.achievements ?? []

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Learning Center</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Meta strip */}
      {data?.meta ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.metaStrip}
          style={s.metaScroll}
        >
          <MetaChip label="Completed" value={data.meta.completedCount} valueColor={colors.green} />
          <MetaChip
            label="In Progress"
            value={data.meta.inProgressCount}
            valueColor={colors.amber}
          />
          <MetaChip label="Hrs/Month" value={data.meta.monthlyHours} />
          <MetaChip label="Avg Score" value={`${data.meta.avgScore}%`} />
        </ScrollView>
      ) : null}

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
        style={s.filterScroll}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, filter === f.key && s.filterChipActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.75}
          >
            <Text style={[s.filterChipText, filter === f.key && s.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {isLoading ? (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <SkeletonState />
        </ScrollView>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor="rgba(255,255,255,0.4)"
            />
          }
        >
          {/* Achievements */}
          {achievements.length > 0 && filter === "all" ? (
            <>
              <Text style={s.sectionLabel}>Achievements</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.achievementStrip}
                style={s.achievementScroll}
              >
                {achievements.map((a) => (
                  <AchievementChip
                    key={a.id}
                    label={a.label}
                    date={a.date}
                    colorType={a.colorType}
                  />
                ))}
              </ScrollView>
            </>
          ) : null}

          {/* Course list */}
          {courses.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyText}>No courses found</Text>
            </View>
          ) : (
            courses.map((course) => <CourseCard key={course.id} item={course} />)
          )}
        </ScrollView>
      )}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  backBtn: { paddingVertical: 6, paddingRight: 8 },
  backText: { ...t.subhead, color: colors.text2 },
  headerTitle: {
    flex: 1,
    ...t.headline,
    color: colors.text1,
    textAlign: "center",
  },

  metaScroll: { marginHorizontal: -spacing.lg },
  metaStrip: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  metaChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: "center",
    minWidth: 80,
    overflow: "hidden",
    position: "relative",
  },
  metaChipShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  metaChipValue: { ...t.footnote, fontWeight: "700", color: colors.text1, marginBottom: 2 },
  metaChipLabel: { ...t.caption2, color: colors.text3 },

  filterScroll: { marginHorizontal: -spacing.lg, marginBottom: spacing.sm },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.glass2,
    borderColor: "rgba(255,255,255,0.22)",
  },
  filterChipText: { ...t.footnote, fontWeight: "600", color: colors.text3 },
  filterChipTextActive: { color: colors.text1 },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    gap: spacing.xs,
  },

  sectionLabel: {
    ...t.caption2,
    fontWeight: "700",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.06,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },

  achievementScroll: { marginHorizontal: -spacing.lg, marginBottom: spacing.md },
  achievementStrip: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  achievementChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    minWidth: 100,
  },
  achievementLabel: { ...t.footnote, fontWeight: "700", marginBottom: 2 },
  achievementDate: { ...t.caption2, color: colors.text3 },

  courseCard: {
    padding: spacing.md,
    marginBottom: 8,
    overflow: "hidden",
    position: "relative",
  },
  cardShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  courseRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  courseCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  courseGlyph: { fontSize: 16, color: colors.text2 },
  courseInfo: { flex: 1, gap: 3, minWidth: 0 },
  courseTitle: { ...t.footnote, fontWeight: "700", color: colors.text1, lineHeight: 18 },
  courseSub: { ...t.caption2, color: colors.text2 },
  courseMeta: { ...t.caption2, color: colors.text3 },
  progressWrap: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  progressTrack: {
    flex: 1,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 1,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.amber, borderRadius: 1 },
  progressLabel: { ...t.caption2, color: colors.text3, minWidth: 28, textAlign: "right" },

  courseRight: { alignItems: "flex-end", gap: 5, flexShrink: 0 },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusPillText: { ...t.caption2, fontWeight: "600" },
  featuredBadge: { ...t.caption2, color: colors.amber },

  emptyState: {
    padding: spacing.xl,
    alignItems: "center",
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
  },
  emptyText: { ...t.subhead, color: colors.text3 },

  skeletonWrap: {
    gap: spacing.sm,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    overflow: "hidden",
  },
})
