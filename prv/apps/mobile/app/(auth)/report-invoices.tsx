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
import { useInvoicesReport, type InvoiceTrendMonth } from "@/hooks/useIntelligenceReports"
import { colors, radius, spacing } from "@/tokens"

function InvoiceChart({ data }: { data: InvoiceTrendMonth[] }) {
  const maxVal = Math.max(...data.map((d) => d.issued), 1)
  return (
    <View style={s.chart}>
      <View style={s.chartBars}>
        {data.map((d) => {
          const h = Math.max(4, Math.round((d.issued / maxVal) * 72))
          return (
            <View key={d.month} style={s.barWrap}>
              <View style={s.barTrack}>
                <View style={[s.bar, { height: h }]} />
              </View>
              <Text style={s.barLabel}>{d.month.slice(0, 3)}</Text>
            </View>
          )
        })}
      </View>
      <View style={s.chartLegend}>
        <View style={s.legendItem}>
          <View style={s.legendDot} />
          <Text style={s.legendLabel}>Invoices Issued</Text>
        </View>
      </View>
    </View>
  )
}

const STATUS_COLORS: Record<string, string> = {
  sent: "rgba(255,255,255,0.55)",
  overdue: "rgba(255,69,58,0.6)",
  paid: "rgba(48,209,88,0.55)",
  draft: "rgba(255,255,255,0.22)",
  cancelled: "rgba(255,255,255,0.18)",
}

export default function ReportInvoicesScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { data, isLoading, isError, refetch } = useInvoicesReport()

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
        <Text style={s.errText}>Could not load invoice data.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => void refetch()} activeOpacity={0.8}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const { kpi, byStatus, trend } = data
  const hasOverdue = kpi.overdueCount > 0

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.navbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Invoices Report</Text>
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
          <Text style={s.heroLabel}>Outstanding Balance</Text>
          <Text style={s.heroBig}>{kpi.outstandingFormatted}</Text>
          <View style={s.heroRow}>
            <View
              style={[
                s.heroPill,
                hasOverdue
                  ? { borderColor: colors.red + "44", backgroundColor: colors.red + "12" }
                  : {},
              ]}
            >
              <Text style={[s.heroPillText, hasOverdue ? { color: colors.red } : {}]}>
                {kpi.overdueCount > 0 ? `${kpi.overdueCount} overdue` : "No overdue"}
              </Text>
            </View>
            <View
              style={[
                s.heroPill,
                { borderColor: colors.green + "44", backgroundColor: colors.green + "12" },
              ]}
            >
              <Text style={[s.heroPillText, { color: colors.green }]}>
                {kpi.collectionRate}% collected
              </Text>
            </View>
          </View>
        </View>

        {/* KPI row */}
        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <View style={s.cardShine} pointerEvents="none" />
            <Text style={s.kpiLabel}>Paid MTD</Text>
            <Text style={[s.kpiValue, { color: colors.green }]}>{kpi.paidMtdFormatted}</Text>
          </View>
          <View style={s.kpiCard}>
            <View style={s.cardShine} pointerEvents="none" />
            <Text style={s.kpiLabel}>Overdue</Text>
            <Text style={[s.kpiValue, hasOverdue ? { color: colors.red } : {}]}>
              {kpi.overdueFormatted}
            </Text>
          </View>
          <View style={s.kpiCard}>
            <View style={s.cardShine} pointerEvents="none" />
            <Text style={s.kpiLabel}>Invoices Paid</Text>
            <Text style={s.kpiValue}>{kpi.paidCount}</Text>
          </View>
        </View>

        {/* Status breakdown */}
        <>
          <Text style={s.sectionLabel}>By Status</Text>
          <View style={s.card}>
            <View style={s.cardShine} pointerEvents="none" />
            {byStatus
              .filter((r) => r.count > 0)
              .map((row) => (
                <View key={row.status} style={s.statusRow}>
                  <View
                    style={[
                      s.statusDot,
                      { backgroundColor: STATUS_COLORS[row.status] ?? colors.text3 },
                    ]}
                  />
                  <Text style={s.statusLabel}>{row.label}</Text>
                  <Text style={s.statusAmount}>{row.amountFormatted}</Text>
                  <Text style={s.statusCount}>{row.count}</Text>
                </View>
              ))}
          </View>
        </>

        {/* 6-month trend */}
        <Text style={s.sectionLabel}>6-Month Trend</Text>
        <View style={s.card}>
          <View style={s.cardShine} pointerEvents="none" />
          <View style={{ padding: spacing.base }}>
            <InvoiceChart data={trend} />
          </View>
        </View>

        {/* Monthly table */}
        <Text style={s.sectionLabel}>Monthly Breakdown</Text>
        <View style={s.card}>
          <View style={s.cardShine} pointerEvents="none" />
          {trend.map((m) => (
            <View key={m.month} style={s.tableRow}>
              <Text style={s.tableLabel}>{m.month}</Text>
              <View style={s.tableRight}>
                <Text style={s.tableIssued}>{m.issued} issued</Text>
                <Text style={[s.tablePaid, { color: m.paid > 0 ? colors.green : colors.text3 }]}>
                  {m.paid > 0 ? `${m.paid} paid` : "—"}
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
  kpiValue: { fontSize: 15, fontWeight: "700", color: colors.text1 },

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
  statusLabel: { fontSize: 13, color: colors.text2, flex: 1 },
  statusAmount: { fontSize: 13, fontWeight: "600", color: colors.text2 },
  statusCount: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text1,
    width: 28,
    textAlign: "right",
  },

  chart: { gap: 10 },
  chartBars: { flexDirection: "row", alignItems: "flex-end", height: 80, gap: 3 },
  barWrap: { flex: 1, alignItems: "center" },
  barTrack: { width: "100%", height: 72, justifyContent: "flex-end" },
  bar: { width: "100%", backgroundColor: "rgba(255,255,255,0.45)", borderRadius: 2 },
  barLabel: { fontSize: 7, color: colors.text3, marginTop: 4 },
  chartLegend: { flexDirection: "row", gap: 14, justifyContent: "center", marginTop: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.45)" },
  legendLabel: { fontSize: 11, color: colors.text3 },

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
  tableRight: { flexDirection: "row", gap: 12, alignItems: "center" },
  tableIssued: { fontSize: 12, color: colors.text3 },
  tablePaid: { fontSize: 13, fontWeight: "700" },

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
