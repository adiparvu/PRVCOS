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
import { useTaskDetail, useToggleTask } from "@/hooks/useOperationsDetail"
import { colors, radius, spacing } from "@/tokens"

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  valueColor,
  chevron,
  onPress,
}: {
  icon: string
  label: string
  value: string
  valueColor?: string
  chevron?: boolean
  onPress?: () => void
}) {
  const inner = (
    <>
      <View style={s.infoIcon}>
        <Text style={s.infoIconText}>{icon}</Text>
      </View>
      <View style={s.infoContent}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={[s.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      </View>
      {chevron ? <Text style={s.chevron}>›</Text> : null}
    </>
  )

  if (onPress) {
    return (
      <TouchableOpacity style={s.infoRow} activeOpacity={0.7} onPress={onPress}>
        {inner}
      </TouchableOpacity>
    )
  }
  return <View style={s.infoRow}>{inner}</View>
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TaskDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data, isLoading, isError, refetch } = useTaskDetail(id ?? "")
  const { mutate: toggleTask, isPending: isToggling } = useToggleTask(id ?? "")

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
        <Text style={s.errText}>Could not load task.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => void refetch()} activeOpacity={0.8}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const { task, project } = data

  const fmtDate = (iso: string) =>
    new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })

  const dueDateColor = task.isComplete
    ? colors.green
    : task.isOverdue
      ? colors.red
      : task.dueDate
        ? (() => {
            const diffDays = Math.floor(
              (new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            )
            return diffDays <= 1 ? colors.amber : colors.text2
          })()
        : colors.text3

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.navbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Task</Text>
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
          <View style={s.heroTop}>
            <View
              style={[
                s.checkCircle,
                task.isComplete ? s.checkCircleDone : task.isOverdue ? s.checkCircleOverdue : null,
              ]}
            >
              {task.isComplete ? <Text style={s.checkMark}>✓</Text> : null}
            </View>
            <View style={s.heroTitleWrap}>
              <Text style={[s.heroTitle, task.isComplete && s.heroTitleDone]} numberOfLines={3}>
                {task.title}
              </Text>
              <Text style={s.heroProject} numberOfLines={1}>
                {project.name}
              </Text>
            </View>
            {task.isComplete ? (
              <View style={s.doneBadge}>
                <Text style={s.doneBadgeText}>Done</Text>
              </View>
            ) : task.isOverdue ? (
              <View style={s.overdueBadge}>
                <Text style={s.overdueBadgeText}>Overdue</Text>
              </View>
            ) : null}
          </View>

          {task.dueDate ? (
            <View style={s.dueDateRow}>
              <Text style={s.dueDateLabel}>Due</Text>
              <Text style={[s.dueDateValue, { color: dueDateColor }]}>{fmtDate(task.dueDate)}</Text>
            </View>
          ) : null}
        </View>

        {/* Action */}
        <TouchableOpacity
          style={[s.actionBtn, task.isComplete ? s.actionBtnReopen : s.actionBtnComplete]}
          activeOpacity={0.8}
          onPress={() => toggleTask(!task.isComplete)}
          disabled={isToggling}
        >
          <View style={s.actionShine} pointerEvents="none" />
          {isToggling ? (
            <ActivityIndicator color={task.isComplete ? colors.text2 : colors.bg} />
          ) : (
            <>
              <Text
                style={[s.actionIcon, task.isComplete ? s.actionIconReopen : s.actionIconComplete]}
              >
                {task.isComplete ? "↩" : "✓"}
              </Text>
              <Text
                style={[
                  s.actionLabel,
                  task.isComplete ? s.actionLabelReopen : s.actionLabelComplete,
                ]}
              >
                {task.isComplete ? "Reopen Task" : "Mark as Complete"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Details */}
        <View style={s.card}>
          <View style={s.cardShine} pointerEvents="none" />
          <InfoRow
            icon="◎"
            label="Project"
            value={project.name}
            chevron
            onPress={() =>
              router.push({ pathname: "/(auth)/project-detail", params: { id: project.id } })
            }
          />
          {task.dueDate ? (
            <InfoRow
              icon="◴"
              label="Due date"
              value={fmtDate(task.dueDate)}
              valueColor={dueDateColor}
            />
          ) : null}
          {task.completedAt ? (
            <InfoRow
              icon="◉"
              label="Completed"
              value={fmtDate(task.completedAt)}
              valueColor={colors.green}
            />
          ) : null}
          {task.description ? (
            <InfoRow icon="≡" label="Description" value={task.description} />
          ) : null}
          <InfoRow icon="⊙" label="Created" value={fmtDate(task.createdAt)} />
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
    letterSpacing: -0.2,
    paddingHorizontal: spacing.sm,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },

  // Hero
  hero: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: spacing.base,
    overflow: "hidden",
    gap: 12,
  },
  heroShine: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.20)",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  checkCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  checkCircleDone: {
    backgroundColor: "rgba(48,209,88,0.15)",
    borderColor: "rgba(48,209,88,0.50)",
  },
  checkCircleOverdue: {
    borderColor: "rgba(255,69,58,0.50)",
    backgroundColor: "rgba(255,69,58,0.08)",
  },
  checkMark: { fontSize: 16, color: colors.green, fontWeight: "700" },
  heroTitleWrap: { flex: 1, gap: 3 },
  heroTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text1,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  heroTitleDone: { color: colors.text3, textDecorationLine: "line-through" },
  heroProject: { fontSize: 12, color: colors.text3 },

  doneBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: "rgba(48,209,88,0.12)",
    borderWidth: 1,
    borderColor: "rgba(48,209,88,0.25)",
    flexShrink: 0,
  },
  doneBadgeText: { fontSize: 11, fontWeight: "700", color: colors.green },
  overdueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,69,58,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,69,58,0.22)",
    flexShrink: 0,
  },
  overdueBadgeText: { fontSize: 11, fontWeight: "700", color: colors.red },

  dueDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  dueDateLabel: { fontSize: 12, color: colors.text3, fontWeight: "500" },
  dueDateValue: { fontSize: 13, fontWeight: "600" },

  // Action button
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: radius.pill,
    gap: 8,
    overflow: "hidden",
  },
  actionShine: {
    position: "absolute",
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.30)",
  },
  actionBtnComplete: {
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  actionBtnReopen: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: { fontSize: 16 },
  actionIconComplete: { color: "#000" },
  actionIconReopen: { color: colors.text2 },
  actionLabel: { fontSize: 15, fontWeight: "700" },
  actionLabelComplete: { color: "#000" },
  actionLabelReopen: { color: colors.text2 },

  // Card
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  cardShine: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  // Info rows
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoIconText: { fontSize: 13, color: colors.text2 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: colors.text3, marginBottom: 2 },
  infoValue: { fontSize: 13, fontWeight: "600", color: colors.text1 },
  chevron: { fontSize: 18, color: "rgba(255,255,255,0.20)" },

  // Error
  errText: { fontSize: 15, color: colors.text3, marginBottom: spacing.base },
  retryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },
  retryText: { fontSize: 15, fontWeight: "600", color: colors.text1 },
})
