import React, { useState } from "react"
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { GlassCard } from "@/components/Glass"
import { SkeletonCard } from "@/components/Skeleton"
import { useClientProjects } from "@/hooks/useClientPortal"
import { colors, radius, type as type_, spacing } from "@/tokens"

type FilterOption = "all" | "active" | "planning" | "completed"

const FILTER_OPTIONS: { key: FilterOption; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "planning", label: "Planning" },
  { key: "completed", label: "Completed" },
]

function StatusBadge({ status, label }: { status: string; label?: string }) {
  const textColor =
    status === "completed" || status === "paid"
      ? colors.green
      : status === "in_progress" || status === "pending" || status === "active"
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

export default function ProjectsScreen() {
  const insets = useSafeAreaInsets()
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all")

  const statusParam = activeFilter === "all" ? undefined : activeFilter
  const { data, isLoading } = useClientProjects(statusParam)
  const projects = data?.projects ?? []

  const paddingBottom = insets.bottom + 104

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.base }]}>
        <Text style={styles.headerTitle}>My Projects</Text>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {FILTER_OPTIONS.map((option) => {
          const isActive = activeFilter === option.key
          return (
            <TouchableOpacity
              key={option.key}
              onPress={() => setActiveFilter(option.key)}
              activeOpacity={0.7}
              style={[
                styles.filterChip,
                isActive ? styles.filterChipActive : styles.filterChipInactive,
              ]}
            >
              <Text
                style={[styles.filterChipText, { color: isActive ? colors.text1 : colors.text3 }]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading state */}
        {isLoading && (
          <>
            <SkeletonCard style={{ marginBottom: 10 }} />
            <SkeletonCard style={{ marginBottom: 10 }} />
            <SkeletonCard style={{ marginBottom: 10 }} />
          </>
        )}

        {/* Empty state */}
        {!isLoading && projects.length === 0 && (
          <GlassCard style={styles.emptyCard}>
            <View style={styles.emptyCardShine} pointerEvents="none" />
            <Text style={styles.emptyGlyph}>◈</Text>
            <Text style={styles.emptyTitle}>No projects yet</Text>
            <Text style={styles.emptySubtitle}>
              Your projects will appear here once they are created.
            </Text>
          </GlassCard>
        )}

        {/* Project cards */}
        {!isLoading &&
          projects.map((project) => (
            <GlassCard key={project.id} style={styles.projectCard}>
              <View style={styles.projectCardShine} pointerEvents="none" />

              {/* Top: name + status */}
              <View style={styles.projectTopRow}>
                <Text style={styles.projectName} numberOfLines={1}>
                  {project.name}
                </Text>
                <StatusBadge status={project.status} label={project.statusLabel} />
              </View>

              {/* Address */}
              {project.address ? (
                <Text style={styles.projectAddress} numberOfLines={1}>
                  {project.address}
                </Text>
              ) : null}

              {/* Progress */}
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressPercent}>{project.progress ?? 0}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${project.progress ?? 0}%` }]} />
              </View>

              {/* Budget row */}
              {project.budget ? (
                <View style={styles.budgetRow}>
                  <GlassCard style={styles.budgetMiniCard}>
                    <View style={styles.budgetMiniShine} pointerEvents="none" />
                    <Text style={styles.budgetMiniLabel}>Budget</Text>
                    <Text style={styles.budgetMiniValue}>{project.budget}</Text>
                  </GlassCard>
                  <GlassCard style={styles.budgetMiniCard}>
                    <View style={styles.budgetMiniShine} pointerEvents="none" />
                    <Text style={styles.budgetMiniLabel}>Spent</Text>
                    <Text style={styles.budgetMiniValue}>{project.spent ?? "—"}</Text>
                  </GlassCard>
                </View>
              ) : null}

              {/* Next milestone */}
              {project.nextMilestone ? (
                <Text style={styles.nextMilestone} numberOfLines={1}>
                  ◈ Next: {project.nextMilestone}
                </Text>
              ) : null}

              {/* Footer: dates + photos */}
              <View style={styles.projectFooter}>
                <Text style={styles.projectDates}>
                  {project.startDate} → {project.endDate}
                </Text>
                {project.photosCount != null && project.photosCount > 0 && (
                  <View style={styles.photosChip}>
                    <Text style={styles.photosChipText}>◻ {project.photosCount} photos</Text>
                  </View>
                )}
              </View>
            </GlassCard>
          ))}
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
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...type_.title1,
    color: colors.text1,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterRow: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    flexDirection: "row",
  },
  filterChip: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  filterChipActive: {
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipInactive: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filterChipText: {
    ...type_.subhead,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
  },
  emptyCard: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.card,
    padding: spacing.xxl,
    alignItems: "center",
    overflow: "hidden",
    marginTop: spacing.xxl,
  },
  emptyCardShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  emptyGlyph: {
    fontSize: 32,
    color: colors.text3,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...type_.headline,
    color: colors.text1,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...type_.subhead,
    color: colors.text3,
    textAlign: "center",
  },
  projectCard: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.card,
    padding: spacing.base,
    marginBottom: 10,
    overflow: "hidden",
  },
  projectCardShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  projectTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  projectName: {
    ...type_.headline,
    color: colors.text1,
    flex: 1,
    marginRight: spacing.sm,
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
  projectAddress: {
    ...type_.caption2,
    color: colors.text3,
    marginBottom: spacing.md,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  progressLabel: {
    ...type_.caption2,
    color: colors.text3,
  },
  progressPercent: {
    ...type_.caption2,
    color: colors.text2,
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderSubtle,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: colors.text1,
  },
  budgetRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  budgetMiniCard: {
    flex: 1,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.sm,
    overflow: "hidden",
  },
  budgetMiniShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  budgetMiniLabel: {
    ...type_.caption2,
    color: colors.text3,
    marginBottom: 2,
  },
  budgetMiniValue: {
    ...type_.footnote,
    color: colors.text1,
    fontWeight: "600",
  },
  nextMilestone: {
    ...type_.caption2,
    color: colors.text3,
    marginBottom: spacing.md,
  },
  projectFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  projectDates: {
    ...type_.caption2,
    color: colors.text4,
  },
  photosChip: {
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  photosChipText: {
    ...type_.caption2,
    color: colors.text2,
  },
})
