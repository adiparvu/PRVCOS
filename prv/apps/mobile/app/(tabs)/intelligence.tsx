import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useState, useRef, useEffect } from "react"
import { GlassCard } from "@/components/Glass"
import { colors, radius, spacing, type } from "@/tokens"
import {
  useIntelligence,
  type DayRevenue,
  type IntelligenceAlertItem,
  type IntelligenceData,
  type IntelligenceForecastDriver,
  type IntelligenceWeek,
} from "@/hooks/useIntelligence"

// ─── Segment Control ──────────────────────────────────────────────────────────

const SEGMENTS = ["Insights", "Analytics", "Forecast", "Reports"] as const
type Segment = (typeof SEGMENTS)[number]

// ─── Pulse Dot ────────────────────────────────────────────────────────────────

function PulseDot() {
  const anim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.6, duration: 950, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 950, useNativeDriver: true }),
      ])
    ).start()
    return () => anim.stopAnimation()
  }, [anim])

  return <Animated.View style={[styles.pulseDot, { transform: [{ scale: anim }] }]} />
}

// ─── AI Briefing Card ─────────────────────────────────────────────────────────

function AIBriefingCard({
  briefing,
}: {
  briefing: { summary: string; insights: string[] } | null
}) {
  if (!briefing) return null

  return (
    <GlassCard style={styles.aiCard}>
      <View style={styles.aiCardHeader}>
        <View style={styles.aiIconWrap}>
          <Text style={styles.aiIconText}>✦</Text>
        </View>
        <View>
          <Text style={styles.aiCardTitle}>AI Briefing</Text>
          <Text style={styles.aiCardSub}>Updated just now</Text>
        </View>
      </View>
      <Text style={styles.aiSummary}>{briefing.summary}</Text>
      {briefing.insights.length > 0 && (
        <View style={styles.insightsList}>
          {briefing.insights.map((insight, i) => (
            <View key={i} style={styles.insightRow}>
              <View style={styles.insightDot} />
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </View>
      )}
    </GlassCard>
  )
}

// ─── Alert Row ────────────────────────────────────────────────────────────────

function AlertRow({ item }: { item: IntelligenceAlertItem }) {
  const dotColor = item.severity === "red" ? colors.red : colors.amber
  return (
    <View style={styles.alertRow}>
      <View style={[styles.alertDot, { backgroundColor: dotColor }]} />
      <Text style={styles.alertTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.alertTime}>{item.timeAgo}</Text>
    </View>
  )
}

// ─── Insights Content ─────────────────────────────────────────────────────────

function InsightsContent({ data }: { data: Pick<IntelligenceData, "aiBriefing" | "alerts"> }) {
  return (
    <View style={styles.segContent}>
      {data.aiBriefing ? (
        <AIBriefingCard briefing={data.aiBriefing} />
      ) : (
        <GlassCard style={styles.aiCard}>
          <View style={styles.aiCardHeader}>
            <View style={styles.aiIconWrap}>
              <Text style={styles.aiIconText}>✦</Text>
            </View>
            <View>
              <Text style={styles.aiCardTitle}>AI Briefing</Text>
              <Text style={styles.aiCardSub}>No data yet</Text>
            </View>
          </View>
          <Text style={styles.aiSummary}>
            Start adding orders and invoices to unlock AI-powered insights for your business.
          </Text>
        </GlassCard>
      )}

      {data.alerts.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Active Alerts</Text>
          <GlassCard style={styles.alertsCard}>
            {data.alerts.map((a, i) => (
              <View key={a.id}>
                {i > 0 && <View style={styles.divider} />}
                <AlertRow item={a} />
              </View>
            ))}
          </GlassCard>
        </>
      )}
    </View>
  )
}

// ─── 30-Day Chart ─────────────────────────────────────────────────────────────

function Chart30({ days }: { days: DayRevenue[] }) {
  const maxVal = Math.max(...days.map((d) => d.total), 1)
  const todayStr = new Date().toISOString().slice(0, 10)
  const startLabel = days[0]?.date
    ? new Date(days[0].date + "T00:00:00").toLocaleString("en", { day: "numeric", month: "short" })
    : ""
  const midLabel = days[14]?.date
    ? new Date(days[14].date + "T00:00:00").toLocaleString("en", { day: "numeric", month: "short" })
    : ""

  return (
    <GlassCard style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Revenue Trend</Text>
        <Text style={styles.chartPeriod}>Last 30 days</Text>
      </View>
      <View style={styles.bars30}>
        {days.map((d) => {
          const h = Math.max(3, Math.round((d.total / maxVal) * 72))
          const isToday = d.date === todayStr
          return (
            <View key={d.date} style={styles.bar30Track}>
              <View
                style={[
                  styles.bar30,
                  { height: h },
                  isToday
                    ? styles.bar30Today
                    : d.total > 0
                      ? styles.bar30Active
                      : styles.bar30Empty,
                ]}
              />
            </View>
          )
        })}
      </View>
      <View style={styles.chartAxis}>
        <Text style={styles.axisLabel}>{startLabel}</Text>
        <Text style={styles.axisLabel}>{midLabel}</Text>
        <Text style={styles.axisLabel}>Today</Text>
      </View>
    </GlassCard>
  )
}

// ─── Month Comparison ─────────────────────────────────────────────────────────

function MonthComparison({ months }: { months: { label: string; total: number }[] }) {
  const maxVal = Math.max(...months.map((m) => m.total), 1)
  const isCurrentMax = months[2]?.total === Math.max(...months.map((m) => m.total))

  return (
    <GlassCard style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Month Comparison</Text>
        <Text style={styles.chartPeriod}>Last 3 months</Text>
      </View>
      <View style={styles.monthBars}>
        {months.map((m, i) => {
          const isCurrent = i === months.length - 1
          const barH = Math.max(8, Math.round((m.total / maxVal) * 56))
          return (
            <View key={m.label} style={styles.monthCol}>
              <View style={styles.monthBarWrap}>
                <View
                  style={[
                    styles.monthBar,
                    { height: barH },
                    isCurrent ? styles.monthBarCurrent : styles.monthBarPast,
                  ]}
                />
              </View>
              <Text style={styles.monthLabel}>{m.label}</Text>
              <Text style={[styles.monthVal, isCurrent && styles.monthValCurrent]}>
                {m.total >= 1_000_000
                  ? `${(m.total / 1_000_000).toFixed(1)}M`
                  : m.total >= 1_000
                    ? `${Math.round(m.total / 1_000)}k`
                    : String(Math.round(m.total))}
              </Text>
            </View>
          )
        })}
      </View>
    </GlassCard>
  )
}

// ─── Analytics Content ────────────────────────────────────────────────────────

function AnalyticsContent({ data }: { data: IntelligenceData["analytics"] }) {
  return (
    <View style={styles.segContent}>
      <Chart30 days={data.dailyRevenue30} />
      <MonthComparison months={data.monthlyRevenue} />

      {/* Key metrics */}
      <View style={styles.metricsRow}>
        <GlassCard style={styles.metricTile}>
          <Text
            style={[
              styles.metricVal,
              data.collectionRate < 70
                ? { color: colors.amber }
                : data.collectionRate >= 85
                  ? { color: colors.green }
                  : undefined,
            ]}
          >
            {data.collectionRate}%
          </Text>
          <Text style={styles.metricLbl}>Collection Rate</Text>
        </GlassCard>
        <GlassCard style={styles.metricTile}>
          <Text style={styles.metricVal}>{data.activeClients}</Text>
          <Text style={styles.metricLbl}>Active Clients</Text>
        </GlassCard>
        <GlassCard style={styles.metricTile}>
          <Text style={styles.metricVal}>{data.avgDealSizeFormatted}</Text>
          <Text style={styles.metricLbl}>Avg. Deal Size</Text>
        </GlassCard>
      </View>

      {/* Project completion */}
      {data.projectsTotal > 0 && (
        <GlassCard style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.chartTitle}>Active Projects</Text>
            <Text style={[styles.chartPeriod, { color: colors.green }]}>{data.projectsTotal}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, (data.projectsTotal / Math.max(data.projectsTotal, 10)) * 100)}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressNote}>
            {data.projectsTotal} project{data.projectsTotal !== 1 ? "s" : ""} currently in progress
          </Text>
        </GlassCard>
      )}
    </View>
  )
}

