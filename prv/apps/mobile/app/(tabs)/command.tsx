import { ScrollView, StyleSheet, Text, TouchableOpacity, View, RefreshControl } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { KPICard } from "@/components/KPICard"
import { GlassCard } from "@/components/Glass"
import { SkeletonKPICard, SkeletonCard, SkeletonRow } from "@/components/Skeleton"
import { FABWithSheets } from "@/components/FABWithSheets"
import { useCommand, type AlertItem, type InboxItem, type QuickAction } from "@/hooks/useCommand"
import { useProfile, getInitials } from "@/hooks/useProfile"
import { colors, spacing, type, radius } from "@/tokens"

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function formatDate() {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
}

function AlertCard({ alert }: { alert: AlertItem }) {
  const isAmber = alert.severity === "amber"
  return (
    <View style={[styles.alertCard, isAmber ? styles.alertAmber : styles.alertRed]}>
      <View
        style={[styles.alertShine, isAmber ? styles.shineAmber : styles.shineRed]}
        pointerEvents="none"
      />
      <Text style={styles.alertIcon}>{isAmber ? "⚠" : "●"}</Text>
      <View style={styles.alertBody}>
        <Text style={styles.alertTitle}>{alert.title}</Text>
        <Text style={styles.alertSub}>{alert.subtitle}</Text>
      </View>
      <Text style={styles.alertTime}>{alert.timeAgo}</Text>
    </View>
  )
}

function InboxRow({
  item,
  last,
  onPress,
}: {
  item: InboxItem
  last: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.inboxRow, !last && styles.inboxRowBorder]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.inboxAvatar}>
        <Text style={styles.inboxInitials}>{item.initials}</Text>
      </View>
      <View style={styles.inboxText}>
        <Text style={styles.inboxSender}>{item.sender}</Text>
        <Text style={styles.inboxPreview} numberOfLines={1}>
          {item.preview}
        </Text>
      </View>
      <View style={styles.inboxMeta}>
        <Text style={styles.inboxTime}>{item.timeAgo}</Text>
        {item.unread && <View style={styles.inboxDot} />}
      </View>
    </TouchableOpacity>
  )
}

function ActionButton({ action }: { action: QuickAction }) {
  const router = useRouter()
  return (
    <TouchableOpacity
      style={styles.actionBtn}
      activeOpacity={0.75}
      onPress={() => router.push(action.route as never)}
    >
      <View style={styles.actionShine} pointerEvents="none" />
      <Text style={styles.actionIcon}>{action.icon}</Text>
      <Text style={styles.actionLabel}>{action.label}</Text>
    </TouchableOpacity>
  )
}

function LoadingSkeleton() {
  return (
    <>
      <View style={styles.kpiGrid}>
        <SkeletonKPICard style={{ flex: 1 }} />
        <SkeletonKPICard style={{ flex: 1 }} />
      </View>
      <View style={styles.kpiGrid}>
        <SkeletonKPICard style={{ flex: 1 }} />
        <SkeletonKPICard style={{ flex: 1 }} />
      </View>
      <View style={styles.stripRow}>
        <SkeletonCard height={58} style={{ flex: 1 }} />
        <SkeletonCard height={58} style={{ flex: 1 }} />
        <SkeletonCard height={58} style={{ flex: 1 }} />
      </View>
      <SkeletonCard height={120} style={{ marginBottom: spacing.base }} />
      <SkeletonCard height={180} />
    </>
  )
}

