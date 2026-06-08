import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter, useLocalSearchParams } from "expo-router"
import Svg, { Path } from "react-native-svg"
import { useStoreDetail, getInitials, formatDueDate, type StoreDetail } from "@/hooks/useStores"
import { colors, radius, spacing, type as t } from "@/tokens"

function ChevronLeft() {
  return (
    <Svg width={10} height={18} viewBox="0 0 10 18" fill="none">
      <Path
        d="M9 1L1 9L9 17"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ── Mini bar chart ─────────────────────────────────────────────────────────────

function WeeklyChart({ data }: { data: StoreDetail["weeklyRevenue"] }) {
  const max = Math.max(...data.map((d) => d.amount), 1)
  return (
    <View style={c.chartWrap}>
      <View style={c.bars}>
        {data.map((d) => (
          <View key={d.day} style={c.barCol}>
            <View
              style={[
                c.bar,
                { height: `${Math.max((d.amount / max) * 100, 4)}%` },
                d.isToday && c.barActive,
              ]}
            />
          </View>
        ))}
      </View>
      <View style={c.barLabels}>
        {data.map((d) => (
          <Text key={d.day} style={[c.barLabel, d.isToday && c.barLabelActive]}>
            {d.day}
          </Text>
        ))}
      </View>
    </View>
  )
}

// ── KPI pill ──────────────────────────────────────────────────────────────────

function KPIPill({
  value,
  label,
  valueColor,
}: {
  value: string | number
  label: string
  valueColor?: string
}) {
  return (
    <View style={s.kpiPill}>
      <Text style={[s.kpiVal, valueColor ? { color: valueColor } : null]}>{value}</Text>
      <Text style={s.kpiLbl}>{label}</Text>
    </View>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHead({
  label,
  link,
  onPress,
}: {
  label: string
  link?: string
  onPress?: () => void
}) {
  return (
    <View style={s.sectionHead}>
      <Text style={s.sectionLabel}>{label}</Text>
      {link && (
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={s.sectionLink}>{link}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ── Staff row ─────────────────────────────────────────────────────────────────

function StaffRow({ member, last }: { member: StoreDetail["staff"][0]; last: boolean }) {
  const initials = getInitials(member.name)
  return (
    <View style={[s.row, !last && s.rowBorder]}>
      <View style={s.staffAvatar}>
        <Text style={s.staffInitials}>{initials}</Text>
      </View>
      <View style={s.rowBody}>
        <Text style={s.rowTitle}>{member.name}</Text>
        <Text style={s.rowSub}>{member.jobTitle ?? member.role}</Text>
      </View>
      <View style={s.onlineDot} />
    </View>
  )
}

// ── Inventory alert row ───────────────────────────────────────────────────────

function InventoryRow({ item, last }: { item: StoreDetail["inventoryAlerts"][0]; last: boolean }) {
  const isCritical = item.severity === "critical"
  return (
    <View style={[s.row, !last && s.rowBorder]}>
      <View style={s.invIcon}>
        <Text style={s.invIconText}>⬡</Text>
      </View>
      <View style={s.rowBody}>
        <Text style={s.rowTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={s.rowSub}>
          {item.stock} {item.unit} — min {item.minimum}
        </Text>
      </View>
      <View style={[s.invBadge, isCritical ? s.badgeCrit : s.badgeLow]}>
        <Text style={[s.invBadgeText, isCritical ? s.badgeCrit : s.badgeLow]}>
          {isCritical ? "CRITICAL" : "LOW"}
        </Text>
      </View>
    </View>
  )
}

// ── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({ task, last }: { task: StoreDetail["tasks"][0]; last: boolean }) {
  const { label: dueLabel, color: dueColor } = formatDueDate(task.dueDate, task.isOverdue)
  return (
    <View style={[s.row, !last && s.rowBorder]}>
      <View style={[s.taskCheck, task.isOverdue && s.taskCheckOverdue]} />
      <View style={s.rowBody}>
        <Text style={s.rowTitle}>{task.title}</Text>
        <Text style={s.rowSub}>{task.projectName}</Text>
      </View>
      <Text style={[s.taskDue, { color: dueColor }]}>{dueLabel}</Text>
    </View>
  )
}

// ── Quick actions ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: "＋", label: "New Task" },
  { icon: "⬡", label: "Inventory" },
  { icon: "⟁", label: "Report" },
  { icon: "◎", label: "Staff" },
] as const

// ── Main screen ───────────────────────────────────────────────────────────────

export default function StoreDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const { data, isLoading, error } = useStoreDetail(id ?? "")

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Nav bar */}
      <View style={s.navBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft />
          <Text style={s.backLabel}>Operations</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>{data?.store.name ?? "Store"}</Text>
        <View style={{ minWidth: 72 }} />
      </View>

      {/* Loading */}
      {isLoading && (
        <View style={s.loader}>
          <ActivityIndicator color={colors.text3} />
        </View>
      )}

      {/* Error */}
      {error && !isLoading && (
        <View style={s.loader}>
          <Text style={s.errorText}>Could not load store data.</Text>
        </View>
      )}

      {/* Content */}
      {data && (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero card */}
          <View style={s.heroCard}>
            <View style={s.heroShine} pointerEvents="none" />
            <View style={s.heroTop}>
              <View style={s.heroLeft}>
                <Text style={s.storeName}>{data.store.name}</Text>
                {data.store.address || data.store.city ? (
                  <Text style={s.storeAddr}>
                    {[data.store.address, data.store.city].filter(Boolean).join(", ")}
                  </Text>
                ) : null}
              </View>
              <View style={s.statusPill}>
                <View style={s.statusDot} />
                <Text style={s.statusText}>Open</Text>
              </View>
            </View>
            <View style={s.kpiRow}>
              <KPIPill value={data.kpis.revenueToday} label="Revenue today" />
              <KPIPill value={data.kpis.transactionsToday} label="Transactions" />
              <KPIPill
                value={data.kpis.openTasks}
                label="Tasks open"
                valueColor={data.kpis.openTasks > 0 ? colors.red : undefined}
              />
            </View>
          </View>

          {/* Weekly revenue */}
          <Text style={s.chartSectionLabel}>Revenue — This Week</Text>
          <View style={s.chartCard}>
            <WeeklyChart data={data.weeklyRevenue} />
          </View>

          {/* Quick actions */}
          <View style={s.actionsRow}>
            {QUICK_ACTIONS.map((a) => (
              <TouchableOpacity key={a.label} style={s.actionCard} activeOpacity={0.75}>
                <View style={s.actionShine} pointerEvents="none" />
                <Text style={s.actionIcon}>{a.icon}</Text>
                <Text style={s.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Staff */}
          {data.staff.length > 0 && (
            <>
              <SectionHead label={`On Shift · ${data.staff.length}`} link="Schedule →" />
              <View style={s.card}>
                {data.staff.map((m, i) => (
                  <StaffRow key={m.id} member={m} last={i === data.staff.length - 1} />
                ))}
              </View>
            </>
          )}

          {/* Inventory alerts */}
          {data.inventoryAlerts.length > 0 && (
            <>
              <SectionHead
                label={`Inventory Alerts · ${data.kpis.inventoryAlerts}`}
                link="View all →"
              />
              <View style={s.card}>
                {data.inventoryAlerts.map((item, i) => (
                  <InventoryRow
                    key={item.id}
                    item={item}
                    last={i === data.inventoryAlerts.length - 1}
                  />
                ))}
              </View>
            </>
          )}

          {/* Tasks */}
          {data.tasks.length > 0 && (
            <>
              <SectionHead label="Open Tasks" link="All tasks →" />
              <View style={s.card}>
                {data.tasks.map((task, i) => (
                  <TaskRow key={task.id} task={task} last={i === data.tasks.length - 1} />
                ))}
              </View>
            </>
          )}

          {/* Empty state when everything is clean */}
          {data.staff.length === 0 &&
            data.inventoryAlerts.length === 0 &&
            data.tasks.length === 0 && (
              <View style={s.empty}>
                <Text style={s.emptyIcon}>⊞</Text>
                <Text style={s.emptyTitle}>All clear</Text>
                <Text style={s.emptyDesc}>No alerts, tasks, or staff assigned to this store.</Text>
              </View>
            )}
        </ScrollView>
      )}
    </View>
  )
}

// ── Chart styles ──────────────────────────────────────────────────────────────

const c = StyleSheet.create({
  chartWrap: { gap: 6 },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 48,
  },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" },
  bar: {
    width: "100%",
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
    minHeight: 3,
  },
  barActive: { backgroundColor: "rgba(255,255,255,0.55)" },
  barLabels: { flexDirection: "row", gap: 4 },
  barLabel: {
    flex: 1,
    fontSize: 9,
    color: colors.text3,
    textAlign: "center",
  },
  barLabelActive: { color: "rgba(255,255,255,0.6)" },
})

// ── Screen styles ─────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  /* Nav bar */
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 72 },
  backLabel: { ...t.body, color: colors.text2 },
  navTitle: { ...t.headline, color: colors.text1 },

  /* Loader / error */
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { ...t.subhead, color: colors.text3 },

  /* Scroll */
  scroll: { paddingHorizontal: 16, paddingTop: 14, gap: 0 },

  /* Hero card */
  heroCard: {
    borderRadius: radius.panel,
    overflow: "hidden",
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 8,
    padding: 20,
    marginBottom: 14,
  },
  heroShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  heroLeft: { flex: 1 },
  storeName: { ...t.title2, color: colors.text1 },
  storeAddr: { ...t.footnote, color: colors.text3, marginTop: 3 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: "rgba(48,209,88,0.12)",
    borderWidth: 1,
    borderColor: "rgba(48,209,88,0.22)",
    marginLeft: 8,
    flexShrink: 0,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  statusText: { fontSize: 12, fontWeight: "600", color: colors.green },

  kpiRow: { flexDirection: "row", gap: 8 },
  kpiPill: {
    flex: 1,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 3,
  },
  kpiVal: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3, color: colors.text1 },
  kpiLbl: { fontSize: 10, color: colors.text3 },

  /* Chart */
  chartSectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text3,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 8,
    paddingLeft: 4,
  },
  chartCard: {
    borderRadius: radius.card,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    padding: 16,
    marginBottom: 14,
  },

  /* Quick actions */
  actionsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  actionCard: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.base,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    alignItems: "center",
    gap: 6,
    overflow: "hidden",
  },
  actionShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  actionIcon: { fontSize: 20 },
  actionLabel: { fontSize: 11, fontWeight: "500", color: colors.text2 },

  /* Section */
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 14,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text3,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  sectionLink: { fontSize: 12, fontWeight: "500", color: colors.text3 },

  /* Card */
  card: {
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 4,
    marginBottom: 4,
  },

  /* Row */
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { ...t.subhead, fontWeight: "600", color: colors.text1 },
  rowSub: { ...t.caption1, color: colors.text3, marginTop: 2 },

  /* Staff */
  staffAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  staffInitials: { fontSize: 13, fontWeight: "700", color: colors.text1 },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green,
    flexShrink: 0,
  },

  /* Inventory */
  invIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  invIconText: { fontSize: 16 },
  invBadge: {
    height: 18,
    paddingHorizontal: 7,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  invBadgeText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.4 },
  badgeCrit: { backgroundColor: "rgba(255,69,58,0.2)", color: "rgba(255,100,80,0.9)" },
  badgeLow: { backgroundColor: "rgba(255,159,10,0.18)", color: "rgba(255,180,50,0.85)" },

  /* Tasks */
  taskCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    flexShrink: 0,
  },
  taskCheckOverdue: {
    borderColor: "rgba(255,69,58,0.5)",
    backgroundColor: "rgba(255,69,58,0.08)",
  },
  taskDue: { fontSize: 11, fontWeight: "500", flexShrink: 0 },

  /* Empty state */
  empty: {
    marginTop: 32,
    padding: 40,
    borderRadius: radius.card,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    gap: 10,
  },
  emptyIcon: { fontSize: 36, opacity: 0.25 },
  emptyTitle: { ...t.headline, color: colors.text2 },
  emptyDesc: { ...t.footnote, color: colors.text3, textAlign: "center", lineHeight: 18 },
})
