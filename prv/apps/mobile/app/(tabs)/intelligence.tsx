import { ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { GlassCard } from "@/components/Glass"
import { colors, spacing, type } from "@/tokens"

const SECTIONS = [
  { icon: "✦", label: "AI Insights", desc: "Patterns & anomalies" },
  { icon: "◈", label: "Analytics", desc: "KPIs & dashboards" },
  { icon: "≋", label: "Reports", desc: "Custom & scheduled" },
  { icon: "⟳", label: "Forecast", desc: "Predictive models" },
]

export default function IntelligenceScreen() {
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
      <Text style={styles.headline}>Intelligence</Text>

      {/* AI highlight */}
      <GlassCard style={styles.aiCard}>
        <View style={styles.aiHeader}>
          <Text style={styles.aiIcon}>✦</Text>
          <Text style={styles.aiTitle}>PRV AI</Text>
        </View>
        <Text style={styles.aiBody}>
          AI-powered insights, forecasts, and anomaly detection across all your company data.
          Powered by pgvector and real-time analytics.
        </Text>
      </GlassCard>

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
  aiCard: {
    padding: spacing.base,
    marginBottom: spacing.lg,
    gap: 12,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiIcon: {
    fontSize: 20,
    color: colors.text1,
  },
  aiTitle: {
    ...type.headline,
    color: colors.text1,
  },
  aiBody: {
    ...type.subhead,
    color: colors.text3,
    lineHeight: 20,
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