// ─── Forecast Chart ───────────────────────────────────────────────────────────

function ForecastChart({ weeks }: { weeks: IntelligenceWeek[] }) {
  const maxVal = Math.max(...weeks.map((w) => w.total), 1)

  return (
    <GlassCard style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Revenue Forecast</Text>
        <Text style={styles.chartPeriod}>8-week view</Text>
      </View>
      <View style={styles.forecastBars}>
        {weeks.map((w) => {
          const h = Math.max(4, Math.round((w.total / maxVal) * 88))
          return (
            <View key={w.weekLabel} style={styles.fcBarCol}>
              <View style={styles.fcBarTrack}>
                <View
                  style={[
                    styles.fcBar,
                    { height: h },
                    w.isProjected ? styles.fcBarProjected : styles.fcBarActual,
                  ]}
                />
              </View>
              <Text style={[styles.fcLabel, !w.isProjected && styles.fcLabelActual]}>
                {w.weekLabel}
              </Text>
            </View>
          )
        })}
      </View>
      <View style={styles.fcLegend}>
        <View style={styles.fcLegendItem}>
          <View style={[styles.fcLegendDot, { backgroundColor: colors.text1 }]} />
          <Text style={styles.fcLegendText}>Actual</Text>
        </View>
        <View style={styles.fcLegendItem}>
          <View style={[styles.fcLegendDot, { backgroundColor: "rgba(255,255,255,0.25)" }]} />
          <Text style={styles.fcLegendText}>Projected</Text>
        </View>
      </View>
    </GlassCard>
  )
}

