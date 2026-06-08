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
import { useReports, type CashTrendMonth } from "@/hooks/useFinance"
import { colors, radius, spacing } from "@/tokens"

function CashChart({ data }: { data: CashTrendMonth[] }) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.in, d.out)), 1)
  return (
    <View style={s.chart}>
      <View style={s.chartBars}>
        {data.map((d) => {
          const inH = Math.max(4, Math.round((d.in / maxVal) * 72))
          const outH = Math.max(4, Math.round((d.out / maxVal) * 72))
          return (
            <View key={d.month} style={s.barGroup}>
              <View style={s.barTrack}>
                <View style={[s.barIn, { height: inH }]} />
              </View>
              <View style={s.barTrack}>
                <View style={[s.barOut, { height: outH }]} />
              </View>
              <Text style={s.barLabel}>{d.month.slice(0, 3)}</Text>
            </View>
          )
        })}
      </View>
      <View style={s.chartLegend}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, s.legendDotIn]} />
          <Text style={s.legendLabel}>Cash In</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, s.legendDotOut]} />
          <Text style={s.legendLabel}>Cash Out</Text>
        </View>
      </View>
    </View>
  )
}

function StatRow({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <View style={s.statRow}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  )
}

export default function ReportCashflowScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
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
        <Text style={s.errText}>Could not load cash flow data.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => void refetch()} activeOpacity={0.8}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const { mtd } = data.cashflow
  const netColor = mtd.netPositive ? colors.green : colors.red

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.navbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Cash Flow</Text>
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
          <Text style={s.heroLabel}>Net Cash · This Month</Text>
          <Text style={[s.heroBig, { color: netColor }]}>
            {mtd.netPositive ? "+" : "−"}
            {mtd.netFormatted}
          </Text>
          <View
            style={[s.netPill, { borderColor: netColor + "44", backgroundColor: netColor + "15" }]}
          >
            <Text style={[s.netPillText, { color: netColor }]}>
              {mtd.netPositive ? "Positive" : "Negative"} cash flow
            </Text>
          </View>
        </View>

        {/* In vs Out */}
        <View style={s.card}>
          <View style={s.cardShine} pointerEvents="none" />
          <View style={s.inOutRow}>
            <View style={s.inBlock}>
              <Text style={s.inBlockLabel}>Cash In</Text>
              <Text style={[s.inBlockValue, { color: colors.green }]}>{mtd.inFormatted}</Text>
              <Text style={s.inBlockSub}>Paid invoices</Text>
            </View>
            <View style={s.inOutDivider} />
            <View style={s.inBlock}>
              <Text style={s.inBlockLabel}>Cash Out</Text>
              <Text style={[s.inBlockValue, { color: colors.red }]}>{mtd.outFormatted}</Text>
              <Text style={s.inBlockSub}>Paid expenses</Text>
            </View>
          </View>
        </View>

        {/* 6-month trend */}
        <Text style={s.sectionLabel}>6-Month History</Text>
        <View style={s.card}>
          <View style={s.cardShine} pointerEvents="none" />
          <View style={{ padding: spacing.base }}>
            <CashChart data={data.cashflow.trend} />
          </View>
        </View>

        {/* Monthly breakdown */}
        <Text style={s.sectionLabel}>Monthly Breakdown</Text>
        <View style={s.card}>
          <View style={s.cardShine} pointerEvents="none" />
          {data.cashflow.trend.map((m) => (
            <StatRow
              key={m.month}
              label={m.month}
              value={
                m.net >= 0
                  ? `+${(m.net / 1000).toFixed(1)}k`
                  : `−${(Math.abs(m.net) / 1000).toFixed(1)}k`
              }
              valueColor={m.net >= 0 ? colors.green : colors.red}
            />
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
  heroBig: { fontSize: 38, fontWeight: "700", letterSpacing: -1.5 },
  netPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginTop: 4,
  },
  netPillText: { fontSize: 12, fontWeight: "700" },

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

  inOutRow: { flexDirection: "row" },
  inBlock: { flex: 1, padding: spacing.base, gap: 4, alignItems: "center" },
  inBlockLabel: {
    fontSize: 11,
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inBlockValue: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  inBlockSub: { fontSize: 11, color: colors.text3 },
  inOutDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.07)" },

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
  barIn: { width: "100%", backgroundColor: "rgba(48,209,88,0.55)", borderRadius: 3 },
  barOut: { width: "100%", backgroundColor: "rgba(255,69,58,0.45)", borderRadius: 3 },
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
  legendDotIn: { backgroundColor: "rgba(48,209,88,0.7)" },
  legendDotOut: { backgroundColor: "rgba(255,69,58,0.7)" },
  legendLabel: { fontSize: 11, color: colors.text3 },

  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  statLabel: { fontSize: 13, color: colors.text2 },
  statValue: { fontSize: 14, fontWeight: "700", color: colors.text1 },

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