export default function CommandScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { data, isLoading, isRefetching, refetch, error } = useCommand()
  const { data: profile } = useProfile()

  const profileInitials = profile
    ? getInitials(profile.firstName, profile.lastName)
    : (data?.user.firstName?.[0]?.toUpperCase() ?? "?")

  return (
    <View style={[styles.root, { flex: 1 }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 104 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.text3} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.dateText}>{formatDate()}</Text>
              <Text style={styles.greeting}>
                {getGreeting()},{"\n"}
                {data?.user.firstName ?? ""}
              </Text>
              {data?.user && (
                <View style={styles.roleChip}>
                  <View style={styles.roleDot} />
                  <Text style={styles.roleText}>
                    {data.user.role} · {data.user.scopeName}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.headerBtns}>
              <TouchableOpacity
                style={styles.searchBtn}
                onPress={() => router.push("/(auth)/search")}
                activeOpacity={0.8}
              >
                <Text style={styles.searchBtnIcon}>⌕</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profileBtn}
                onPress={() => router.push("/(auth)/profile")}
                activeOpacity={0.8}
              >
                <Text style={styles.profileInitials}>{profileInitials}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Loading state */}
        {isLoading && <LoadingSkeleton />}

        {/* Error state */}
        {error && !isLoading && (
          <GlassCard style={styles.errorCard}>
            <Text style={styles.errorText}>Could not load dashboard data.</Text>
            <TouchableOpacity
              onPress={() => refetch()}
              activeOpacity={0.75}
              style={styles.retryBtn}
            >
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        {/* Content */}
        {data && (
          <>
            {/* Primary KPI grid — chunked into rows of 2 */}
            {[0, 2].map((offset) => (
              <View key={offset} style={styles.kpiGrid}>
                {data.kpis.slice(offset, offset + 2).map((kpi) => (
                  <KPICard
                    key={kpi.label}
                    value={kpi.value}
                    label={kpi.label}
                    delta={kpi.delta}
                    deltaType={kpi.deltaType}
                    valueColor={kpi.valueColor}
                  />
                ))}
              </View>
            ))}

            {/* Secondary strip */}
            <View style={styles.stripRow}>
              {data.secondary.map((m) => (
                <View key={m.label} style={styles.stripPill}>
                  <Text style={[styles.stripVal, m.valueColor ? { color: m.valueColor } : null]}>
                    {m.value}
                  </Text>
                  <Text style={styles.stripLbl}>{m.label}</Text>
                </View>
              ))}
            </View>

            {/* AI Briefing */}
            {data.aiBriefing && (
              <>
                <Text style={styles.sectionTitle}>AI Briefing</Text>
                <GlassCard style={styles.aiCard}>
                  <View style={styles.aiTop}>
                    <Text style={styles.aiGlyph}>✦</Text>
                    <View style={styles.aiBadge}>
                      <Text style={styles.aiBadgeText}>PRV AI</Text>
                    </View>
                    <Text style={styles.aiTs}>Just now</Text>
                  </View>
                  <Text style={styles.aiSummary}>{data.aiBriefing.summary}</Text>
                  {data.aiBriefing.insights.map((insight, i) => (
                    <View key={i} style={styles.aiInsight}>
                      <Text style={styles.aiBullet}>●</Text>
                      <Text style={styles.aiInsightText} numberOfLines={3}>
                        {insight}
                      </Text>
                    </View>
                  ))}
                </GlassCard>
              </>
            )}

            {/* Critical Alerts */}
            {data.alerts.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Critical Alerts</Text>
                {data.alerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </>
            )}

            {/* Quick Actions */}
            {data.quickActions.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.actionsGrid}>
                  {data.quickActions.map((action) => (
                    <ActionButton key={action.id} action={action} />
                  ))}
                </View>
              </>
            )}

            {/* Inbox */}
            {data.inbox.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Inbox</Text>
                  <TouchableOpacity
                    onPress={() => router.push("/(auth)/inbox")}
                    activeOpacity={0.6}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.seeAll}>See all →</Text>
                  </TouchableOpacity>
                </View>
                <GlassCard style={styles.inboxCard}>
                  {data.inbox.map((item, i) => (
                    <InboxRow
                      key={item.id}
                      item={item}
                      last={i === data.inbox.length - 1}
                      onPress={() => router.push("/(auth)/inbox")}
                    />
                  ))}
                </GlassCard>
              </>
            )}
          </>
        )}
      </ScrollView>
      <FABWithSheets />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 14,
    gap: 0,
  },

  /* Header */
  header: {
    paddingBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerLeft: {
    flex: 1,
  },
  headerBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  searchBtnIcon: {
    fontSize: 17,
    color: "rgba(255,255,255,0.55)",
  },
  profileBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  profileInitials: {
    fontSize: 15,
    fontWeight: "700",
    color: "rgba(255,255,255,0.88)",
    letterSpacing: -0.3,
  },
  dateText: {
    ...type.caption1,
    color: colors.text3,
    marginBottom: 3,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  greeting: {
    ...type.title1,
    color: colors.text1,
    lineHeight: 34,
  },
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  roleText: {
    ...type.caption2,
    color: colors.text3,
    fontWeight: "500",
  },

  /* KPI grid */
  kpiGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },

  /* Secondary strip */
  stripRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    marginTop: 4,
  },
  stripPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
  },
  stripVal: {
    ...type.title3,
    color: colors.text1,
    lineHeight: 22,
  },
  stripLbl: {
    fontSize: 9,
    fontWeight: "600" as const,
    color: colors.text3,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
    marginTop: 2,
  },

  /* Section title */
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: colors.text3,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  seeAll: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: colors.text3,
  },

  /* AI briefing */
  aiCard: {
    padding: 13,
    marginBottom: 14,
    gap: 0,
  },
  aiTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 7,
  },
  aiGlyph: {
    fontSize: 15,
    color: colors.text1,
  },
  aiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aiBadgeText: {
    ...type.caption2,
    color: colors.text2,
    fontWeight: "600" as const,
    letterSpacing: 0.4,
  },
  aiTs: {
    ...type.caption2,
    color: colors.text4,
    marginLeft: "auto",
  },
  aiSummary: {
    ...type.footnote,
    color: colors.text2,
    marginBottom: 6,
  },
  aiInsight: {
    flexDirection: "row",
    gap: 7,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    alignItems: "flex-start",
  },
  aiBullet: {
    fontSize: 7,
    color: colors.text3,
    marginTop: 4,
  },
  aiInsightText: {
    ...type.caption1,
    color: colors.text3,
    flex: 1,
    lineHeight: 17,
  },

  /* Alerts */
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 6,
    overflow: "hidden",
    position: "relative",
  },
  alertAmber: {
    backgroundColor: "rgba(255,159,10,0.06)",
    borderColor: "rgba(255,159,10,0.28)",
  },
  alertRed: {
    backgroundColor: "rgba(255,69,58,0.06)",
    borderColor: "rgba(255,69,58,0.28)",
  },
  alertShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  shineAmber: { backgroundColor: "rgba(255,159,10,0.4)" },
  shineRed: { backgroundColor: "rgba(255,69,58,0.4)" },
  alertIcon: {
    fontSize: 14,
    color: colors.text2,
    flexShrink: 0,
  },
  alertBody: { flex: 1 },
  alertTitle: {
    ...type.footnote,
    color: colors.text1,
    fontWeight: "600" as const,
  },
  alertSub: {
    ...type.caption2,
    color: colors.text3,
    marginTop: 2,
  },
  alertTime: {
    ...type.caption2,
    color: colors.text3,
    flexShrink: 0,
  },

  /* Quick Actions */
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  actionBtn: {
    width: "47.5%",
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    overflow: "hidden",
    position: "relative",
  },
  actionShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  actionIcon: {
    fontSize: 16,
    color: colors.text2,
  },
  actionLabel: {
    ...type.caption1,
    color: colors.text2,
    fontWeight: "600" as const,
  },

  /* Inbox */
  inboxCard: {
    overflow: "hidden",
    padding: 0,
    borderRadius: 18,
    marginBottom: spacing.base,
  },
  inboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  inboxRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  inboxAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  inboxInitials: {
    ...type.caption2,
    color: colors.text2,
    fontWeight: "600" as const,
  },
  inboxText: { flex: 1, minWidth: 0 },
  inboxSender: {
    ...type.footnote,
    color: colors.text1,
    fontWeight: "600" as const,
  },
  inboxPreview: {
    ...type.caption2,
    color: colors.text3,
    marginTop: 2,
  },
  inboxMeta: {
    alignItems: "flex-end",
    gap: 5,
    flexShrink: 0,
  },
  inboxTime: {
    ...type.caption2,
    color: colors.text3,
  },
  inboxDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.blue,
  },

  /* Error */
  errorCard: {
    padding: spacing.base,
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    ...type.subhead,
    color: colors.text3,
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: {
    ...type.footnote,
    color: colors.text2,
    fontWeight: "600" as const,
  },
})
