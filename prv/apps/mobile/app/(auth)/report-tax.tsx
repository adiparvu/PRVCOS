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
import { useReports, type VatTrendMonth } from "@/hooks/useFinance"
import { colors, radius, spacing } from "@/tokens"

function VatChart({ data }: { data: VatTrendMonth[] }) {
  const maxVal = Math.max(...data.map((d) => d.vat), 1)
  return (
    <View style={s.chart}>
      <View style={s.chartBars}>
        {data.map((d) => {
          const h = Math.max(4, Math.round((d.vat / maxVal) * 72))
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
    </View>
  )
}

export default function ReportTaxScreen() {
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
        <Text style={s.errText}>Could not load tax data.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => void refetch()} activeOpacity={0.8}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const { tax } = data

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.navbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>VAT & Tax</Text>
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
          <Text style={s.heroLabel}>VAT Collected · This Month</Text>
          <Text style={s.heroBig}>{tax.vatMtdFormatted}</Text>
          <View style={s.periodPill}>
            <Text style={s.periodPillText}>Period: {tax.period}</Text>
          </View>
        </View>

        {/* Note */}
        <View style={s.noteCard}>
          <View style={s.cardShine} pointerEvents="none" />
          <Text style={s.noteText}>
            VAT output collected from paid invoices. Figures based on invoice issue date. Consult
            your accountant for official VAT declarations.
          </Text>
        </View>

        {/* 6-month chart */}
        <Text style={s.sectionLabel}>VAT Collected · 6 Months</Text>
        <View style={s.card}>
          <View style={s.cardShine} pointerEvents="none" />
          <View style={{ padding: spacing.base }}>
            <VatChart data={tax.trend} />
          </View>
        </View>

        {/* Monthly table */}
        <Text style={s.sectionLabel}>Monthly Breakdown</Text>
        <View style={s.card}>
          <View style={s.cardShine} pointerEvents="none" />
          {tax.trend.map((m) => (
            <View key={m.month} style={s.tableRow}>
              <Text style={s.tableLabel}>{m.month}</Text>
              <Text style={s.tableValue}>
                {m.vat > 0
                  ? m.vat >= 1000
                    ? `RON ${(m.vat / 1000).toFixed(1)}k`
                    : `RON ${m.vat.toFixed(0)}`
                  : "—"}
              </Text>
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
  periodPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginTop: 4,
  },
  periodPillText: { fontSize: 12, fontWeight: "600", color: colors.text2 },

  noteCard: {
    backgroundColor: "rgba(255,159,10,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,159,10,0.15)",
    borderRadius: 14,
    padding: spacing.base,
    overflow: "hidden",
    position: "relative",
  },
  noteText: { fontSize: 12, color: colors.text3, lineHeight: 18 },

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
  chartBars: { flexDirection: "row", alignItems: "flex-end", height: 80, gap: 6 },
  barWrap: { flex: 1, alignItems: "center" },
  barTrack: { width: "100%", height: 72, justifyContent: "flex-end" },
  bar: { width: "100%", backgroundColor: "rgba(255,255,255,0.45)", borderRadius: 3 },
  barLabel: { fontSize: 9, color: colors.text3, marginTop: 4 },

  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  tableLabel: { fontSize: 13, color: colors.text2 },
  tableValue: { fontSize: 14, fontWeight: "700", color: colors.text1 },

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
