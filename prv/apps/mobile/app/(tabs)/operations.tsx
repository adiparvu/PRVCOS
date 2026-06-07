import { ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { GlassCard } from "@/components/Glass"
import { colors, spacing, type } from "@/tokens"

const SECTIONS = [
  { icon: "⊞", label: "Stores", desc: "Locations & status" },
  { icon: "⬡", label: "Inventory", desc: "Stock & warehouses" },
  { icon: "✓", label: "Tasks", desc: "Assigned & pending" },
  { icon: "◈", label: "Orders", desc: "Active & fulfilled" },
]

export default function OperationsScreen() {
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
      <Text style={styles.headline}>Operations</Text>

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

      <Text style={styles.sectionTitle}>Active Tasks</Text>
      <GlassCard style={styles.emptyCard}>
        <Text style={styles.emptyText}>No active tasks</Text>
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
  list: {
    gap: 8,
    marginBottom: spacing.lg,
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
  sectionTitle: {
    ...type.headline,
    color: colors.text2,
    marginBottom: 10,
  },
  emptyCard: {
    padding: spacing.base,
    alignItems: "center",
  },
  emptyText: {
    ...type.subhead,
    color: colors.text3,
  },
})
