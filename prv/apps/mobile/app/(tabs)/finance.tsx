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
import { useState } from "react"
import { useRouter } from "expo-router"
import { GlassCard } from "@/components/Glass"
import { colors, radius, spacing, type } from "@/tokens"
import {
  useFinance,
  type DayRevenue,
  type FinanceInvoiceItem,
  type FinanceOrderItem,
} from "@/hooks/useFinance"

// ─── Segment Control ──────────────────────────────────────────────────────────

const SEGMENTS = ["Revenue", "Invoices", "Expenses", "Reports"] as const
type Segment = (typeof SEGMENTS)[number]

// ─── Revenue Chart ────────────────────────────────────────────────────────────

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"]

function RevenueChart({ days }: { days: DayRevenue[] }) {
  const maxVal = Math.max(...days.map((d) => d.total), 1)
  const todayStr = new Date().toISOString().slice(0, 10)
  const totalWeek = days.reduce((s, d) => s + d.total, 0)

  return (
    <GlassCard style={styles.chartCard}>
      <Text style={styles.chartTitle}>7-Day Revenue</Text>
      <View style={styles.chartBars}>
        {days.map((d) => {
          const barH = Math.max(4, Math.round((d.total / maxVal) * 72))
          const isToday = d.date === todayStr
          const dayLetter = DAY_LETTERS[new Date(d.date + "T00:00:00").getDay()]
          return (
            <View key={d.date} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    { height: barH },
                    isToday ? styles.barToday : styles.barDefault,
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>{dayLetter}</Text>
            </View>
          )
        })}
      </View>
      <View style={styles.chartFooter}>
        <Text style={styles.chartFooterLabel}>7-day total</Text>
        <Text style={styles.chartFooterValue}>
          {totalWeek >= 1_000_000
            ? `${(totalWeek / 1_000_000).toFixed(1)}M RON`
            : totalWeek >= 1_000
              ? `${Math.round(totalWeek / 1_000)}k RON`
              : `${Math.round(totalWeek)} RON`}
        </Text>
      </View>
    </GlassCard>
  )
}

// ─── Order Row ────────────────────────────────────────────────────────────────

const STATUS_DOTS: Record<string, string> = {
  pending: colors.amber,
  processing: colors.text2,
  completed: colors.green,
  cancelled: colors.red,
  refunded: colors.red,
}

function OrderRow({ item }: { item: FinanceOrderItem }) {
  const router = useRouter()
  const dotColor = STATUS_DOTS[item.status] ?? colors.text3
  const date = new Date(item.createdAt)
  const dateStr = `${date.getDate()} ${date.toLocaleString("en", { month: "short" })}`

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: "/(auth)/order-detail", params: { id: item.id } })}
    >
      <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>{item.orderNumber}</Text>
        <Text style={styles.rowSub}>{dateStr}</Text>
      </View>
      <Text style={styles.rowAmount}>{item.amount}</Text>
    </TouchableOpacity>
  )
}

// ─── Invoice Row ──────────────────────────────────────────────────────────────

const INVOICE_BADGE: Record<string, { bg: string; text: string }> = {
  overdue: { bg: "rgba(255,59,48,0.18)", text: colors.red },
  sent: { bg: "rgba(255,214,10,0.15)", text: colors.amber },
  draft: { bg: "rgba(255,255,255,0.08)", text: colors.text3 },
  paid: { bg: "rgba(52,199,89,0.15)", text: colors.green },
}

function InvoiceRow({ item }: { item: FinanceInvoiceItem }) {
  const router = useRouter()
  const badge = INVOICE_BADGE[item.status] ?? INVOICE_BADGE.draft
  const amountColor =
    item.status === "overdue" ? colors.red : item.status === "paid" ? colors.green : colors.text1

  let sub = item.clientName ?? "—"
  if (item.dueDate) sub += ` · Due ${item.dueDate}`

  return (
    <TouchableOpacity
      style={styles.invoiceRow}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: "/(auth)/invoice-detail", params: { id: item.id } })}
    >
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>{item.invoiceNumber}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <View style={styles.invoiceRight}>
        <Text style={[styles.rowAmount, { color: amountColor }]}>{item.amount}</Text>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── KPI Strip ────────────────────────────────────────────────────────────────

