import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useIntelligence } from "@/hooks/useIntelligence"
import { colors, radius, spacing } from "@/tokens"

const SEVERITY_CONFIG = {
  red: {
    label: "Critical",
    bg: "rgba(255,69,58,0.12)",
    border: "rgba(255,69,58,0.28)",
    fg: colors.red,
  },
  amber: {
    label: "Warning",
    bg: "rgba(255,159,10,0.10)",
    border: "rgba(255,159,10,0.25)",
    fg: colors.amber,
  },
}

export default function ReportAIScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { data, isLoading, isError, refetch } = useIntelligence()

  if (isLoading) {
    return (
      <View style={[s.root, s.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.text3} />
      </View>
    )
  }

  if (isError || !data) {
    return (
      <View style={[s.root, s.center, { paddingTop: insets.top }]}>
        <Text style={s.errText}>Could not load AI report.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => void refetch()} activeOpacity={0.8}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const { aiBriefing, alerts, analytics, forecast } = data
  const criticalAlerts = alerts.filter((a) => a.severity === "red")
  const warningAlerts = alerts.filter((a) => a.severity === "amber")

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.navbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>AI Executive Report</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Summary hero */}
        <View style={s.hero}>
          <View style={s.heroShine} pointerEvents="none" />
          <View style={s.heroBadge}>
            <Text style={s.heroBadgeIcon}>✦</Text>
            <Text style={s.heroBadgeText}>AI Generated</Text>
          </View>
          <Text style={s.heroSummary}>
            {aiBriefing?.summary ?? "No AI briefing available for this period."}
          </Text>
        </View>

        {/* Key Insights */}
        {aiBriefing && aiBriefing.insights.length > 0 ? (
          <>
            <Text style={s.sectionLabel}>Key Insights</Text>
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              {aiBriefing.insights.map((insight, i) => (
                <View
                  key={i}
                  style={[
                    s.insightRow,
                    i === aiBriefing.insights.length - 1 ? s.insightRowLast : null,
                  ]}
                >
                  <View style={s.insightDot} />
                  <Text style={s.insightText}>{insight}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* Alerts Summary */}
        {alerts.length > 0 ? (
          <>
            <Text style={s.sectionLabel}>Active Alerts</Text>
            <View style={s.alertsRow}>
              {criticalAlerts.length > 0 ? (
                <View
                  style={[
                    s.alertBadge,
                    {
                      backgroundColor: SEVERITY_CONFIG.red.bg,
                      borderColor: SEVERITY_CONFIG.red.border,
                    },
                  ]}
                >
                  <Text style={[s.alertBadgeCount, { color: SEVERITY_CONFIG.red.fg }]}>
                    {criticalAlerts.length}
                  </Text>
                  <Text style={[s.alertBadgeLabel, { color: SEVERITY_CONFIG.red.fg }]}>
                    Critical
                  </Text>
                </View>
              ) : null}
              {warningAlerts.length > 0 ? (
                <View
                  style={[
                    s.alertBadge,
                    {
                      backgroundColor: SEVERITY_CONFIG.amber.bg,
                      borderColor: SEVERITY_CONFIG.amber.border,
                    },
                  ]}
                >
                  <Text style={[s.alertBadgeCount, { color: SEVERITY_CONFIG.amber.fg }]}>
                    {warningAlerts.length}
                  </Text>
                  <Text style={[s.alertBadgeLabel, { color: SEVERITY_CONFIG.amber.fg }]}>
                    Warning
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              {alerts.map((alert, i) => {
                const sc = SEVERITY_CONFIG[alert.severity]
                return (
                  <View
                    key={alert.id}
                    style={[s.alertRow, i === alerts.length - 1 ? s.alertRowLast : null]}
                  >
                    <View style={[s.alertDot, { backgroundColor: sc.fg }]} />
                    <View style={s.alertContent}>
                      <Text style={s.alertTitle}>{alert.title}</Text>
                      <Text style={[s.alertTime, { color: sc.fg }]}>{alert.timeAgo}</Text>
                    </View>
                  </View>
                )
              })}
            </View>
          </>
        ) : (
          <>
            <Text style={s.sectionLabel}>Active Alerts</Text>
            <View style={[s.card, s.noAlertsCard]}>
              <View style={s.cardShine} pointerEvents="none" />
              <Text style={s.noAlertsText}>No active alerts</Text>
            </View>
          </>
        )}

        {/* Business Metrics */}
        <Text style={s.sectionLabel}>Business Metrics</Text>
        <View style={s.metricsGrid}>
          <View style={s.metricCard}>
            <View style={s.cardShine} pointerEvents="none" />
            <Text style={s.metricValue}>{analytics.activeClients}</Text>
            <Text style={s.metricLabel}>Active Clients</Text>
          </View>
          <View style={s.metricCard}>
            <View style={s.cardShine} pointerEvents="none" />
            <Text style={s.metricValue}>{analytics.projectsTotal}</Text>
            <Text style={s.metricLabel}>Projects</Text>
          </View>
          <View style={s.metricCard}>
            <View style={s.cardShine} pointerEvents="none" />
            <Text style={s.metricValue}>{analytics.collectionRate}%</Text>
            <Text style={s.metricLabel}>Collection Rate</Text>
          </View>
          <View style={s.metricCard}>
            <View style={s.cardShine} pointerEvents="none" />
            <Text style={s.metricValue}>{analytics.avgDealSizeFormatted}</Text>
            <Text style={s.metricLabel}>Avg Deal</Text>
          </View>
        </View>

        {/* Forecast Summary */}
        <Text style={s.sectionLabel}>Revenue Forecast</Text>
        <View style={s.card}>
          <View style={s.cardShine} pointerEvents="none" />
          <View style={s.forecastRow}>
            <View style={s.forecastLeft}>
              <Text style={s.forecastLabel}>Month-End Projection</Text>
              <Text style={s.forecastValue}>{forecast.monthEndFormatted}</Text>
            </View>
            <View
              style={[
                s.confidencePill,
                {
                  borderColor:
                    forecast.confidence >= 75
                      ? colors.green + "44"
                      : forecast.confidence >= 50
                        ? colors.amber + "44"
                        : colors.red + "44",
                  backgroundColor:
                    forecast.confidence >= 75
                      ? colors.green + "15"
                      : forecast.confidence >= 50
                        ? colors.amber + "12"
                        : colors.red + "12",
                },
              ]}
            >
              <Text
                style={[
                  s.confidenceText,
                  {
                    color:
                      forecast.confidence >= 75
                        ? colors.green
                        : forecast.confidence >= 50
                          ? colors.amber
                          : colors.red,
                  },
                ]}
              >
                {forecast.confidence}% confidence
              </Text>
            </View>
          </View>
          {forecast.drivers.length > 0 ? (
            <View style={s.driversWrap}>
              <View style={s.driversDivider} />
              {forecast.drivers.map((d, i) => (
                <View key={i} style={s.driverRow}>
                  <View
                    style={[
                      s.driverIndicator,
                      { backgroundColor: d.positive ? colors.green : colors.red },
                    ]}
                  />
                  <Text style={s.driverLabel}>{d.label}</Text>
                  <Text style={[s.driverAmount, { color: d.positive ? colors.green : colors.red }]}>
                    {d.positive ? "+" : ""}
                    {d.amountFormatted}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <Text style={s.footerNote}>
          Generated by PRV AI · Data reflects current company snapshot
        </Text>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },

  navbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 22, color: colors.text1, lineHeight: 26, marginTop: -1 },
  navTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    color: colors.text1,
    letterSpacing: -0.2,
    paddingHorizontal: spacing.sm,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },

  hero: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: spacing.base,
    overflow: "hidden",
    gap: spacing.md,
  },
  heroShine: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.20)",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroBadgeIcon: { fontSize: 11, color: colors.text1 },
  heroBadgeText: { fontSize: 11, fontWeight: "600", color: colors.text2, letterSpacing: 0.2 },
  heroSummary: {
    fontSize: 15,
    color: colors.text1,
    lineHeight: 22,
    fontWeight: "400",
    letterSpacing: -0.1,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 4,
    marginLeft: 2,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    overflow: "hidden",
  },
  cardShine: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: spacing.base,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  insightRowLast: { borderBottomWidth: 0 },
  insightDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.35)",
    marginTop: 7,
    flexShrink: 0,
  },
  insightText: { flex: 1, fontSize: 14, color: colors.text2, lineHeight: 20 },

  alertsRow: { flexDirection: "row", gap: spacing.sm },
  alertBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  alertBadgeCount: { fontSize: 18, fontWeight: "700" },
  alertBadgeLabel: { fontSize: 12, fontWeight: "600" },

  alertRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  alertRowLast: { borderBottomWidth: 0 },
  alertDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  alertContent: { flex: 1, gap: 2 },
  alertTitle: { fontSize: 14, color: colors.text1, fontWeight: "500" },
  alertTime: { fontSize: 12, fontWeight: "500" },

  noAlertsCard: { alignItems: "center", paddingVertical: spacing.xl },
  noAlertsText: { fontSize: 14, color: colors.text3 },

  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: spacing.base,
    overflow: "hidden",
    gap: 4,
  },
  metricValue: { fontSize: 22, fontWeight: "700", color: colors.text1, letterSpacing: -0.5 },
  metricLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  forecastRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
  },
  forecastLeft: { gap: 4 },
  forecastLabel: {
    fontSize: 12,
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  forecastValue: { fontSize: 24, fontWeight: "700", color: colors.text1, letterSpacing: -0.8 },
  confidencePill: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  confidenceText: { fontSize: 12, fontWeight: "700" },
  driversWrap: { paddingHorizontal: spacing.base, paddingBottom: spacing.sm },
  driversDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginBottom: spacing.sm,
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  driverIndicator: { width: 3, height: 14, borderRadius: 2, flexShrink: 0 },
  driverLabel: { flex: 1, fontSize: 13, color: colors.text2 },
  driverAmount: { fontSize: 13, fontWeight: "700" },

  footerNote: {
    fontSize: 11,
    color: colors.text3,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    letterSpacing: 0.1,
  },

  errText: { fontSize: 15, color: colors.text3, marginBottom: spacing.base },
  retryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },
  retryText: { fontSize: 15, fontWeight: "600", color: colors.text1 },
})
