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
import { useReports, type TrendMonth } from "@/hooks/useFinance"
import { colors, radius, spacing } from "@/tokens"

type Scenario = "avg" | "linear" | "conservative"

const SCENARIO_LABELS: Record<Scenario, string> = {
  avg: "3-Month Avg",
  linear: "Linear Trend",
  conservative: "Conservative",
}

const SCENARIO_MULTIPLIERS: Record<Scenario, number> = {
  avg: 1.0,
  linear: 1.1,
  conservative: 0.95,
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M RON`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k RON`
  return `${Math.round(value)} RON`
}

function ForecastChart({ data }: { data: TrendMonth[] }) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.revenue, Math.abs(d.profit))), 1)
  return (
    <View style={s.chart}>
      <View style={s.chartBars}>
        {data.map((d) => {
          const revH = Math.max(4, Math.round((d.revenue / maxVal) * 72))
          const profitH = Math.max(4, Math.round((Math.abs(d.profit) / maxVal) * 72))
          const profitPositive = d.profit >= 0
          return (
            <View key={d.month} style={s.barGroup}>
              <View style={s.barTrack}>
                <View style={[s.barRev, { height: revH }]} />
              </View>
              <View style={s.barTrack}>
                <View
                  style={[
                    s.barProfit,
                    { height: profitH },
                    profitPositive ? s.barProfitPos : s.barProfitNeg,
                  ]}
                />
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
          <View style={[s.legendDot, s.legendDotProfit]} />
          <Text style={s.legendLabel}>Profit</Text>
        </View>
      </View>
    </View>
  )
}

function TrendRow({
  month,
  revenue,
  profit,
}: {
  month: string
  revenue: number
  profit: number
}) {
  const profitColor = profit >= 0 ? colors.green : colors.red
  return (
    <View style={s.trendRow}>
      <Text style={s.trendMonth}>{month}</Text>
      <Text style={s.trendRevenue}>{formatCurrency(revenue)}</Text>
      <Text style={[s.trendProfit, { color: profitColor }]}>{formatCurrency(profit)}</Text>
    </View>
  )
}

export default function ReportForecastScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [scenario, setScenario] = useState<Scenario>("avg")
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
        <Text style={s.errText}>Could not load forecast data.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => void refetch()} activeOpacity={0.8}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const multiplier = SCENARIO_MULTIPLIERS[scenario]
  const scenarioValue = data.forecast.nextMonth * multiplier
  const scenarioFormatted = formatCurrency(scenarioValue)

  const trendSlice = data.pl.trend.slice(-3)

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.navbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Forecast</Text>
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
          <Text style={s.heroLabel}>Next Month Projection</Text>
          <Text style={s.heroBig}>
            {scenario === "avg" ? data.forecast.nextMonthFormatted : scenarioFormatted}
          </Text>
          <Text style={s.heroSub}>{data.forecast.basedOn}</Text>
        </View>

        {/* Scenario switcher */}
        <View style={s.periodSwitcher}>
          {(["avg", "linear", "conservative"] as Scenario[]).map((sc) => (
            <TouchableOpacity
              key={sc}
              style={[s.periodBtn, scenario === sc && s.periodBtnActive]}
              onPress={() => setScenario(sc)}
              activeOpacity={0.75}
            >
              <Text style={[s.periodBtnText, scenario === sc && s.periodBtnTextActive]}>
                {SCENARIO_LABELS[sc]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Scenario value card */}
        <View style={s.card}>
          <View style={s.cardShine} pointerEvents="none" />
          <View style={s.scenarioRow}>
            <View style={s.scenarioLeft}>
              <Text style={s.scenarioName}>{SCENARIO_LABELS[scenario]}</Text>
              <Text style={s.scenarioMultiplier}>
                ×{SCENARIO_MULTIPLIERS[scenario].toFixed(2)} base
              </Text>
            </View>
            <Text style={s.scenarioValue}>
              {scenario === "avg" ? data.forecast.nextMonthFormatted : scenarioFormatted}
            </Text>
          </View>
          {(["avg", "linear", "conservative"] as Scenario[])
            .filter((sc) => sc !== scenario)
            .map((sc) => (
              <View key={sc} style={s.scenarioAltRow}>
                <Text style={s.scenarioAltName}>{SCENARIO_LABELS[sc]}</Text>
                <Text style={s.scenarioAltValue}>
                  {formatCurrency(data.forecast.nextMonth * SCENARIO_MULTIPLIERS[sc])}
                </Text>
              </View>
            ))}
        </View>

        {/* 6-Month Revenue Trend */}
        <Text style={s.sectionLabel}>6-Month Revenue Trend</Text>
        <View style={s.card}>
          <View style={s.cardShine} pointerEvents="none" />
          <View style={{ padding: spacing.base }}>
            <ForecastChart data={data.pl.trend} />
          </View>
        </View>

        {/* Trend Summary */}
        <Text style={s.sectionLabel}>Recent Performance</Text>
        <View style={s.card}>
          <View style={s.cardShine} pointerEvents="none" />
          <View style={s.trendHeader}>
            <Text style={s.trendHeaderMonth}>Month</Text>
            <Text style={s.trendHeaderRevenue}>Revenue</Text>
            <Text style={s.trendHeaderProfit}>Profit</Text>
          </View>
          <View style={s.divider} />
          {trendSlice.map((m, i) => (
            <View key={m.month}>
              {i > 0 && <View style={s.rowDivider} />}
              <TrendRow month={m.month} revenue={m.revenue} profit={m.profit} />
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
  heroSub: { fontSize: 13, color: colors.text3, marginTop: 2 },

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

  scenarioRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
  },
  scenarioLeft: { gap: 3 },
  scenarioName: { fontSize: 15, fontWeight: "600", color: colors.text1 },
  scenarioMultiplier: { fontSize: 11, color: colors.text3 },
  scenarioValue: { fontSize: 17, fontWeight: "700", color: colors.text1 },
  scenarioAltRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  scenarioAltName: { fontSize: 13, color: colors.text3 },
  scenarioAltValue: { fontSize: 14, fontWeight: "600", color: colors.text2 },

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
  barProfit: { width: "100%", borderRadius: 3 },
  barProfitPos: { backgroundColor: "rgba(48,209,88,0.50)" },
  barProfitNeg: { backgroundColor: "rgba(255,69,58,0.45)" },
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
  legendDotProfit: { backgroundColor: "rgba(48,209,88,0.55)" },
  legendLabel: { fontSize: 11, color: colors.text3 },

  trendHeader: {
    flexDirection: "row",
    paddingHorizontal: spacing.base,
    paddingVertical: 10,
  },
  trendHeaderMonth: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  trendHeaderRevenue: {
    width: 100,
    fontSize: 11,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    textAlign: "right",
  },
  trendHeaderProfit: {
    width: 90,
    fontSize: 11,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    textAlign: "right",
  },

  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  rowDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginHorizontal: spacing.base,
  },

  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 13,
  },
  trendMonth: { flex: 1, fontSize: 14, color: colors.text2 },
  trendRevenue: {
    width: 100,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text1,
    textAlign: "right",
  },
  trendProfit: { width: 90, fontSize: 14, fontWeight: "700", textAlign: "right" },

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