function KpiStrip({ items }: { items: { label: string; value: string; valueColor?: string }[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.kpiStrip}
    >
      {items.map((k) => (
        <GlassCard key={k.label} style={styles.kpiCard}>
          <Text style={[styles.kpiValue, k.valueColor ? { color: k.valueColor } : undefined]}>
            {k.value}
          </Text>
          <Text style={styles.kpiLabel}>{k.label}</Text>
        </GlassCard>
      ))}
    </ScrollView>
  )
}

// ─── Placeholder ─────────────────────────────────────────────────────────────

function Placeholder({ label }: { label: string }) {
  return (
    <GlassCard style={styles.placeholder}>
      <Text style={styles.placeholderIcon}>◫</Text>
      <Text style={styles.placeholderTitle}>{label}</Text>
      <Text style={styles.placeholderSub}>Coming in a future release</Text>
    </GlassCard>
  )
}

// ─── Revenue Content ──────────────────────────────────────────────────────────

function RevenueContent({
  data,
}: {
  data: {
    revenueKpi: {
      thisMonth: string
      profitEstimate: string
      ordersCount: number
      avgOrderValue: string
      deltaPercent: number | null
    }
    dailyRevenue: DayRevenue[]
    recentOrders: FinanceOrderItem[]
  }
}) {
  const kpis = [
    { label: "Revenue MTD", value: data.revenueKpi.thisMonth },
    {
      label: "vs Last Month",
      value:
        data.revenueKpi.deltaPercent != null
          ? `${data.revenueKpi.deltaPercent >= 0 ? "+" : ""}${data.revenueKpi.deltaPercent}%`
          : "—",
      valueColor:
        data.revenueKpi.deltaPercent != null
          ? data.revenueKpi.deltaPercent >= 0
            ? colors.green
            : colors.red
          : undefined,
    },
    { label: "Profit Est.", value: data.revenueKpi.profitEstimate, valueColor: colors.green },
    { label: "Orders", value: String(data.revenueKpi.ordersCount) },
    { label: "Avg. Order", value: data.revenueKpi.avgOrderValue },
  ]

  return (
    <View style={styles.segContent}>
      <KpiStrip items={kpis} />
      <RevenueChart days={data.dailyRevenue} />
      {data.recentOrders.length > 0 && (
        <>
          <Text style={styles.listTitle}>Recent Orders</Text>
          <GlassCard style={styles.listCard}>
            {data.recentOrders.map((o, i) => (
              <View key={o.id}>
                {i > 0 && <View style={styles.divider} />}
                <OrderRow item={o} />
              </View>
            ))}
          </GlassCard>
        </>
      )}
    </View>
  )
}

// ─── Invoices Content ─────────────────────────────────────────────────────────

function InvoicesContent({
  data,
}: {
  data: {
    invoicesKpi: {
      outstanding: string
      overdueCount: number
      overdueAmount: string
      paidMtd: string
      draftCount: number
    }
    invoices: FinanceInvoiceItem[]
  }
}) {
  const kpis = [
    { label: "Outstanding", value: data.invoicesKpi.outstanding, valueColor: colors.amber },
    {
      label: "Overdue",
      value:
        data.invoicesKpi.overdueCount > 0
          ? `${data.invoicesKpi.overdueCount} · ${data.invoicesKpi.overdueAmount}`
          : "—",
      valueColor: data.invoicesKpi.overdueCount > 0 ? colors.red : undefined,
    },
    { label: "Paid MTD", value: data.invoicesKpi.paidMtd, valueColor: colors.green },
    { label: "Drafts", value: String(data.invoicesKpi.draftCount) },
  ]

  return (
    <View style={styles.segContent}>
      <KpiStrip items={kpis} />
      {data.invoices.length > 0 ? (
        <>
          <Text style={styles.listTitle}>Invoices</Text>
          <GlassCard style={styles.listCard}>
            {data.invoices.map((inv, i) => (
              <View key={inv.id}>
                {i > 0 && <View style={styles.divider} />}
                <InvoiceRow item={inv} />
              </View>
            ))}
          </GlassCard>
        </>
      ) : (
        <GlassCard style={styles.emptyCard}>
          <Text style={styles.emptyText}>No invoices found</Text>
        </GlassCard>
      )}
    </View>
  )
}

// ─── Reports Content ──────────────────────────────────────────────────────────

const REPORT_TILES = [
  { icon: "≡", label: "P&L", desc: "Profit & Loss" },
  { icon: "⟁", label: "Cash Flow", desc: "Inflows & Outflows" },
  { icon: "◩", label: "Tax", desc: "VAT & Declarations" },
  { icon: "◎", label: "Forecast", desc: "Revenue Forecast" },
]

