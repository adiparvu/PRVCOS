import React, { useState } from "react"
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { GlassCard } from "@/components/Glass"
import { SkeletonRow } from "@/components/Skeleton"
import { useClientDocuments, formatFileSize } from "@/hooks/useClientPortal"
import { colors, radius, type as type_, spacing } from "@/tokens"

type FilterOption = "all" | "contracts" | "photos" | "reports" | "invoices"

const FILTER_OPTIONS: { key: FilterOption; label: string }[] = [
  { key: "all", label: "All" },
  { key: "contracts", label: "Contracts" },
  { key: "photos", label: "Photos" },
  { key: "reports", label: "Reports" },
  { key: "invoices", label: "Invoices" },
]

const TYPE_GLYPHS: Record<string, string> = {
  contract: "◻",
  photo: "◉",
  report: "⊞",
  invoice: "⟁",
  other: "▪",
}

function docGlyph(type: string): string {
  return TYPE_GLYPHS[type] ?? TYPE_GLYPHS.other
}

export default function DocumentsScreen() {
  const insets = useSafeAreaInsets()
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all")

  const typeParam = activeFilter === "all" ? undefined : activeFilter
  const { data, isLoading } = useClientDocuments(typeParam)
  const documents = data?.documents ?? []

  const paddingBottom = insets.bottom + 104

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.base }]}>
        <Text style={styles.headerTitle}>Documents</Text>
        <TouchableOpacity style={styles.uploadButton} activeOpacity={0.7}>
          <View style={styles.uploadButtonShine} pointerEvents="none" />
          <Text style={styles.uploadIcon}>↑</Text>
        </TouchableOpacity>
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
            <SkeletonRow style={{ marginBottom: 8 }} />
            <SkeletonRow style={{ marginBottom: 8 }} />
            <SkeletonRow style={{ marginBottom: 8 }} />
            <SkeletonRow style={{ marginBottom: 8 }} />
          </>
        )}

        {/* Empty state */}
        {!isLoading && documents.length === 0 && (
          <GlassCard style={styles.emptyCard}>
            <View style={styles.emptyCardShine} pointerEvents="none" />
            <Text style={styles.emptyGlyph}>◻</Text>
            <Text style={styles.emptyTitle}>No documents yet</Text>
            <Text style={styles.emptySubtitle}>Upload or share documents to see them here.</Text>
          </GlassCard>
        )}

        {/* Document rows */}
        {!isLoading &&
          documents.map((doc) => (
            <GlassCard key={doc.id} style={styles.docCard}>
              <View style={styles.docCardShine} pointerEvents="none" />
              <View style={styles.docRow}>
                {/* Left: icon */}
                <View style={styles.iconArea}>
                  <View style={styles.iconCircle}>
                    <Text style={styles.iconGlyph}>{docGlyph(doc.type)}</Text>
                  </View>
                  {/* Type badge pinned absolute to top-right of icon area */}
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText} numberOfLines={1}>
                      {doc.typeLabel ?? doc.type}
                    </Text>
                  </View>
                </View>

                {/* Center: name, project, date */}
                <View style={styles.docCenter}>
                  <Text style={styles.docName} numberOfLines={1}>
                    {doc.name}
                  </Text>
                  {doc.projectName ? (
                    <Text style={styles.docProject} numberOfLines={1}>
                      {doc.projectName}
                    </Text>
                  ) : null}
                  {doc.createdAt ? <Text style={styles.docDate}>{doc.createdAt}</Text> : null}
                </View>

                {/* Right: fileSize + chevron */}
                <View style={styles.docRight}>
                  <Text style={styles.docSize}>{formatFileSize(doc.sizeKb)}</Text>
                  <Text style={styles.chevron}>›</Text>
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
  uploadButton: {
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
  uploadButtonShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  uploadIcon: {
    ...type_.headline,
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
  docCard: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: 8,
    overflow: "hidden",
  },
  docCardShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconArea: {
    position: "relative",
    width: 40,
    height: 40,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGlyph: {
    fontSize: 18,
    color: colors.text2,
  },
  typeBadge: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 4,
    paddingVertical: 1,
    maxWidth: 52,
  },
  typeBadgeText: {
    ...type_.caption2,
    color: colors.text3,
    fontSize: 9,
  },
  docCenter: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  docName: {
    ...type_.footnote,
    color: colors.text1,
    fontWeight: "600",
  },
  docProject: {
    ...type_.caption2,
    color: colors.text3,
  },
  docDate: {
    ...type_.caption2,
    color: colors.text4,
  },
  docRight: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  docSize: {
    ...type_.caption2,
    color: colors.text3,
  },
  chevron: {
    ...type_.headline,
    color: colors.text4,
  },
})
