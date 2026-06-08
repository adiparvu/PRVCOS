import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useProjectsReport } from "@/hooks/useIntelligenceReports"
import { colors, radius, spacing } from "@/tokens"

const STATUS_COLORS: Record<string, string> = {
  active: "rgba(255,255,255,0.55)",
  on_hold: "rgba(255,159,10,0.6)",
  draft: "rgba(255,255,255,0.22)",
  completed: "rgba(48,209,88,0.55)",
  cancelled: "rgba(255,69,58,0.45)",
}

export default function ReportProjectsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { data, isLoading, isError, refetch } = useProjectsReport()

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
        <Text style={s.errText}>Could not load project data.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => void refetch()} activeOpacity={0.8}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const { kpi, byStatus, recent } = data

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.navbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Projects Report</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroShine} pointerEvents="none" />
          <Text style={s.heroLabel}>Active Projects</Text>
          <Text style={s.heroBig}>{kpi.activeCount}</Text>
          <View style={s.heroRow}>
            <View style={s.heroPill}>
              <Text style={s.heroPillText}>{kpi.totalProjects} total</Text>
            </View>
            <View
              style={[
                s.heroPill,
                { borderColor: colors.green + "44", backgroundColor: colors.green + "12" },
              ]}
            >
              <Text style={[s.heroPillText, { color: colors.green }]}>
                {kpi.completedCount} completed
              </Text>
            </View>
          </View>
        </View>

        {/* KPI row */}
        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <View style={s.cardShine} pointerEvents="none" />
            <Text style={s.kpiLabel}>Tasks Total</Text>
            <Text style={s.kpiValue}>{kpi.milestonesTotal}</Text>
          </View>
          <View style={s.kpiCard}>
            <View style={s.cardShine} pointerEvents="none" />
            <Text style={s.kpiLabel}>Completion</Text>
            <Text
              style={[
                s.kpiValue,
                {
                  color:
                    kpi.completionRate >= 70
                      ? colors.green
                      : kpi.completionRate >= 40
                        ? colors.amber
                        : colors.red,
                },
              ]}
            >
              {kpi.completionRate}%
            </Text>
          </View>
          <View style={s.kpiCard}>
            <View style={s.cardShine} pointerEvents="none" />
            <Text style={s.kpiLabel}>Overdue Tasks</Text>
            <Text style={[s.kpiValue, kpi.milestonesOverdue > 0 ? { color: colors.red } : {}]}>
              {kpi.milestonesOverdue}
            </Text>
          </View>
        </View>

        {/* Completed this month */}
        {kpi.completedMtd > 0 && (
          <View style={s.mtdBanner}>
            <View style={s.cardShine} pointerEvents="none" />
            <Text style={s.mtdIcon}>◎</Text>
            <View>
              <Text style={s.mtdTitle}>{kpi.completedMtd} tasks completed this month</Text>
              <Text style={s.mtdSub}>Keep up the momentum</Text>
            </View>
          </View>
        )}

        {/* Status breakdown */}
        {byStatus.length > 0 && (
          <>
            <Text style={s.sectionLabel}>By Status</Text>
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              {byStatus.map((row) => (
                <View key={row.status} style={s.statusRow}>
                  <View
                    style={[
                      s.statusDot,
                      { backgroundColor: STATUS_COLORS[row.status] ?? colors.text3 },
                    ]}
                  />
                  <Text style={s.statusLabel}>{row.label}</Text>
                  <View style={s.statusBarWrap}>
                    <View
                      style={[
                        s.statusBar,
                        {
                          width: `${row.pct}%`,
                          backgroundColor: STATUS_COLORS[row.status] ?? colors.text3,
                        },
                      ]}
                    />
                  </View>
                  <Text style={s.statusCount}>{row.count}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Recent projects */}
        {recent.length > 0 && (
          <>
            <Text style={s.sectionLabel}>Recent Projects</Text>
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              {recent.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={s.projectRow}
                  onPress={() =>
                    router.push({ pathname: "/(auth)/project-detail", params: { id: p.id } })
                  }
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      s.projectDot,
                      { backgroundColor: STATUS_COLORS[p.status] ?? colors.text3 },
                    ]}
                  />
                  <Text style={s.projectName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={s.projectChevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

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

  hero: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: spacing.base,
    overflow: "hidden",
    gap: 6,
    alignItems: "center",
  },
  heroShine: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.20)",
  },
  heroLabel: { fontSize: 12, color: colors.text3, textTransform: "uppercase", letterSpacing: 0.5 },
  heroBig: { fontSize: 52, fontWeight: "700", letterSpacing: -2, color: colors.text1 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  heroPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  heroPillText: { fontSize: 12, fontWeight: "600", color: colors.text2 },

  kpiRow: { flexDirection: "row", gap: 8 },
  kpiCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 12,
    gap: 3,
    overflow: "hidden",
  },
  kpiLabel: { fontSize: 10, color: colors.text3, textTransform: "uppercase", letterSpacing: 0.5 },
  kpiValue: { fontSize: 18, fontWeight: "700", color: colors.text1 },

  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    overflow: "hidden",
  },
  cardShine: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  mtdBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(48,209,88,0.06)",
    borderWidth: 1,
    borderColor: "rgba(48,209,88,0.15)",
    borderRadius: 14,
    padding: 14,
    overflow: "hidden",
  },
  mtdIcon: { fontSize: 22, color: colors.green },
  mtdTitle: { fontSize: 14, fontWeight: "600", color: colors.text1 },
  mtdSub: { fontSize: 12, color: colors.text3, marginTop: 2 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 4,
    marginLeft: 2,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: 10,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  statusLabel: { fontSize: 13, color: colors.text2, width: 80 },
  statusBarWrap: { flex: 1, height: 5, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 3 },
  statusBar: { height: "100%", borderRadius: 3 },
  statusCount: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text1,
    width: 28,
    textAlign: "right",
  },

  projectRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: 10,
  },
  projectDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  projectName: { flex: 1, fontSize: 14, color: colors.text1 },
  projectChevron: { fontSize: 18, color: colors.text3 },

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
