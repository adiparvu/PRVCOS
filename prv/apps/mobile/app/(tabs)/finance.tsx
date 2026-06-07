import { ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { GlassCard } from "@/components/Glass"
import { colors, spacing, type } from "@/tokens"

const METRICS = [
  { label: "Revenue", value: "—", period: "This Month" },
  { label: "Expenses", value: "—", period: "This Month" },
  { label: "Profit", value: "—", period: "This Month" },
  { label: "Forecast", value: "—", period: "End of Month" },
]

const SECTIONS = [
  { icon: "⟁", label: "Revenue", desc: "Income & invoices" },
  { icon: "◫", label: "Expenses", desc: "Costs & approvals" },
  { icon: "≡", label: "Reports", desc: "P&L, Balance sheet" },
  { icon: "◩", label: "Tax", desc: "VAT & declarations" },
]

export default function FinanceScreen() {
  const insets = useSafeAreaInsets()

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 104 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.eyebrow}>Platform</Text>
      <Text style={styles.headline}>Finance</Text>

      <View style={styles.grid}>
        {METRICS.map((m) => (
          <GlassCard key={m.label} style={styles.metric}>
            <Text style={styles.metricValue}>{m.value}</Text>
            <Text style={styles.metricLabel}>{m.label}</Text>
            <Text style={styles.metricPeriod}>{m.period}</Text>
          </GlassCard>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Modules</Text>
      <View style={styles.list}>
        {SECTIONS.map((s) => (
          <GlassCard key={s.label} style={styles.row}>
            <Text style={styles.rowIcon}>{s.icon}</Text>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{s.label}</Text>
              <Text style={styles.rowDesc}>{s.desc}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </GlassCard>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.base,
  },
  eyebrow: {
    ...type.footnote,
    color: colors.text3,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headline: {
    ...type.largeTitle,
    color: colors.text1,
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: spacing.lg,
  },
  metric: {
    width: "47.5%",
    padding: spacing.base,
    gap: 4,
  },
  metricValue: {
    ...type.title2,
    color: colors.text1,
  },
  metricLabel: {
    ...type.subhead,
    color: colors.text2,
  },
  metricPeriod: {
    ...type.caption1,
    color: colors.text3,
  },
  sectionTitle: {
    ...type.headline,
    color: colors.text2,
    marginBottom: 10,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.base,
    gap: 12,
  },
  rowIcon: {
    fontSize: 22,
    color: colors.text2,
    width: 28,
    textAlign: "center",
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    ...type.body,
    color: colors.text1,
  },
  rowDesc: {
    ...type.caption1,
    color: colors.text3,
  },
  chevron: {
    fontSize: 20,
    color: colors.text3,
  },
})