function ReportsContent() {
  return (
    <View style={styles.segContent}>
      <View style={styles.reportGrid}>
        {REPORT_TILES.map((t) => (
          <GlassCard key={t.label} style={styles.reportTile}>
            <Text style={styles.reportIcon}>{t.icon}</Text>
            <Text style={styles.reportLabel}>{t.label}</Text>
            <Text style={styles.reportDesc}>{t.desc}</Text>
          </GlassCard>
        ))}
      </View>
      <GlassCard style={styles.moduleNote}>
        <Text style={styles.moduleNoteText}>
          Full reporting module with P&L statements, balance sheets, cash flow analysis, and
          AI-powered forecasting is coming in a future release.
        </Text>
      </GlassCard>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FinanceScreen() {
  const insets = useSafeAreaInsets()
  const [seg, setSeg] = useState<Segment>("Revenue")
  const { data, isLoading, isError, refetch, isFetching } = useFinance()

  const headerH = insets.top + 52
  const segH = 48

  return (
    <View style={styles.root}>
      {/* Fixed header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Finance</Text>
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
            <Text style={styles.errorText}>Failed to load finance data</Text>
            <Pressable onPress={() => refetch()} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : data ? (
          seg === "Revenue" ? (
            <RevenueContent data={data} />
          ) : seg === "Invoices" ? (
            <InvoicesContent data={data} />
          ) : seg === "Expenses" ? (
            <Placeholder label="Expenses" />
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
  headerTitle: { ...type.largeTitle, color: colors.text1 },

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
  segBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radius.md,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  segBtnActive: { backgroundColor: "rgba(255,255,255,0.12)" },
  segLabel: { ...type.footnote, color: colors.text3 },
  segLabelActive: { color: colors.text1 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.base },

  // Segment content
  segContent: { gap: 14 },

  // KPI strip
  kpiStrip: { gap: 8, paddingRight: 4 },
  kpiCard: { padding: 12, minWidth: 100, gap: 4 },
  kpiValue: { ...type.title3, color: colors.text1 },
  kpiLabel: { ...type.caption1, color: colors.text3 },

  // Revenue chart
  chartCard: { padding: 16, gap: 12 },
  chartTitle: { ...type.subhead, color: colors.text2 },
  chartBars: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 88 },
  barCol: { flex: 1, alignItems: "center", gap: 6 },
  barTrack: { flex: 1, justifyContent: "flex-end", width: "100%" },
  bar: { width: "100%", borderRadius: 3 },
  barDefault: { backgroundColor: "rgba(255,255,255,0.18)" },
  barToday: { backgroundColor: colors.text1 },
  barLabel: { ...type.caption2, color: colors.text3 },
  barLabelToday: { color: colors.text1 },
  chartFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  chartFooterLabel: { ...type.footnote, color: colors.text3 },
  chartFooterValue: { ...type.footnote, color: colors.text2 },

  // Rows
  listTitle: { ...type.subhead, color: colors.text2, marginBottom: -6 },
  listCard: { padding: 0, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { ...type.body, color: colors.text1 },
  rowSub: { ...type.caption1, color: colors.text3 },
  rowAmount: { ...type.subhead, color: colors.text1 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 14 },

  // Invoice row
  invoiceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  invoiceRight: { alignItems: "flex-end", gap: 4 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { ...type.caption2, fontWeight: "600" },

  // Reports
  reportGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  reportTile: { width: "47.5%", padding: spacing.base, gap: 6, alignItems: "flex-start" },
  reportIcon: { fontSize: 22, color: colors.text2 },
  reportLabel: { ...type.headline, color: colors.text1 },
  reportDesc: { ...type.caption1, color: colors.text3 },
  moduleNote: { padding: 14 },
  moduleNoteText: { ...type.footnote, color: colors.text3, lineHeight: 18 },

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
  emptyCard: { padding: 24, alignItems: "center" },
  emptyText: { ...type.body, color: colors.text3 },
  placeholder: { padding: 32, alignItems: "center", gap: 8 },
  placeholderIcon: { fontSize: 28, color: colors.text3 },
  placeholderTitle: { ...type.headline, color: colors.text2 },
  placeholderSub: { ...type.footnote, color: colors.text3 },
})
