import { useState } from "react"
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { GlassCard } from "@/components/Glass"
import { SkeletonCard, SkeletonRow } from "@/components/Skeleton"
import { useAuthStore } from "@/store/auth"
import { colors, radius, spacing, type as t } from "@/tokens"

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = "critical" | "high" | "medium" | "low"
type IncidentStatus = "open" | "investigating" | "resolved" | "closed"
type InspectionStatus = "scheduled" | "in_progress" | "completed" | "overdue"

interface SafetyKpi {
  openIncidents: number
  critical: number
  overdueInspections: number
  nextInspection: string | null
}

interface Incident {
  id: string
  type: string
  title: string
  severity: Severity
  status: IncidentStatus
  location: string
  date: string
}

interface Inspection {
  id: string
  title: string
  scheduledDate: string
  status: InspectionStatus
  score: number | null
  maxScore: number | null
}

interface SafetyData {
  kpi: SafetyKpi
  incidents: Incident[]
  inspections: Inspection[]
}

// ─── Data hook ────────────────────────────────────────────────────────────────

function useSafety() {
  const { session } = useAuthStore()
  return useQuery<SafetyData>({
    queryKey: ["safety-center"],
    queryFn: async () => {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/mobile/safety`, {
        headers: { Authorization: `Bearer ${session?.token}` },
      })
      return res.json()
    },
    staleTime: 60_000,
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_GLYPH: Record<string, string> = {
  fire: "◉",
  injury: "◎",
  equipment: "⊞",
  electrical: "◈",
  chemical: "▪",
  slip: "◯",
  vehicle: "⊡",
  default: "◈",
}

function severityColor(s: Severity): string {
  switch (s) {
    case "critical":
      return colors.red
    case "high":
      return colors.amber
    case "medium":
      return colors.text2
    case "low":
      return colors.text3
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  return <Text style={s.sectionLabel}>{title}</Text>
}

function KpiGrid({ kpi }: { kpi: SafetyKpi }) {
  return (
    <View style={s.kpiGrid}>
      <GlassCard style={s.kpiCard}>
        <View style={s.kpiShine} pointerEvents="none" />
        <Text style={s.kpiValue}>{kpi.openIncidents}</Text>
        <Text style={s.kpiLabel}>Open Incidents</Text>
      </GlassCard>
      <GlassCard style={s.kpiCard}>
        <View style={s.kpiShine} pointerEvents="none" />
        <Text style={[s.kpiValue, { color: colors.red }]}>{kpi.critical}</Text>
        <Text style={s.kpiLabel}>Critical</Text>
      </GlassCard>
      <GlassCard style={s.kpiCard}>
        <View style={s.kpiShine} pointerEvents="none" />
        <Text style={[s.kpiValue, kpi.overdueInspections > 0 ? { color: colors.amber } : null]}>
          {kpi.overdueInspections}
        </Text>
        <Text style={s.kpiLabel}>Overdue Inspections</Text>
      </GlassCard>
      <GlassCard style={s.kpiCard}>
        <View style={s.kpiShine} pointerEvents="none" />
        <Text style={s.kpiValue}>{kpi.nextInspection ? formatDate(kpi.nextInspection) : "—"}</Text>
        <Text style={s.kpiLabel}>Next Inspection</Text>
      </GlassCard>
    </View>
  )
}

function StatusBadge({
  label,
  status,
}: {
  label: string
  status: IncidentStatus | InspectionStatus
}) {
  const isOpen = status === "open"
  const isResolved = status === "resolved" || status === "completed"
  const isOverdue = status === "overdue"

  let bg: string = colors.glass2
  let fg: string = colors.text2

  if (isOpen) {
    bg = "rgba(255,159,10,0.14)"
    fg = colors.amber
  }
  if (isResolved) {
    bg = "rgba(48,209,88,0.12)"
    fg = colors.green
  }
  if (isOverdue) {
    bg = "rgba(255,69,58,0.12)"
    fg = colors.red
  }

  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color: fg }]}>{label}</Text>
    </View>
  )
}

function IncidentCard({ item }: { item: Incident }) {
  const glyph = TYPE_GLYPH[item.type] ?? TYPE_GLYPH.default!
  const svColor = severityColor(item.severity)
  const svLabel = item.severity.charAt(0).toUpperCase() + item.severity.slice(1)
  const stLabel = item.status.charAt(0).toUpperCase() + item.status.slice(1)

  return (
    <GlassCard style={s.incidentCard}>
      <View style={s.cardShine} pointerEvents="none" />
      <View style={s.incidentRow}>
        {/* Icon */}
        <View style={s.typeCircle}>
          <Text style={s.typeGlyph}>{glyph}</Text>
        </View>

        {/* Content */}
        <View style={s.incidentContent}>
          <View style={s.incidentTitleRow}>
            <Text style={s.incidentTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={[s.severityBadge]}>
              <Text style={[s.severityText, { color: svColor }]}>{svLabel}</Text>
            </View>
          </View>
          <View style={s.incidentMetaRow}>
            <Text style={s.incidentLocation} numberOfLines={1}>
              {item.location}
            </Text>
            <Text style={s.incidentDate}>{formatDate(item.date)}</Text>
          </View>
          <StatusBadge label={stLabel} status={item.status} />
        </View>
      </View>
    </GlassCard>
  )
}

function InspectionCard({ item }: { item: Inspection }) {
  const stLabel = item.status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <GlassCard style={s.inspectionCard}>
      <View style={s.cardShine} pointerEvents="none" />
      <View style={s.inspectionRow}>
        <View style={s.inspectionContent}>
          <Text style={s.inspectionTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={s.inspectionDate}>{formatDate(item.scheduledDate)}</Text>
        </View>
        <View style={s.inspectionRight}>
          {item.score !== null && item.maxScore !== null ? (
            <Text style={s.inspectionScore}>
              {item.score}/{item.maxScore} pts
            </Text>
          ) : null}
          <StatusBadge label={stLabel} status={item.status} />
        </View>
      </View>
    </GlassCard>
  )
}

function SkeletonState() {
  return (
    <View style={s.skeletonWrap}>
      <View style={s.kpiGrid}>
        <SkeletonCard height={90} style={{ flex: 1 }} />
        <SkeletonCard height={90} style={{ flex: 1 }} />
        <SkeletonCard height={90} style={{ flex: 1 }} />
        <SkeletonCard height={90} style={{ flex: 1 }} />
      </View>
      <SkeletonCard height={76} />
      <SkeletonCard height={76} />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SafetyScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { data, isLoading, refetch, isRefetching } = useSafety()

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Safety Center</Text>
        <TouchableOpacity style={s.reportBtn} activeOpacity={0.75}>
          <Text style={s.reportBtnText}>Report</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <SkeletonState />
        </ScrollView>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor="rgba(255,255,255,0.4)"
            />
          }
        >
          {/* KPI Grid */}
          {data?.kpi ? <KpiGrid kpi={data.kpi} /> : null}

          {/* Recent Incidents */}
          <SectionLabel title="Recent Incidents" />
          {data?.incidents?.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyText}>No incidents reported</Text>
            </View>
          ) : (
            data?.incidents?.map((item) => <IncidentCard key={item.id} item={item} />)
          )}

          {/* Upcoming Inspections */}
          <SectionLabel title="Upcoming Inspections" />
          {data?.inspections?.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyText}>No upcoming inspections</Text>
            </View>
          ) : (
            data?.inspections?.map((item) => <InspectionCard key={item.id} item={item} />)
          )}
        </ScrollView>
      )}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  backBtn: {
    paddingVertical: 6,
    paddingRight: 8,
  },
  backText: {
    ...t.subhead,
    color: colors.text2,
  },
  headerTitle: {
    flex: 1,
    ...t.headline,
    color: colors.text1,
    textAlign: "center",
  },
  reportBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportBtnText: {
    ...t.footnote,
    fontWeight: "600",
    color: colors.text1,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },

  // Section label
  sectionLabel: {
    ...t.footnote,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.06,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  kpiCard: {
    flex: 1,
    minWidth: "45%",
    padding: 14,
    overflow: "hidden",
    position: "relative",
  },
  kpiShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  kpiValue: {
    ...t.title2,
    color: colors.text1,
    marginBottom: 4,
  },
  kpiLabel: {
    ...t.caption2,
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.04,
  },

  // Incident card
  incidentCard: {
    padding: spacing.md,
    overflow: "hidden",
    position: "relative",
    marginBottom: spacing.xs,
  },
  cardShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  incidentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  typeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  typeGlyph: {
    fontSize: 14,
    color: colors.text2,
  },
  incidentContent: {
    flex: 1,
    gap: 5,
  },
  incidentTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  incidentTitle: {
    flex: 1,
    ...t.footnote,
    fontWeight: "600",
    color: colors.text1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  severityText: {
    ...t.caption2,
    fontWeight: "600",
  },
  incidentMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  incidentLocation: {
    flex: 1,
    ...t.caption2,
    color: colors.text3,
  },
  incidentDate: {
    ...t.caption2,
    color: colors.text4,
  },

  // Status badge
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeText: {
    ...t.caption2,
    fontWeight: "600",
  },

  // Inspection card
  inspectionCard: {
    padding: spacing.md,
    overflow: "hidden",
    position: "relative",
    marginBottom: spacing.xs,
  },
  inspectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  inspectionContent: {
    flex: 1,
    gap: 4,
  },
  inspectionTitle: {
    ...t.footnote,
    fontWeight: "600",
    color: colors.text1,
  },
  inspectionDate: {
    ...t.caption2,
    color: colors.text3,
  },
  inspectionRight: {
    alignItems: "flex-end",
    gap: 5,
    flexShrink: 0,
  },
  inspectionScore: {
    ...t.caption2,
    color: colors.text3,
  },

  // Empty
  emptyState: {
    padding: spacing.xl,
    alignItems: "center",
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
  },
  emptyText: {
    ...t.subhead,
    color: colors.text3,
  },

  // Skeleton
  skeletonWrap: {
    gap: spacing.sm,
  },
})
