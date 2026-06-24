import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { useAuthStore } from "@/store/auth"
import { GlassCard } from "@/components/Glass"
import { SkeletonCard } from "@/components/Skeleton"
import { colors, radius, spacing, type as t } from "@/tokens"

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentType = "general" | "finance" | "hr" | "project" | "renovation" | "report_builder"

interface AgentStats {
  inputTokens: number
  outputTokens: number
}

interface CostData {
  year: number
  month: number
  totalInputTokens: number
  totalOutputTokens: number
  estimatedCostUsd: number
  messageCount: number
  byAgent: Record<AgentType, AgentStats>
  dailyUsage: { date: string; tokens: number }[]
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const AGENT_LABELS: Record<AgentType, string> = {
  general: "General",
  finance: "Finance",
  hr: "HR",
  project: "Projects",
  renovation: "Renovation",
  report_builder: "Report Builder",
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useAICost() {
  const { session } = useAuthStore()
  return useQuery<CostData>({
    queryKey: ["intelligence-cost"],
    queryFn: async () => {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/mobile/intelligence/cost`, {
        headers: { Authorization: `Bearer ${session?.token}` },
      })
      return res.json()
    },
    staleTime: 120_000,
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function fmtCost(usd: number): string {
  return `$${usd.toFixed(4)}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <GlassCard style={s.kpiCard}>
      <View style={s.kpiShine} pointerEvents="none" />
      <Text style={s.kpiValue}>{value}</Text>
      {sub ? <Text style={s.kpiSub}>{sub}</Text> : null}
      <Text style={s.kpiLabel}>{label}</Text>
    </GlassCard>
  )
}

function AgentRow({ label, stats }: { label: string; stats: AgentStats }) {
  const total = stats.inputTokens + stats.outputTokens
  if (total === 0) return null
  return (
    <View style={s.agentRow}>
      <Text style={s.agentLabel}>{label}</Text>
      <Text style={s.agentTokens}>{fmtTokens(total)} tokens</Text>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function IntelligenceCostScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { data, isLoading } = useAICost()

  const monthLabel = data ? `${MONTH_NAMES[(data.month - 1) % 12]} ${data.year}` : ""
  const totalTokens = data ? data.totalInputTokens + data.totalOutputTokens : 0

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>AI Usage</Text>
        <View style={s.headerRight} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Period label */}
        <Text style={s.period}>{monthLabel || " "}</Text>

        {isLoading ? (
          <View style={s.skeletonWrap}>
            <View style={s.kpiGrid}>
              <SkeletonCard height={90} style={{ flex: 1 }} />
              <SkeletonCard height={90} style={{ flex: 1 }} />
            </View>
            <View style={s.kpiGrid}>
              <SkeletonCard height={90} style={{ flex: 1 }} />
              <SkeletonCard height={90} style={{ flex: 1 }} />
            </View>
            <SkeletonCard height={160} />
          </View>
        ) : (
          <>
            {/* KPI grid */}
            <View style={s.kpiGrid}>
              <KpiCard label="Messages" value={String(data?.messageCount ?? 0)} />
              <KpiCard
                label="Estimated Cost"
                value={fmtCost(data?.estimatedCostUsd ?? 0)}
                sub="USD this month"
              />
            </View>
            <View style={s.kpiGrid}>
              <KpiCard label="Input Tokens" value={fmtTokens(data?.totalInputTokens ?? 0)} />
              <KpiCard label="Output Tokens" value={fmtTokens(data?.totalOutputTokens ?? 0)} />
            </View>

            {/* By agent */}
            <Text style={s.sectionLabel}>By Agent</Text>
            <GlassCard style={s.agentCard}>
              <View style={s.cardShine} pointerEvents="none" />
              {data?.byAgent
                ? (Object.entries(data.byAgent) as [AgentType, AgentStats][]).map(
                    ([key, stats]) => (
                      <AgentRow key={key} label={AGENT_LABELS[key] ?? key} stats={stats} />
                    )
                  )
                : null}
              {totalTokens === 0 ? <Text style={s.emptyText}>No usage this month</Text> : null}
            </GlassCard>

            {/* Daily breakdown */}
            {data?.dailyUsage && data.dailyUsage.length > 0 ? (
              <>
                <Text style={s.sectionLabel}>Daily Activity</Text>
                <GlassCard style={s.dailyCard}>
                  <View style={s.cardShine} pointerEvents="none" />
                  {data.dailyUsage.map((d) => {
                    const pct = totalTokens > 0 ? d.tokens / totalTokens : 0
                    const day = new Date(d.date).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    })
                    return (
                      <View key={d.date} style={s.dailyRow}>
                        <Text style={s.dailyDate}>{day}</Text>
                        <View style={s.barTrack}>
                          <View style={[s.barFill, { width: `${Math.max(pct * 100, 2)}%` }]} />
                        </View>
                        <Text style={s.dailyTokens}>{fmtTokens(d.tokens)}</Text>
                      </View>
                    )
                  })}
                </GlassCard>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: { paddingVertical: 6, paddingRight: 8, minWidth: 60 },
  backText: { ...t.subhead, color: colors.text2 },
  headerTitle: { flex: 1, ...t.headline, color: colors.text1, textAlign: "center" },
  headerRight: { minWidth: 60 },

  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },

  period: {
    ...t.footnote,
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.06,
    marginBottom: spacing.xs,
  },

  skeletonWrap: { gap: spacing.sm },

  kpiGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  kpiCard: {
    flex: 1,
    padding: 14,
    overflow: "hidden",
    position: "relative",
    gap: 3,
  },
  kpiShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  kpiValue: { ...t.title2, color: colors.text1 },
  kpiSub: { ...t.caption2, color: colors.text4 },
  kpiLabel: {
    ...t.caption2,
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.04,
    marginTop: 2,
  },

  sectionLabel: {
    ...t.footnote,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.06,
    marginTop: spacing.xs,
  },

  agentCard: {
    padding: spacing.md,
    overflow: "hidden",
    position: "relative",
    gap: spacing.sm,
  },
  cardShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  agentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  agentLabel: { ...t.footnote, color: colors.text1 },
  agentTokens: { ...t.footnote, color: colors.text3 },
  emptyText: { ...t.footnote, color: colors.text4, textAlign: "center", paddingVertical: 8 },

  dailyCard: {
    padding: spacing.md,
    overflow: "hidden",
    position: "relative",
    gap: 10,
  },
  dailyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dailyDate: { ...t.caption2, color: colors.text3, width: 52 },
  barTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.glass2,
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.40)",
    borderRadius: 2,
  },
  dailyTokens: { ...t.caption2, color: colors.text3, width: 40, textAlign: "right" },
})
