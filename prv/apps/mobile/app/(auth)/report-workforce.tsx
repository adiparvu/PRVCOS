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
import { useWorkforceReport } from "@/hooks/useIntelligenceReports"
import { colors, radius, spacing } from "@/tokens"

function timeAgo(isoStr: string | null): string {
  if (!isoStr) return "Never"
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function ReportWorkforceScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { data, isLoading, isError, refetch } = useWorkforceReport()

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
        <Text style={s.errText}>Could not load workforce data.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => void refetch()} activeOpacity={0.8}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const { kpi, byRole, recentlyActive } = data
  const maxRoleCount = Math.max(...byRole.map((r) => r.count), 1)

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.navbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Workforce Report</Text>
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
          <Text style={s.heroLabel}>Active Team Members</Text>
          <Text style={s.heroBig}>{kpi.activeUsers}</Text>
          <View style={s.heroRow}>
            <View style={s.heroPill}>
              <Text style={s.heroPillText}>{kpi.totalUsers} total</Text>
            </View>
            <View
              style={[
                s.heroPill,
                { borderColor: colors.green + "44", backgroundColor: colors.green + "12" },
              ]}
            >
              <Text style={[s.heroPillText, { color: colors.green }]}>
                {kpi.recentlyActiveCount} active recently
              </Text>
            </View>
          </View>
        </View>

        {/* KPI row */}
        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <View style={s.cardShine} pointerEvents="none" />
            <Text style={s.kpiLabel}>Tasks Done MTD</Text>
            <Text style={s.kpiValue}>{kpi.tasksCompletedMtd}</Text>
          </View>
          <View style={s.kpiCard}>
            <View style={s.cardShine} pointerEvents="none" />
            <Text style={s.kpiLabel}>Task Completion</Text>
            <Text
              style={[
                s.kpiValue,
                {
                  color:
                    kpi.taskCompletionRate >= 70
                      ? colors.green
                      : kpi.taskCompletionRate >= 40
                        ? colors.amber
                        : colors.red,
                },
              ]}
            >
              {kpi.taskCompletionRate}%
            </Text>
          </View>
          <View style={s.kpiCard}>
            <View style={s.cardShine} pointerEvents="none" />
            <Text style={s.kpiLabel}>Total Tasks</Text>
            <Text style={s.kpiValue}>{kpi.tasksTotal}</Text>
          </View>
        </View>

        {/* Role breakdown */}
        {byRole.length > 0 && (
          <>
            <Text style={s.sectionLabel}>By Role</Text>
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              {byRole.map((row) => {
                const barPct = Math.round((row.count / maxRoleCount) * 100)
                return (
                  <View key={row.role} style={s.roleRow}>
                    <Text style={s.roleLabel}>{row.label}</Text>
                    <View style={s.roleBarWrap}>
                      <View style={[s.roleBar, { width: `${barPct}%` }]} />
                    </View>
                    <Text style={s.roleCount}>{row.count}</Text>
                  </View>
                )
              })}
            </View>
          </>
        )}

        {/* Recently active */}
        {recentlyActive.length > 0 && (
          <>
            <Text style={s.sectionLabel}>Recently Active</Text>
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              {recentlyActive.map((u) => (
                <View key={u.id} style={s.userRow}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{u.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={s.userInfo}>
                    <Text style={s.userName}>{u.name}</Text>
                    <Text style={s.userRole}>{u.jobTitle ?? u.role}</Text>
                  </View>
                  <Text style={s.userTime}>{timeAgo(u.lastLoginAt)}</Text>
                </View>
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

  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 4,
    marginLeft: 2,
  },

  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: 10,
  },
  roleLabel: { fontSize: 13, color: colors.text2, width: 88 },
  roleBarWrap: { flex: 1, height: 5, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 3 },
  roleBar: { height: "100%", backgroundColor: "rgba(255,255,255,0.45)", borderRadius: 3 },
  roleCount: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text1,
    width: 28,
    textAlign: "right",
  },

  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 13, fontWeight: "700", color: colors.text1 },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: "600", color: colors.text1 },
  userRole: { fontSize: 11, color: colors.text3, marginTop: 1 },
  userTime: { fontSize: 11, color: colors.text3 },

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
