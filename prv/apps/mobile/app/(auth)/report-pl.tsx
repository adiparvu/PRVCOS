import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { useState } from "react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useReports, type PLPeriod, type TrendMonth } from "@/hooks/useFinance"
import { colors, radius, spacing } from "@/tokens"

type Period = "mtd" | "lastMonth" | "ytd"

function TrendChart({ data }: { data: TrendMonth[] }) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.revenue, d.expenses)), 1)
  return (
    <View style={s.chart}>
      <View style={s.chartBars}>
        {data.map((d) => {
          const revH = Math.max(4, Math.round((d.revenue / maxVal) * 72))
          const expH = Math.max(4, Math.round((d.expenses / maxVal) * 72))
          return (
            <View key={d.month} style={s.barGroup}>
              <View style={s.barTrack}>
                <View style={[s.barRev, { height: revH }]} />
              </View>
              <View style={s.barTrack}>
                <View style={[s.barExp, { height: expH }]} />
              </View>
              <Text style={s.barLabel}>{d.month.slice(0, 3)}</Text>
            </View>
          )
        })}
      </View>
      <View style={s.chartLegend}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, s.legendDotRev]} />
          <Text style={s.legendLabel}>Revenue</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, s.legendDotExp]} />
          <Text style={s.legendLabel}>Expenses</Text>
        </View>
      </View>
    </View>
  )
}

function PeriodRow({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <View style={s.periodRow}>
      <Text style={s.periodLabel}>{label}</Text>
      <Text style={[s.periodValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  )
}

export default function ReportPLScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [period, setPeriod] = useState<Period>("mtd")
  const { data, isLoading, isError, refetch } = useReports()

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
        <Text style={s.errText}>Could not load P&L data.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => void refetch()} activeOpacity={0.8}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const periodMap: Record<Period, PLPeriod> = {
    mtd: data.pl.mtd,
    lastMonth: data.pl.lastMonth,
    ytd: data.pl.ytd,
  }
  const p = periodMap[period]!

  const PERIOD_LABELS: Record<Period, string> = {
    mtd: "This Month",
    lastMonth: "Last Month",
    ytd: "Year to Date",
  }

  const profitColor = p.profit >= 0 ? colors.green : colors.red

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.navbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>P&L Report</Text>
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
          <Text style={s.heroLabel}>Gross Profit · {PERIOD_LABELS[period]}</Text>
          <Text style={[s.heroBig, { color: profitColor }]}>{p.profitFormatted}</Text>
          <View style={s.heroRow}>
            <View
              style={[
                s.marginPill,
                { borderColor: profitColor + "44", backgroundColor: profitColor + "15" },
              ]}
            >
              <Text style={[s.marginText, { color: profitColor }]}>{p.margin}% margin</Text>
            </View>
            {period === "mtd" && data.pl.mtd.delta != null ? (
              <Text
                style={[s.deltaText, { color: data.pl.mtd.delta >= 0 ? colors.green : colors.red }]}
              >
                {data.pl.mtd.delta >= 0 ? "+" : ""}
                {data.pl.mtd.delta}% vs last month
              </Text>
            ) : null}
          </View>
        </View>

        {/* Period switcher */}
        <View style={s.periodSwitcher}>
          {(["mtd", "lastMonth", "ytd"] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[s.periodBtn, period === p && s.periodBtnActive]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.75}
            >
              <Text style={[s.periodBtnText, period === p && s.periodBtnTextActive]}>
                {PERIOD_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary card */}
        <View style={s.card}>
          <View style={s.cardShine} pointerEvents="none" />
          <PeriodRow label="Revenue" value={p.revenueFormatted} valueColor={colors.text1} />
          <PeriodRow label="Expenses" value={p.expensesFormatted} valueColor={colors.red} />
          <View style={s.divider} />
          <PeriodRow label="Gross Profit" value={p.profitFormatted} valueColor={profitColor} />
          <PeriodRow label="Margin" value={`${p.margin}%`} valueColor={profitColor} />
        </View>

        {/* 6-month trend */}
        <Text style={s.sectionLabel}>6-Month Trend</Text>
        <View style={s.card}>
          <View style={s.cardShine} pointerEvents="none" />
          <View style={{ padding: spacing.base }}>
            <TrendChart data={data.pl.trend} />
          </View>
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
  heroBig: { fontSize: 38, fontWeight: "700", letterSpacing: -1.5 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  marginPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  marginText: { fontSize: 12, fontWeight: "700" },
  deltaText: { fontSize: 12, fontWeight: "600" },

  periodSwitcher: {
    flexDirection: "row",
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 3,
    gap: 2,
  },
  periodBtn: { flex: 1, paddingVertical: 7, alignItems: "center", borderRadius: 9 },
  periodBtnActive: { backgroundColor: "rgba(255,255,255,0.12)" },
  periodBtnText: { fontSize: 12, fontWeight: "500", color: colors.text3 },
  periodBtnTextActive: { color: colors.text1 },

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
  periodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  periodLabel: { fontSize: 14, color: colors.text2 },
  periodValue: { fontSize: 15, fontWeight: "700", color: colors.text1 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)" },

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
  chartBars: { flexDirection: "row", alignItems: "flex-end", height: 88, gap: 4 },
  barGroup: { flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 2 },
  barTrack: { flex: 1, height: 72, justifyContent: "flex-end" },
  barRev: { width: "100%", backgroundColor: "rgba(255,255,255,0.55)", borderRadius: 3 },
  barExp: { width: "100%", backgroundColor: "rgba(255,69,58,0.45)", borderRadius: 3 },
  barLabel: {
    position: "absolute",
    bottom: -18,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 9,
    color: colors.text3,
  },

  chartLegend: { flexDirection: "row", gap: 16, justifyContent: "center", marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendDotRev: { backgroundColor: "rgba(255,255,255,0.55)" },
  legendDotExp: { backgroundColor: "rgba(255,69,58,0.55)" },
  legendLabel: { fontSize: 11, color: colors.text3 },

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
