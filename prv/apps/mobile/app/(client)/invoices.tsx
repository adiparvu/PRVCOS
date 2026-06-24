import React, { useState } from "react"
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { GlassCard } from "@/components/Glass"
import { SkeletonRow } from "@/components/Skeleton"
import { useClientInvoices } from "@/hooks/useClientPortal"
import { colors, radius, type as type_, spacing } from "@/tokens"

type FilterOption = "all" | "unpaid" | "paid" | "overdue"

const FILTER_OPTIONS: { key: FilterOption; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unpaid", label: "Unpaid" },
  { key: "paid", label: "Paid" },
  { key: "overdue", label: "Overdue" },
]

function statusTextColor(status: string): string {
  if (status === "paid") return colors.green
  if (status === "overdue") return colors.red
  if (status === "sent") return colors.amber
  return colors.text2
}

function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <View style={styles.statusBadge}>
      <Text style={[styles.statusBadgeText, { color: statusTextColor(status) }]}>
        {label ?? status}
      </Text>
    </View>
  )
}

export default function InvoicesScreen() {
  const insets = useSafeAreaInsets()
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all")

  const statusParam = activeFilter === "all" ? undefined : activeFilter
  const { data, isLoading } = useClientInvoices(statusParam)
  const invoices = data?.invoices ?? []
  const summary = data?.summary

  const paddingBottom = insets.bottom + 104

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.base }]}>
        <Text style={styles.headerTitle}>Invoices</Text>
      </View>

      {/* Summary card */}
      {summary && (
        <View style={styles.summaryWrapper}>
          <GlassCard style={styles.summaryCard}>
            <View style={styles.summaryCardShine} pointerEvents="none" />
            <View style={styles.summaryHalf}>
              <Text style={styles.summaryValue}>{summary.total}</Text>
              <Text style={styles.summaryLabel}>Total Spent</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryHalf}>
              <Text style={[styles.summaryValue, { color: colors.amber }]}>{summary.pending}</Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </View>
          </GlassCard>
        </View>
      )}

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
            <SkeletonRow style={{ marginBottom: spacing.sm }} />
            <SkeletonRow style={{ marginBottom: spacing.sm }} />
            <SkeletonRow style={{ marginBottom: spacing.sm }} />
            <SkeletonRow style={{ marginBottom: spacing.sm }} />
            <SkeletonRow style={{ marginBottom: spacing.sm }} />
          </>
        )}

        {/* Empty state */}
        {!isLoading && invoices.length === 0 && (
          <GlassCard style={styles.emptyCard}>
            <View style={styles.emptyCardShine} pointerEvents="none" />
            <Text style={styles.emptyGlyph}>⟁</Text>
            <Text style={styles.emptyTitle}>No invoices</Text>
            <Text style={styles.emptySubtitle}>
              Your invoices will appear here once they are issued.
            </Text>
          </GlassCard>
        )}

        {/* Invoice rows */}
        {!isLoading &&
          invoices.map((invoice) => (
            <GlassCard key={invoice.id} style={styles.invoiceCard}>
              <View style={styles.invoiceCardShine} pointerEvents="none" />
              <View style={styles.invoiceRow}>
                {/* Left */}
                <View style={styles.invoiceLeft}>
                  <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                  {invoice.projectName ? (
                    <Text style={styles.invoiceProject} numberOfLines={1}>
                      {invoice.projectName}
                    </Text>
                  ) : null}
                </View>

                {/* Center */}
                <View style={styles.invoiceCenter}>
                  {invoice.issueDate ? (
                    <Text style={styles.invoiceDateText}>{invoice.issueDate}</Text>
                  ) : null}
                  {invoice.status !== "paid" && invoice.dueDate ? (
                    <Text style={styles.invoiceDueText}>Due {invoice.dueDate}</Text>
                  ) : null}
                  {invoice.status === "paid" && invoice.paidDate ? (
                    <Text style={styles.invoiceDueText}>Paid {invoice.paidDate}</Text>
                  ) : null}
                </View>

                {/* Right */}
                <View style={styles.invoiceRight}>
                  <Text style={styles.invoiceTotal}>{invoice.total}</Text>
                  <StatusBadge status={invoice.status} label={invoice.statusLabel} />
                </View>
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
  summaryWrapper: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.card,
    flexDirection: "row",
    overflow: "hidden",
  },
  summaryCardShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  summaryHalf: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.md,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.md,
  },
  summaryValue: {
    ...type_.title3,
    color: colors.text1,
    marginBottom: 2,
  },
  summaryLabel: {
    ...type_.caption2,
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.4,
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
  invoiceCard: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: 8,
    overflow: "hidden",
  },
  invoiceCardShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  invoiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  invoiceLeft: {
    flex: 1.2,
    minWidth: 0,
  },
  invoiceNumber: {
    ...type_.footnote,
    color: colors.text1,
    fontWeight: "700",
    marginBottom: 2,
  },
  invoiceProject: {
    ...type_.caption2,
    color: colors.text3,
  },
  invoiceCenter: {
    flex: 1.2,
    alignItems: "center",
    minWidth: 0,
  },
  invoiceDateText: {
    ...type_.caption2,
    color: colors.text3,
    marginBottom: 2,
  },
  invoiceDueText: {
    ...type_.caption2,
    color: colors.text3,
  },
  invoiceRight: {
    flex: 0.9,
    alignItems: "flex-end",
    gap: spacing.xs,
    minWidth: 0,
  },
  invoiceTotal: {
    ...type_.subhead,
    color: colors.text1,
    fontWeight: "700",
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
})
