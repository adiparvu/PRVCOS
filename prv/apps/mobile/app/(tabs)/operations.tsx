import { useState } from "react"
import {
  ActivityIndicator,
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
import {
  useOperations,
  type ProjectItem,
  type OrderItem,
  type TaskItem,
} from "@/hooks/useOperations"
import { useStores, formatRevenue } from "@/hooks/useStores"
import { FABWithSheets } from "@/components/FABWithSheets"
import { colors, radius, spacing, type as t } from "@/tokens"

// ─── Types ────────────────────────────────────────────────────────────────────

type Segment = "projects" | "orders" | "tasks" | "stores"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDueDate(dueDate: string | null): { label: string; color: string } {
  if (!dueDate) return { label: "—", color: colors.text3 }
  const d = new Date(dueDate)
  const diffDays = Math.floor((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, color: colors.red }
  if (diffDays === 0) return { label: "Today", color: colors.amber }
  if (diffDays === 1) return { label: "Tomorrow", color: colors.amber }
  if (diffDays < 7) return { label: `${diffDays}d`, color: colors.text2 }
  return {
    label: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
    color: colors.text2,
  }
}

const PROJECT_STATUS: Record<string, { label: string; bg: string; fg: string; border: string }> = {
  active: {
    label: "Active",
    bg: "rgba(48,209,88,0.12)",
    fg: colors.green,
    border: "rgba(48,209,88,0.25)",
  },
  on_hold: {
    label: "On Hold",
    bg: "rgba(255,159,10,0.10)",
    fg: colors.amber,
    border: "rgba(255,159,10,0.22)",
  },
  completed: {
    label: "Done",
    bg: "rgba(100,210,255,0.10)",
    fg: "#64d2ff",
    border: "rgba(100,210,255,0.22)",
  },
  draft: { label: "Draft", bg: colors.glass1, fg: colors.text3, border: colors.border },
}

const ORDER_STATUS: Record<string, { color: string }> = {
  pending: { color: colors.amber },
  confirmed: { color: "#64d2ff" },
  processing: { color: "#64d2ff" },
  shipped: { color: "#64d2ff" },
  delivered: { color: colors.green },
  cancelled: { color: colors.red },
  refunded: { color: colors.red },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPIPill({
  value,
  label,
  delta,
  deltaColor,
}: {
  value: string
  label: string
  delta?: string
  deltaColor?: string
}) {
  return (
    <View style={s.kpiPill}>
      <View style={s.pillShine} pointerEvents="none" />
      <Text style={s.kpiValue}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
      {delta ? (
        <Text style={[s.kpiDelta, { color: deltaColor ?? colors.text3 }]}>{delta}</Text>
      ) : null}
    </View>
  )
}

function ProjectCard({ item }: { item: ProjectItem }) {
  const router = useRouter()
  const status = PROJECT_STATUS[item.status] ?? PROJECT_STATUS.draft!
  const due = formatDueDate(item.dueDate)

  return (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: "/(auth)/project-detail", params: { id: item.id } })}
    >
      <View style={s.cardShine} pointerEvents="none" />
      <View style={s.cardTop}>
        <Text style={s.cardTitle} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={[s.statusPill, { backgroundColor: status.bg, borderColor: status.border }]}>
          <Text style={[s.statusPillText, { color: status.fg }]}>{status.label}</Text>
        </View>
      </View>

      <View style={s.cardMeta}>
        {item.clientName ? (
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Client</Text>
            <Text style={s.metaValue} numberOfLines={1}>
              {item.clientName}
            </Text>
          </View>
        ) : null}
        {item.value ? (
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Value</Text>
            <Text style={s.metaValue}>{item.value}</Text>
          </View>
        ) : null}
        <View style={s.metaItem}>
          <Text style={s.metaLabel}>Due</Text>
          <Text style={[s.metaValue, { color: due.color }]}>{due.label}</Text>
        </View>
      </View>

      <View style={s.progressWrap}>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${item.progress}%` }]} />
        </View>
        <Text style={[s.progressPct, item.progress === 100 ? { color: colors.green } : null]}>
          {item.progress}%
        </Text>
      </View>
    </TouchableOpacity>
  )
}

function OrderRow({ item, last }: { item: OrderItem; last: boolean }) {
  const router = useRouter()
  const statusColor = ORDER_STATUS[item.status]?.color ?? colors.text3
  const statusLabel = item.status.charAt(0).toUpperCase() + item.status.slice(1)

  return (
    <TouchableOpacity
      style={[s.listRow, last ? s.listRowLast : null]}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: "/(auth)/order-detail", params: { id: item.id } })}
    >
      <View style={s.orderIcon}>
        <Text style={{ fontSize: 16 }}>◈</Text>
      </View>
      <View style={s.rowInfo}>
        <Text style={s.rowTitle}>{item.orderNumber}</Text>
        <Text style={s.rowSub} numberOfLines={1}>
          {new Date(item.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
        </Text>
      </View>
      <View style={s.rowRight}>
        <Text style={s.rowAmount}>{item.amount}</Text>
        <View style={s.statusDotRow}>
          <View style={[s.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[s.statusDotLabel, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

function TaskRow({ item, last }: { item: TaskItem; last: boolean }) {
  const due = formatDueDate(item.dueDate)

  return (
    <View style={[s.listRow, last ? s.listRowLast : null]}>
      <View
        style={[
          s.taskCheck,
          item.isComplete ? s.taskCheckDone : null,
          item.isOverdue && !item.isComplete ? s.taskCheckOverdue : null,
        ]}
      >
        {item.isComplete ? <Text style={s.taskCheckMark}>✓</Text> : null}
      </View>
      <View style={s.rowInfo}>
        <Text style={[s.rowTitle, item.isComplete ? s.rowTitleDone : null]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={s.rowSub} numberOfLines={1}>
          {item.projectName}
        </Text>
      </View>
      <View style={s.rowRight}>
        {!item.isComplete ? (
          <Text style={[s.taskDue, { color: due.color }]}>{due.label}</Text>
        ) : (
          <Text style={[s.taskDue, { color: colors.green }]}>Done</Text>
        )}
      </View>
    </View>
  )
}

function ListCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.listCard}>
      <View style={s.cardShine} pointerEvents="none" />
      {children}
    </View>
  )
}

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      {action ? <Text style={s.sectionAction}>{action}</Text> : null}
    </View>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyText}>{label}</Text>
    </View>
  )
}

function StoresContent() {
  const router = useRouter()
  const { data, isLoading, error } = useStores()

  if (isLoading) {
    return (
      <View style={{ paddingTop: spacing.xxl, alignItems: "center" }}>
        <ActivityIndicator color={colors.text3} />
      </View>
    )
  }

  if (error || !data) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyText}>Could not load stores.</Text>
      </View>
    )
  }

  if (data.stores.length === 0) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyText}>No stores found.</Text>
      </View>
    )
  }

  return (
    <>
      {data.stores.map((store, i) => (
        <TouchableOpacity
          key={store.id}
          style={[s.storeCard, i > 0 && { marginTop: 10 }]}
          activeOpacity={0.8}
          onPress={() =>
            router.push({ pathname: "/(auth)/store-detail", params: { id: store.id } })
          }
        >
          <View style={s.cardShine} pointerEvents="none" />
          <View style={s.storeCardTop}>
            <View style={s.storeCardLeft}>
              <Text style={s.storeName}>{store.name}</Text>
              {store.city && <Text style={s.storeCity}>{store.city}</Text>}
            </View>
            <View style={s.storeStatusPill}>
              <View style={s.storeStatusDot} />
              <Text style={s.storeStatusText}>Open</Text>
            </View>
          </View>
          <View style={s.storeKpiRow}>
            <View style={s.storeKpiItem}>
              <Text style={s.storeKpiVal}>{formatRevenue(store.revenueToday)}</Text>
              <Text style={s.storeKpiLbl}>Today</Text>
            </View>
            <View style={s.storeKpiDivider} />
            <View style={s.storeKpiItem}>
              <Text style={s.storeKpiVal}>{store.transactionsToday}</Text>
              <Text style={s.storeKpiLbl}>Transactions</Text>
            </View>
            <View style={s.storeKpiDivider} />
            <View style={s.storeKpiItem}>
              <Text style={s.storeKpiVal}>{store.staffCount}</Text>
              <Text style={s.storeKpiLbl}>Staff</Text>
            </View>
            {store.inventoryAlerts > 0 && (
              <>
                <View style={s.storeKpiDivider} />
                <View style={s.storeKpiItem}>
                  <Text style={[s.storeKpiVal, { color: colors.red }]}>
                    {store.inventoryAlerts}
                  </Text>
                  <Text style={s.storeKpiLbl}>Alerts</Text>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBlock({ w, h, r }: { w?: number | string; h: number; r?: number }) {
  return (
    <View
      style={{
        width: w ?? "100%",
        height: h,
        borderRadius: r ?? 8,
        backgroundColor: "rgba(255,255,255,0.07)",
      }}
    />
  )
}

function SkeletonContent() {
  return (
    <View style={{ padding: spacing.lg, gap: spacing.base }}>
      <View style={s.kpiStrip}>
        {[100, 90, 100, 80].map((w, i) => (
          <SkeletonBlock key={i} w={w} h={68} r={14} />
        ))}
      </View>
      {[1, 2, 3].map((i) => (
        <SkeletonBlock key={i} h={100} r={18} />
      ))}
    </View>
  )
}

// ─── Segment Content ──────────────────────────────────────────────────────────

function ProjectsContent({ data }: { data: ReturnType<typeof useOperations>["data"] }) {
  if (!data) return <SkeletonContent />

  const { projectsKpi: kpi, projects } = data
  const overdueProjects = projects.filter(
    (p) => p.dueDate && new Date(p.dueDate) < new Date() && p.status !== "completed"
  ).length

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.kpiScrollWrap}
        contentContainerStyle={s.kpiStrip}
      >
        <KPIPill
          value={String(kpi.active)}
          label="Active"
          delta={kpi.onHold > 0 ? `${kpi.onHold} on hold` : undefined}
          deltaColor={kpi.onHold > 0 ? colors.amber : undefined}
        />
        <KPIPill value={`${kpi.avgProgress}%`} label="Avg Progress" />
        <KPIPill value={kpi.pipeline} label="Pipeline" />
        {overdueProjects > 0 ? (
          <KPIPill value={String(overdueProjects)} label="Overdue" deltaColor={colors.red} />
        ) : null}
      </ScrollView>

      <SectionHeader title="Projects" action="See all →" />
      {projects.length === 0 ? (
        <EmptyState label="No active projects" />
      ) : (
        projects.map((p) => <ProjectCard key={p.id} item={p} />)
      )}
    </>
  )
}

function OrdersContent({ data }: { data: ReturnType<typeof useOperations>["data"] }) {
  if (!data) return <SkeletonContent />

  const { ordersKpi: kpi, orders } = data

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.kpiScrollWrap}
        contentContainerStyle={s.kpiStrip}
      >
        <KPIPill value={String(kpi.thisWeek)} label="This Week" />
        <KPIPill
          value={String(kpi.pending)}
          label="Pending"
          deltaColor={kpi.pending > 0 ? colors.amber : undefined}
        />
        <KPIPill value={kpi.revenue} label="Revenue" />
        {kpi.refunded > 0 ? (
          <KPIPill value={String(kpi.refunded)} label="Refunded" deltaColor={colors.red} />
        ) : null}
      </ScrollView>

      <SectionHeader title="Recent Orders" action="See all →" />
      {orders.length === 0 ? (
        <EmptyState label="No orders this week" />
      ) : (
        <ListCard>
          {orders.map((o, i) => (
            <OrderRow key={o.id} item={o} last={i === orders.length - 1} />
          ))}
        </ListCard>
      )}
    </>
  )
}

function TasksContent({ data }: { data: ReturnType<typeof useOperations>["data"] }) {
  if (!data) return <SkeletonContent />

  const { tasksKpi: kpi, tasks } = data
  const overdue = tasks.filter((t) => t.isOverdue)
  const open = tasks.filter((t) => !t.isComplete && !t.isOverdue)
  const done = tasks.filter((t) => t.isComplete)

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.kpiScrollWrap}
        contentContainerStyle={s.kpiStrip}
      >
        <KPIPill value={String(kpi.open)} label="Open" />
        <KPIPill
          value={String(kpi.overdue)}
          label="Overdue"
          deltaColor={kpi.overdue > 0 ? colors.red : undefined}
        />
        <KPIPill
          value={String(kpi.doneToday)}
          label="Done Today"
          deltaColor={kpi.doneToday > 0 ? colors.green : undefined}
        />
      </ScrollView>

      {overdue.length > 0 ? (
        <>
          <SectionHeader title="Overdue" />
          <ListCard>
            {overdue.map((t, i) => (
              <TaskRow key={t.id} item={t} last={i === overdue.length - 1} />
            ))}
          </ListCard>
        </>
      ) : null}

      {open.length > 0 ? (
        <>
          <SectionHeader title="Open" />
          <ListCard>
            {open.map((t, i) => (
              <TaskRow key={t.id} item={t} last={i === open.length - 1} />
            ))}
          </ListCard>
        </>
      ) : null}

      {done.length > 0 ? (
        <>
          <SectionHeader title="Done Today" />
          <ListCard>
            {done.map((t, i) => (
              <TaskRow key={t.id} item={t} last={i === done.length - 1} />
            ))}
          </ListCard>
        </>
      ) : null}

      {tasks.length === 0 ? <EmptyState label="No open milestones" /> : null}
    </>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: "projects", label: "Projects" },
  { key: "orders", label: "Orders" },
  { key: "tasks", label: "Tasks" },
  { key: "stores", label: "Stores" },
]

export default function OperationsScreen() {
  const insets = useSafeAreaInsets()
  const [segment, setSegment] = useState<Segment>("projects")
  const { data, isLoading, isError, refetch, isRefetching } = useOperations()

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Fixed header */}
      <View style={s.header}>
        <Text style={s.title}>Operations</Text>
      </View>

      {/* Fixed segment control */}
      <View style={s.segmentWrap}>
        <View style={s.segment}>
          {SEGMENTS.map((seg) => (
            <Pressable
              key={seg.key}
              style={[s.segBtn, segment === seg.key ? s.segBtnActive : null]}
              onPress={() => setSegment(seg.key)}
            >
              <Text style={[s.segBtnText, segment === seg.key ? s.segBtnTextActive : null]}>
                {seg.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Scrollable content */}
      {isLoading ? (
        <SkeletonContent />
      ) : isError ? (
        <View style={s.errorWrap}>
          <Text style={s.errorText}>Failed to load operations data.</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => void refetch()} activeOpacity={0.8}>
            <Text style={s.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor="rgba(255,255,255,0.4)"
            />
          }
        >
          {segment === "projects" && <ProjectsContent data={data} />}
          {segment === "orders" && <OrdersContent data={data} />}
          {segment === "tasks" && <TasksContent data={data} />}
          {segment === "stores" && <StoresContent />}
        </ScrollView>
      )}

      <FABWithSheets />
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: colors.text1,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBtnText: {
    fontSize: 18,
    color: colors.text1,
    lineHeight: 22,
  },

  // Segment
  segmentWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.md,
    padding: 3,
    gap: 2,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 9,
  },
  segBtnActive: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  segBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.text3,
  },
  segBtnTextActive: {
    color: colors.text1,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },

  // KPI strip
  kpiScrollWrap: {
    marginHorizontal: -spacing.lg,
  },
  kpiStrip: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  kpiPill: {
    minWidth: 100,
    padding: 12,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: "hidden",
  },
  pillShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: colors.text1,
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.04,
  },
  kpiDelta: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 4,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.06,
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.text3,
  },

  // Glass card (project)
  card: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: spacing.base,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  cardShine: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text1,
    lineHeight: 20,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.02,
  },
  cardMeta: {
    flexDirection: "row",
    gap: spacing.base,
    marginBottom: spacing.md,
  },
  metaItem: {
    gap: 2,
  },
  metaLabel: {
    fontSize: 11,
    color: colors.text3,
    fontWeight: "500",
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text2,
  },
  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 2,
  },
  progressPct: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text3,
    minWidth: 30,
    textAlign: "right",
  },

  // List card (orders / tasks)
  listCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: spacing.md,
  },
  listRowLast: {
    borderBottomWidth: 0,
  },
  orderIcon: {
    width: 36,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowInfo: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text1,
  },
  rowTitleDone: {
    color: colors.text3,
    textDecorationLine: "line-through",
  },
  rowSub: {
    fontSize: 12,
    color: colors.text3,
  },
  rowRight: {
    alignItems: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
  rowAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text1,
  },
  statusDotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotLabel: {
    fontSize: 11,
    fontWeight: "500",
  },

  // Task
  taskCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  taskCheckDone: {
    backgroundColor: "rgba(48,209,88,0.2)",
    borderColor: "rgba(48,209,88,0.5)",
  },
  taskCheckOverdue: {
    borderColor: "rgba(255,69,58,0.5)",
    backgroundColor: "rgba(255,69,58,0.08)",
  },
  taskCheckMark: {
    fontSize: 11,
    color: colors.green,
    fontWeight: "700",
  },
  taskDue: {
    fontSize: 11,
    fontWeight: "500",
  },

  // Empty / error states
  empty: {
    padding: spacing.xl,
    alignItems: "center",
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 15,
    color: colors.text3,
  },
  errorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.base,
  },
  errorText: {
    fontSize: 15,
    color: colors.text3,
  },
  retryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text1,
  },

  // Stores
  storeCard: {
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 4,
    padding: 16,
  },
  storeCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  storeCardLeft: { flex: 1 },
  storeName: { fontSize: 17, fontWeight: "700", color: colors.text1, letterSpacing: -0.3 },
  storeCity: { fontSize: 12, color: colors.text3, marginTop: 2 },
  storeStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: "rgba(48,209,88,0.10)",
    borderWidth: 1,
    borderColor: "rgba(48,209,88,0.2)",
    marginLeft: 8,
  },
  storeStatusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.green },
  storeStatusText: { fontSize: 11, fontWeight: "600", color: colors.green },
  storeKpiRow: { flexDirection: "row", alignItems: "center" },
  storeKpiItem: { flex: 1, alignItems: "center", gap: 3 },
  storeKpiVal: { fontSize: 17, fontWeight: "700", color: colors.text1, letterSpacing: -0.3 },
  storeKpiLbl: { fontSize: 10, color: colors.text3 },
  storeKpiDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.08)" },

  // Stores placeholder (keep for compat)
  comingSoon: {
    paddingTop: spacing.xxl,
    alignItems: "center",
  },
  comingSoonInner: {
    width: "100%",
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
    overflow: "hidden",
  },
  comingSoonIcon: {
    fontSize: 36,
    color: colors.text2,
    marginBottom: spacing.sm,
  },
  comingSoonTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text2,
  },
  comingSoonSub: {
    fontSize: 14,
    color: colors.text3,
    textAlign: "center",
    lineHeight: 20,
  },

  // FAB
  fab: {
    position: "absolute",
    right: spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fabShine: {
    position: "absolute",
    top: 0,
    left: 8,
    right: 8,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  fabIcon: {
    fontSize: 22,
    color: colors.text1,
    lineHeight: 26,
  },
})