// ─── Forecast Content ─────────────────────────────────────────────────────────

function ForecastContent({ data }: { data: IntelligenceData["forecast"] }) {
  return (
    <View style={styles.segContent}>
      {/* KPIs */}
      <View style={styles.metricsRow}>
        <GlassCard style={[styles.metricTile, { flex: 1.4 }]}>
          <Text style={styles.metricVal}>{data.monthEndFormatted}</Text>
          <Text style={styles.metricLbl}>Month-End Estimate</Text>
        </GlassCard>
        <GlassCard style={styles.metricTile}>
          <Text style={[styles.metricVal, { color: colors.green }]}>{data.confidence}%</Text>
          <Text style={styles.metricLbl}>Confidence</Text>
        </GlassCard>
      </View>

      <ForecastChart weeks={data.weeks} />

      {/* Drivers */}
      {data.drivers.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Forecast Drivers</Text>
          <GlassCard style={styles.alertsCard}>
            {data.drivers.map((d, i) => (
              <View key={d.label}>
                {i > 0 && <View style={styles.divider} />}
                <DriverRow driver={d} />
              </View>
            ))}
          </GlassCard>
        </>
      )}

      <Text style={styles.moduleNote}>
        Forecast is based on historical revenue patterns, active pipeline, and weekly growth trends.
        Full AI forecasting with scenario modelling is coming in a future release.
      </Text>
    </View>
  )
}

function DriverRow({ driver }: { driver: IntelligenceForecastDriver }) {
  return (
    <View style={styles.driverRow}>
      <View
        style={[styles.driverDot, { backgroundColor: driver.positive ? colors.green : colors.red }]}
      />
      <Text style={styles.driverLabel} numberOfLines={1}>
        {driver.label}
      </Text>
      <Text style={[styles.driverAmount, { color: driver.positive ? colors.green : colors.red }]}>
        {driver.amountFormatted}
      </Text>
    </View>
  )
}

// ─── Reports Content ──────────────────────────────────────────────────────────

const REPORT_TILES = [
  {
    icon: "≡",
    label: "Revenue",
    desc: "Monthly breakdown",
    ready: true,
    route: "/(auth)/report-revenue",
  },
  {
    icon: "⟁",
    label: "Projects",
    desc: "Pipeline & completion",
    ready: true,
    route: "/(auth)/report-projects",
  },
  {
    icon: "◎",
    label: "Workforce",
    desc: "Activity & utilization",
    ready: true,
    route: "/(auth)/report-workforce",
  },
  {
    icon: "◩",
    label: "Invoices",
    desc: "Collection & aging",
    ready: true,
    route: "/(auth)/report-invoices",
  },
  {
    icon: "◫",
    label: "P&L",
    desc: "Profit & loss statement",
    ready: true,
    route: "/(auth)/report-pl",
  },
  {
    icon: "✦",
    label: "AI Report",
    desc: "Executive AI summary",
    ready: true,
    route: "/(auth)/report-ai",
  },
] as const

