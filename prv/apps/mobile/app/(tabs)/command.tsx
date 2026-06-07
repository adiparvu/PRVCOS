import { ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { GlassCard } from "@/components/Glass"
import { colors, spacing, type } from "@/tokens"

const METRICS = [
  { label: "Revenue", value: "—", sub: "Today" },
  { label: "Active Projects", value: "—", sub: "In Progress" },
  { label: "Team Online", value: "—", sub: "Right Now" },
  { label: "Open Tasks", value: "—", sub: "Assigned" },
]

export default function CommandScreen() {
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
      <Text style={styles.greeting}>Good morning</Text>
      <Text style={styles.headline}>Command</Text>

      {/* KPI grid */}
      <View style={styles.grid}>
        {METRICS.map((m) => (
          <GlassCard key={m.label} style={styles.metric}>
            <Text style={styles.metricValue}>{m.value}</Text>
            <Text style={styles.metricLabel}>{m.label}</Text>
            <Text style={styles.metricSub}>{m.sub}</Text>
          </GlassCard>
        ))}
      </View>

      {/* AI Briefing */}
      <Text style={styles.sectionTitle}>AI Briefing</Text>
      <GlassCard style={styles.briefingCard}>
        <Text style={styles.briefingIcon}>✦</Text>
        <Text style={styles.briefingText}>
          Your daily intelligence briefing will appear here. PRV AI is analyzing your company data.
        </Text>
      </GlassCard>

      {/* Inbox */}
      <Text style={styles.sectionTitle}>Inbox</Text>
      <GlassCard style={styles.emptyCard}>
        <Text style={styles.emptyText}>No new notifications</Text>
      </GlassCard>
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
  greeting: {
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
    ...type.title1,
    color: colors.text1,
  },
  metricLabel: {
    ...type.subhead,
    color: colors.text2,
  },
  metricSub: {
    ...type.caption1,
    color: colors.text3,
  },
  sectionTitle: {
    ...type.headline,
    color: colors.text2,
    marginBottom: 10,
    marginTop: 4,
  },
  briefingCard: {
    padding: spacing.base,
    marginBottom: spacing.lg,
    gap: 10,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  briefingIcon: {
    fontSize: 18,
    color: colors.text2,
    marginTop: 2,
  },
  briefingText: {
    ...type.subhead,
    color: colors.text3,
    flex: 1,
    lineHeight: 20,
  },
  emptyCard: {
    padding: spacing.base,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  emptyText: {
    ...type.subhead,
    color: colors.text3,
  },
})
