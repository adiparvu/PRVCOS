import React, { useCallback } from "react"
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { GlassCard } from "@/components/Glass"
import { SkeletonCard, SkeletonRow } from "@/components/Skeleton"
import { useClientOverview, getInitials } from "@/hooks/useClientPortal"
import { colors, radius, type as type_, spacing } from "@/tokens"

const ACTIVITY_GLYPHS: Record<string, string> = {
  project: "◎",
  invoice: "⟁",
  document: "◻",
  milestone: "◈",
  default: "▪",
}

function StatusBadge({ status, label }: { status: string; label?: string }) {
  const textColor =
    status === "completed" || status === "paid"
      ? colors.green
      : status === "in_progress" || status === "pending"
        ? colors.amber
        : status === "overdue"
          ? colors.red
          : colors.text2

  return (
    <View style={styles.statusBadge}>
      <Text style={[styles.statusBadgeText, { color: textColor }]}>{label ?? status}</Text>
    </View>
  )
}

export default function OverviewScreen() {
  const insets = useSafeAreaInsets()
  const { data, isLoading, error } = useClientOverview()
  const [refreshing, setRefreshing] = React.useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await new Promise((r) => setTimeout(r, 800))
    setRefreshing(false)
  }, [])

  const paddingBottom = insets.bottom + 104

  if (isLoading && !data) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.base }]}>
          <Text style={styles.headerTitle}>My Portal</Text>
          <View style={styles.bellButton} />
        </View>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom }]}
          showsVerticalScrollIndicator={false}
        >
          <SkeletonCard style={{ marginBottom: spacing.md }} />
          <SkeletonCard style={{ marginBottom: spacing.md }} />
          <SkeletonRow style={{ marginBottom: spacing.sm }} />
          <SkeletonRow style={{ marginBottom: spacing.sm }} />
          <SkeletonRow style={{ marginBottom: spacing.sm }} />
        </ScrollView>
      </View>
    )
  }

  const client = data?.client
  const kpis = data?.kpis
  const activeProjects = data?.activeProjects ?? []
  const recentActivity = data?.recentActivity ?? []

  const initials = client ? getInitials(client.firstName, client.lastName) : "?"

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.base }]}>
        <Text style={styles.headerTitle}>My Portal</Text>
        <TouchableOpacity style={styles.bellButton} activeOpacity={0.7}>
          <View style={styles.bellShine} pointerEvents="none" />
          <Text style={styles.bellIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text3} />
        }
      >
        {/* Profile greeting card */}
        <GlassCard style={styles.profileCard}>
          <View style={styles.profileCardShine} pointerEvents="none" />
          <View style={styles.profileRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
            <View style={styles.profileTextCol}>
              <Text style={styles.greetingText}>Good morning, {client?.firstName ?? ""}</Text>
              <Text style={styles.memberSince}>Member since {client?.memberSince ?? ""}</Text>
              <View style={styles.portalBadge}>
                <Text style={styles.portalBadgeText}>Client Portal</Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* KPI grid */}
        {kpis && (
          <View style={styles.kpiGrid}>
            <GlassCard style={styles.kpiCard}>
              <View style={styles.kpiCardShine} pointerEvents="none" />
              <Text style={styles.kpiValue}>{kpis.activeProjects}</Text>
              <Text style={styles.kpiLabel}>ACTIVE{"\n"}PROJECTS</Text>
            </GlassCard>
            <GlassCard style={styles.kpiCard}>
              <View style={styles.kpiCardShine} pointerEvents="none" />
              <Text style={styles.kpiValue}>{kpis.pendingInvoices}</Text>
              <Text style={styles.kpiLabel}>PENDING{"\n"}INVOICES</Text>
            </GlassCard>
            <GlassCard style={styles.kpiCard}>
              <View style={styles.kpiCardShine} pointerEvents="none" />
              <Text style={styles.kpiValue}>{kpis.pendingAmount}</Text>
              <Text style={styles.kpiLabel}>PENDING{"\n"}AMOUNT</Text>
            </GlassCard>
            <GlassCard style={styles.kpiCard}>
              <View style={styles.kpiCardShine} pointerEvents="none" />
              <Text style={styles.kpiValue}>{kpis.totalSpent}</Text>
              <Text style={styles.kpiLabel}>TOTAL{"\n"}SPENT</Text>
            </GlassCard>
          </View>
        )}

        {/* Active Projects */}
        {activeProjects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Active Projects</Text>
            {activeProjects.map((project) => (
              <GlassCard key={project.id} style={styles.projectMiniCard}>
                <View style={styles.projectMiniCardShine} pointerEvents="none" />
                <View style={styles.projectMiniHeader}>
                  <Text style={styles.projectMiniName} numberOfLines={1}>
                    {project.name}
                  </Text>
                  <StatusBadge status={project.status} label={project.status} />
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${project.progress ?? 0}%` }]} />
                </View>
                {project.nextMilestone ? (
                  <Text style={styles.nextMilestoneText} numberOfLines={1}>
                    ◈ {project.nextMilestone}
                  </Text>
                ) : null}
              </GlassCard>
            ))}
          </View>
        )}

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Recent Activity</Text>
            <GlassCard style={styles.activityCard}>
              <View style={styles.activityCardShine} pointerEvents="none" />
              {recentActivity.map((item, idx) => (
                <View key={item.id}>
                  <View style={styles.activityRow}>
                    <Text style={styles.activityGlyph}>
                      {ACTIVITY_GLYPHS[item.type] ?? ACTIVITY_GLYPHS.default}
                    </Text>
                    <View style={styles.activityTextCol}>
                      <Text style={styles.activityTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.activitySubtitle} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    </View>
                    <Text style={styles.activityTimeAgo}>{item.timeAgo}</Text>
                  </View>
                  {idx < recentActivity.length - 1 && <View style={styles.activityDivider} />}
                </View>
              ))}
            </GlassCard>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...type_.title1,
    color: colors.text1,
  },
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  bellShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  bellIcon: {
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  profileCard: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.card,
    padding: spacing.base,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  profileCardShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    ...type_.headline,
    color: colors.text1,
  },
  profileTextCol: {
    flex: 1,
    gap: 2,
  },
  greetingText: {
    ...type_.headline,
    color: colors.text1,
  },
  memberSince: {
    ...type_.caption2,
    color: colors.text3,
  },
  portalBadge: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  portalBadgeText: {
    ...type_.caption2,
    color: colors.text2,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  kpiCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.card,
    padding: spacing.md,
    overflow: "hidden",
    alignItems: "flex-start",
  },
  kpiCardShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  kpiValue: {
    ...type_.title2,
    color: colors.text1,
    marginBottom: 2,
  },
  kpiLabel: {
    ...type_.caption2,
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...type_.footnote,
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
  },
  projectMiniCard: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  projectMiniCardShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  projectMiniHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  projectMiniName: {
    ...type_.headline,
    color: colors.text1,
    flex: 1,
    marginRight: spacing.sm,
  },
  progressBarBg: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.borderSubtle,
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: colors.text1,
  },
  nextMilestoneText: {
    ...type_.caption2,
    color: colors.text3,
    marginTop: spacing.xs,
  },
  statusBadge: {
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  statusBadgeText: {
    ...type_.caption2,
  },
  activityCard: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  activityCardShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  activityGlyph: {
    fontSize: 16,
    color: colors.text3,
    width: 20,
    textAlign: "center",
  },
  activityTextCol: {
    flex: 1,
  },
  activityTitle: {
    ...type_.footnote,
    color: colors.text1,
    marginBottom: 2,
  },
  activitySubtitle: {
    ...type_.caption2,
    color: colors.text3,
  },
  activityTimeAgo: {
    ...type_.caption2,
    color: colors.text4,
    textAlign: "right",
  },
  activityDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: spacing.md,
  },
})