function ReportsContent() {
  const router = useRouter()

  return (
    <View style={styles.segContent}>
      <View style={styles.reportGrid}>
        {REPORT_TILES.map((t) => (
          <Pressable
            key={t.label}
            style={({ pressed }) => [{ opacity: t.ready && pressed ? 0.7 : 1 }]}
            onPress={() => t.route && router.push(t.route as never)}
            disabled={!t.ready}
          >
            <GlassCard style={styles.reportTile}>
              <Text style={styles.tileIcon}>{t.icon}</Text>
              <Text style={styles.tileLabel}>{t.label}</Text>
              <Text style={styles.tileSub}>{t.desc}</Text>
              <View
                style={[styles.tileBadge, t.ready ? styles.tileBadgeReady : styles.tileBadgeSoon]}
              >
                <Text
                  style={[
                    styles.tileBadgeText,
                    t.ready ? styles.tileBadgeTextReady : styles.tileBadgeTextSoon,
                  ]}
                >
                  {t.ready ? "View" : "Soon"}
                </Text>
              </View>
            </GlassCard>
          </Pressable>
        ))}
      </View>
      <Text style={styles.moduleNote}>
        Export reports as PDF or CSV. Schedule automated delivery to your inbox. Full BI suite with
        custom reports is coming in a future release.
      </Text>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function IntelligenceScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [seg, setSeg] = useState<Segment>("Insights")
  const { data, isLoading, isError, refetch, isFetching } = useIntelligence()

  const headerH = insets.top + 52
  const segH = 48

  return (
    <View style={styles.root}>
      {/* Fixed header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Intelligence</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/intelligence-chat" as never)}
              activeOpacity={0.7}
              style={styles.chatLink}
            >
              <Text style={styles.chatLinkText}>AI Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/intelligence-cost" as never)}
              activeOpacity={0.7}
              style={styles.usageLink}
            >
              <Text style={styles.usageLinkText}>AI Usage</Text>
            </TouchableOpacity>
            <View style={styles.aiBadge}>
              <PulseDot />
              <Text style={styles.aiBadgeText}>AI Powered</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Fixed segment control */}
      <View style={[styles.segBar, { top: headerH }]}>
        {SEGMENTS.map((s) => (
          <Pressable
            key={s}
            onPress={() => setSeg(s)}
            style={[styles.segBtn, seg === s && styles.segBtnActive]}
          >
            <Text style={[styles.segLabel, seg === s && styles.segLabelActive]}>{s}</Text>
          </Pressable>
        ))}
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerH + segH + 12, paddingBottom: insets.bottom + 104 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => refetch()}
            tintColor={colors.text3}
            progressViewOffset={headerH + segH}
          />
        }
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.text3} />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>Failed to load intelligence data</Text>
            <Pressable onPress={() => refetch()} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : data ? (
          seg === "Insights" ? (
            <InsightsContent data={data} />
          ) : seg === "Analytics" ? (
            <AnalyticsContent data={data.analytics} />
          ) : seg === "Forecast" ? (
            <ForecastContent data={data.forecast} />
          ) : (
            <ReportsContent />
          )
        ) : null}
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: spacing.base,
    paddingBottom: 10,
    backgroundColor: colors.bg,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { ...type.largeTitle, color: colors.text1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  chatLink: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  chatLinkText: { ...type.caption1, color: colors.text2, fontWeight: "500" },
  usageLink: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  usageLinkText: { ...type.caption1, color: colors.text3, textDecorationLine: "underline" },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.7)" },
  aiBadgeText: { ...type.caption1, color: colors.text2, fontWeight: "500" },

  // Segment bar
  segBar: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    paddingHorizontal: spacing.base,
    paddingVertical: 8,
    backgroundColor: colors.bg,
    gap: 6,
  },
  segBtn: { flex: 1, paddingVertical: 7, borderRadius: radius.md, alignItems: "center" },
  segBtnActive: { backgroundColor: "rgba(255,255,255,0.12)" },
  segLabel: { ...type.footnote, color: colors.text3 },
  segLabelActive: { color: colors.text1 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.base },
  segContent: { gap: 14 },

  // AI Briefing
  aiCard: {
    padding: 16,
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.13)",
  },
  aiCardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  aiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  aiIconText: { fontSize: 15, color: colors.text1 },
  aiCardTitle: { ...type.subhead, color: colors.text1, fontWeight: "600" },
  aiCardSub: { ...type.caption1, color: colors.text3 },
  aiSummary: { ...type.subhead, color: colors.text2, lineHeight: 20 },
  insightsList: { gap: 6 },
  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: 10,
  },
  insightDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
    marginTop: 5,
    flexShrink: 0,
  },
  insightText: { ...type.footnote, color: colors.text2, lineHeight: 17, flex: 1 },

  // Alerts
  sectionLabel: { ...type.subhead, color: colors.text2, marginBottom: -4 },
  alertsCard: { padding: 0 },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  alertDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  alertTitle: { ...type.subhead, color: colors.text1, flex: 1 },
  alertTime: { ...type.caption1, color: colors.text3 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 14 },

  // Charts common
  chartCard: { padding: 14, gap: 10 },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  chartTitle: { ...type.subhead, color: colors.text1, fontWeight: "600" },
  chartPeriod: { ...type.caption1, color: colors.text3 },
  chartAxis: { flexDirection: "row", justifyContent: "space-between" },
  axisLabel: { ...type.caption2, color: colors.text3 },

  // 30-day chart
  bars30: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 80 },
  bar30Track: { flex: 1, justifyContent: "flex-end", height: "100%" },
  bar30: { width: "100%", borderRadius: 2 },
  bar30Empty: { backgroundColor: "rgba(255,255,255,0.06)" },
  bar30Active: { backgroundColor: "rgba(255,255,255,0.22)" },
  bar30Today: { backgroundColor: colors.text1 },

  // Month comparison
  monthBars: { flexDirection: "row", gap: 8, height: 72, alignItems: "flex-end" },
  monthCol: { flex: 1, alignItems: "center", gap: 5 },
  monthBarWrap: { flex: 1, width: "100%", justifyContent: "flex-end" },
  monthBar: { width: "100%", borderRadius: 4 },
  monthBarPast: { backgroundColor: "rgba(255,255,255,0.18)" },
  monthBarCurrent: { backgroundColor: "rgba(255,255,255,0.80)" },
  monthLabel: { ...type.caption2, color: colors.text3 },
  monthVal: { ...type.caption1, color: colors.text2, fontWeight: "600" },
  monthValCurrent: { color: colors.text1 },

  // Metrics row
  metricsRow: { flexDirection: "row", gap: 8 },
  metricTile: { flex: 1, padding: 12, gap: 3 },
  metricVal: { ...type.title3, color: colors.text1 },
  metricLbl: { ...type.caption1, color: colors.text3, lineHeight: 14 },

  // Progress bar
  progressCard: { padding: 14, gap: 10 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  progressTrack: {
    height: 7,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 100,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.70)",
    borderRadius: 100,
  },
  progressNote: { ...type.caption1, color: colors.text3 },

  // Forecast bars
  forecastBars: { flexDirection: "row", alignItems: "flex-end", gap: 5, height: 96 },
  fcBarCol: { flex: 1, alignItems: "center", gap: 5 },
  fcBarTrack: { flex: 1, justifyContent: "flex-end", width: "100%" },
  fcBar: { width: "100%", borderRadius: 3 },
  fcBarActual: { backgroundColor: "rgba(255,255,255,0.78)" },
  fcBarProjected: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  fcLabel: { ...type.caption2, color: colors.text3 },
  fcLabelActual: { color: colors.text2 },
  fcLegend: { flexDirection: "row", gap: 14 },
  fcLegendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  fcLegendDot: { width: 8, height: 8, borderRadius: 4 },
  fcLegendText: { ...type.caption2, color: colors.text3 },

  // Driver row
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  driverDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  driverLabel: { ...type.subhead, color: colors.text1, flex: 1 },
  driverAmount: { ...type.subhead, fontWeight: "600" },

  // Reports
  reportGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reportTile: { width: "47.5%", padding: 14, gap: 5 },
  tileIcon: { fontSize: 20, color: colors.text2, marginBottom: 2 },
  tileLabel: { ...type.headline, color: colors.text1 },
  tileSub: { ...type.caption1, color: colors.text3, lineHeight: 14 },
  tileBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginTop: 4,
  },
  tileBadgeReady: { backgroundColor: "rgba(52,199,89,0.14)" },
  tileBadgeSoon: { backgroundColor: "rgba(255,255,255,0.07)" },
  tileBadgeText: { ...type.caption2, fontWeight: "600" },
  tileBadgeTextReady: { color: colors.green },
  tileBadgeTextSoon: { color: colors.text3 },

  // Module note
  moduleNote: {
    ...type.footnote,
    color: colors.text3,
    lineHeight: 18,
    paddingHorizontal: 4,
  },

  // States
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  errorText: { ...type.body, color: colors.text3 },
  retryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  retryText: { ...type.subhead, color: colors.text2 },
})
