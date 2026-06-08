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
import { useRevenueReport, type RevenueTrendMonth } from "@/hooks/useIntelligenceReports"
import { colors, radius, spacing } from "@/tokens"

function RevenueChart({ data }: { data: RevenueTrendMonth[] }) {
  const maxVal = Math.max(...data.map((d) => d.total), 1)
  return (
    <View style={s.chart}>
      <View style={s.chartBars}>
        {data.map((d) => {
          const h = Math.max(4, Math.round((d.total / maxVal) * 72))
          return (
            <View key={d.month} style={s.barWrap}>
              <View style={s.barTrack}>
                <View style={[s.bar, { height: h }, d.total > 0 ? s.barActive : s.barEmpty]} />
              </View>
              <Text style={s.barLabel}>{d.month.slice(0, 3)}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

export default function ReportRevenueScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { data, isLoading, isError, refetch } = useRevenueReport()

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
        <Text style={s.errText}>Could not load revenue data.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => void refetch()} activeOpacity={0.8}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const { kpi, trend } = data
  const deltaColor = kpi.delta != null ? (kpi.delta >= 0 ? colors.green : colors.red) : colors.text3

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.navbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Revenue Report</Text>
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
          <Text style={s.heroLabel}>Month to Date</Text>
          <Text style={s.heroBig}>{kpi.mtdFormatted}</Text>
          <View style={s.heroRow}>
            <View style={s.orderPill}>
              <Text style={s.orderPillText}>{kpi.mtdCount} orders</Text>
            </View>
            {kpi.delta != null && (
              <Text style={[s.deltaText, { color: deltaColor }]}>
                {kpi.delta >= 0 ? "+" : ""}
                {kpi.delta}% vs last month
              </Text>
            )}
          </View>
        </View>

        {/* KPI row */}
        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <View style={s.cardShine} pointerEvents="none" />
            <Text style={s.kpiLabel}>Year to Date</Text>
            <Text style={s.kpiValue}>{kpi.ytdFormatted}</Text>
            <Text style={s.kpiSub}>{kpi.ytdCount} orders</Text>
          </View>
          <View style={s.kpiCard}>
            <View style={s.cardShine} pointerEvents="none" />
            <Text style={s.kpiLabel}>Last Month</Text>
            <Text style={s.kpiValue}>{kpi.lastMonthFormatted}</Text>
          </View>
          <View style={s.kpiCard}>
            <View style={s.cardShine} pointerEvents="none" />
            <Text style={s.kpiLabel}>Avg. Order</Text>
            <Text style={s.kpiValue}>{kpi.avgOrderValueFormatted}</Text>
          </View>
        </View>

        {/* 12-month chart */}
        <Text style={s.sectionLabel}>12-Month Trend</Text>
        <View style={s.card}>
          <View style={s.cardShine} pointerEvents="none" />
          <View style={{ padding: spacing.base }}>
            <RevenueChart data={trend} />
          </View>
        </View>

        {/* Monthly table */}
        <Text style={s.sectionLabel}>Monthly Breakdown</Text>
        <View style={s.card}>
          <View style={s.cardShine} pointerEvents="none" />
          {[...trend].reverse().map((m) => (
            <View key={m.month} style={s.tableRow}>
              <Text style={s.tableLabel}>{m.month}</Text>
              <View style={s.tableRight}>
                <Text style={s.tableCount}>{m.count} orders</Text>
                <Text
                  style={[
                    s.tableValue,
                    m.total > 0 ? { color: colors.text1 } : { color: colors.text3 },
                  ]}
                >
                  {m.total > 0 ? m.totalFormatted : "—"}
                </Text>
              </View>
            </View>
          ))}
        </View>
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
  heroBig: { fontSize: 38, fontWeight: "700", letterSpacing: -1.5, color: colors.text1 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  orderPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  orderPillText: { fontSize: 12, fontWeight: "600", color: colors.text2 },
  deltaText: { fontSize: 12, fontWeight: "600" },

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
  kpiValue: { fontSize: 15, fontWeight: "700", color: colors.text1 },
  kpiSub: { fontSize: 10, color: colors.text3 },

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

  chart: { gap: 10 },
  chartBars: { flexDirection: "row", alignItems: "flex-end", height: 80, gap: 3 },
  barWrap: { flex: 1, alignItems: "center" },
  barTrack: { width: "100%", height: 72, justifyContent: "flex-end" },
  bar: { width: "100%", borderRadius: 2 },
  barEmpty: { backgroundColor: "rgba(255,255,255,0.06)" },
  barActive: { backgroundColor: "rgba(255,255,255,0.55)" },
  barLabel: { fontSize: 7, color: colors.text3, marginTop: 4 },

  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  tableLabel: { fontSize: 13, color: colors.text2 },
  tableRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  tableCount: { fontSize: 11, color: colors.text3 },
  tableValue: { fontSize: 14, fontWeight: "700", minWidth: 72, textAlign: "right" },

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
