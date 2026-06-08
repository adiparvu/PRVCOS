import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useInvoiceDetail, useUpdateInvoiceStatus } from "@/hooks/useFinanceDetail"
import { colors, radius, spacing } from "@/tokens"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; bg: string; fg: string; border: string }> = {
  draft: { label: "Draft", bg: colors.glass1, fg: colors.text3, border: colors.border },
  sent: {
    label: "Sent",
    bg: "rgba(100,210,255,0.10)",
    fg: "#64d2ff",
    border: "rgba(100,210,255,0.22)",
  },
  paid: {
    label: "Paid",
    bg: "rgba(48,209,88,0.12)",
    fg: colors.green,
    border: "rgba(48,209,88,0.25)",
  },
  overdue: {
    label: "Overdue",
    bg: "rgba(255,69,58,0.10)",
    fg: colors.red,
    border: "rgba(255,69,58,0.22)",
  },
  cancelled: { label: "Cancelled", bg: colors.glass1, fg: colors.text3, border: colors.border },
  refunded: {
    label: "Refunded",
    bg: "rgba(255,159,10,0.10)",
    fg: colors.amber,
    border: "rgba(255,159,10,0.22)",
  },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHead({ title, count }: { title: string; count?: number }) {
  return (
    <View style={s.sectionHead}>
      <Text style={s.sectionTitle}>{title}</Text>
      {count !== undefined ? <Text style={s.sectionCount}>{count}</Text> : null}
    </View>
  )
}

function MetaPill({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <View style={s.metaPill}>
      <View style={s.pillShine} pointerEvents="none" />
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={[s.metaValue, valueColor ? { color: valueColor } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

function LineItem({
  index,
  item,
  last,
}: {
  index: number
  item: {
    description: string
    quantity: number
    unit: string
    unitPriceFormatted: string
    vatRate: number
    totalFormatted: string
  }
  last: boolean
}) {
  return (
    <View style={[s.lineRow, last ? s.rowLast : null]}>
      <View style={s.lineNum}>
        <Text style={s.lineNumText}>{index + 1}</Text>
      </View>
      <View style={s.lineInfo}>
        <Text style={s.lineDesc} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={s.lineSub}>
          {item.quantity} {item.unit} × {item.unitPriceFormatted} · VAT {item.vatRate}%
        </Text>
      </View>
      <Text style={s.lineTotal}>{item.totalFormatted}</Text>
    </View>
  )
}

function InfoRow({
  icon,
  label,
  value,
  chevron,
  onPress,
}: {
  icon: string
  label: string
  value: string
  chevron?: boolean
  onPress?: () => void
}) {
  const inner = (
    <>
      <View style={s.infoIcon}>
        <Text style={s.infoIconText}>{icon}</Text>
      </View>
      <View style={s.infoContent}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
      {chevron ? <Text style={s.chevron}>›</Text> : null}
    </>
  )

  if (onPress) {
    return (
      <TouchableOpacity style={s.infoRow} activeOpacity={0.7} onPress={onPress}>
        {inner}
      </TouchableOpacity>
    )
  }
  return <View style={s.infoRow}>{inner}</View>
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function InvoiceDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data, isLoading, isError, refetch } = useInvoiceDetail(id ?? "")
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateInvoiceStatus(id ?? "")

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
        <Text style={s.errText}>Could not load invoice.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => void refetch()} activeOpacity={0.8}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const { invoice, client, project, createdBy, items } = data
  const status = STATUS_MAP[invoice.status] ?? STATUS_MAP.draft!

  const quickActions = [
    invoice.status === "draft"
      ? {
          label: "Send",
          icon: "✉",
          onPress: () => updateStatus("sent"),
          active: true,
        }
      : null,
    invoice.status === "sent" || invoice.status === "overdue"
      ? {
          label: "Mark Paid",
          icon: "◉",
          onPress: () => updateStatus("paid"),
          active: true,
        }
      : null,
    { label: "Download", icon: "⊕", onPress: undefined, active: false },
    { label: "Duplicate", icon: "◈", onPress: undefined, active: false },
  ].filter(Boolean) as {
    label: string
    icon: string
    onPress: (() => void) | undefined
    active: boolean
  }[]

  const fmtDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : null

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.navbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Invoice</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroShine} pointerEvents="none" />
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroNumber}>{invoice.invoiceNumber}</Text>
              <Text style={s.heroSub}>Issued {fmtDate(invoice.issueDate)}</Text>
            </View>
            <View
              style={[s.statusBadge, { backgroundColor: status.bg, borderColor: status.border }]}
            >
              <Text style={[s.statusBadgeText, { color: status.fg }]}>{status.label}</Text>
            </View>
          </View>

          <View style={s.amountBlock}>
            <Text style={s.amountBig}>{invoice.total}</Text>
            <Text style={s.amountLabel}>Total incl. VAT</Text>
          </View>

          <View style={s.metaRow}>
            {client ? <MetaPill label="Client" value={client.name} /> : null}
            {invoice.dueDate ? <MetaPill label="Due" value={fmtDate(invoice.dueDate)!} /> : null}
            {invoice.paidAt ? (
              <MetaPill label="Paid" value={fmtDate(invoice.paidAt)!} valueColor={colors.green} />
            ) : null}
          </View>
        </View>

        {/* Quick actions */}
        <View style={s.quickRow}>
          {quickActions.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={[s.quickBtn, a.active && s.quickBtnActive]}
              activeOpacity={0.75}
              onPress={a.onPress}
              disabled={isUpdating || !a.onPress}
            >
              <View style={s.quickShine} pointerEvents="none" />
              {isUpdating && a.active ? (
                <ActivityIndicator size="small" color={colors.text2} />
              ) : (
                <Text style={[s.quickIcon, a.active && s.quickIconActive]}>{a.icon}</Text>
              )}
              <Text style={[s.quickLabel, a.active && s.quickLabelActive]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Line items */}
        {items.length > 0 ? (
          <>
            <SectionHead title="Line Items" count={items.length} />
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              {items.map((item, i) => (
                <LineItem key={item.id} index={i} item={item} last={i === items.length - 1} />
              ))}
            </View>
          </>
        ) : null}

        {/* Totals */}
        <View style={s.totalsCard}>
          <View style={s.cardShine} pointerEvents="none" />
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Subtotal</Text>
            <Text style={s.totalsValue}>{invoice.subtotal}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>VAT</Text>
            <Text style={s.totalsValue}>{invoice.vatAmount}</Text>
          </View>
          <View style={[s.totalsRow, s.totalsDivider]}>
            <Text style={s.totalsTotalLabel}>Total</Text>
            <Text style={s.totalsTotalValue}>{invoice.total}</Text>
          </View>
        </View>

        {/* Details */}
        <SectionHead title="Details" />
        <View style={s.card}>
          <View style={s.cardShine} pointerEvents="none" />
          {project ? (
            <InfoRow
              icon="◎"
              label="Project"
              value={project.name}
              chevron
              onPress={() =>
                router.push({ pathname: "/(auth)/project-detail", params: { id: project.id } })
              }
            />
          ) : null}
          {client ? (
            <InfoRow
              icon="◇"
              label="Client"
              value={client.name}
              chevron
              onPress={() =>
                router.push({ pathname: "/(auth)/client-detail", params: { id: client.id } })
              }
            />
          ) : null}
          {createdBy ? <InfoRow icon="⊙" label="Created by" value={createdBy.name} /> : null}
          <InfoRow icon="⊗" label="Currency" value={invoice.currency} />
          {invoice.notes ? <InfoRow icon="≡" label="Notes" value={invoice.notes} /> : null}
        </View>
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  // Hero
  hero: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: spacing.base,
    overflow: "hidden",
    gap: spacing.base,
  },
  heroShine: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.20)",
  },
  heroTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  heroNumber: { fontSize: 20, fontWeight: "700", color: colors.text1, letterSpacing: -0.4 },
  heroSub: { fontSize: 13, color: colors.text3, marginTop: 3 },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.02 },

  amountBlock: {
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    paddingBottom: spacing.base,
  },
  amountBig: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -1,
    color: colors.text1,
  },
  amountLabel: { fontSize: 12, color: colors.text3, marginTop: 3 },

  metaRow: { flexDirection: "row", gap: spacing.sm },
  metaPill: {
    flex: 1,
    minWidth: 0,
    padding: 9,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  pillShine: {
    position: "absolute",
    top: 0,
    left: 6,
    right: 6,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  metaLabel: {
    fontSize: 10,
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.05,
    marginBottom: 2,
  },
  metaValue: { fontSize: 12, fontWeight: "600", color: colors.text2 },

  // Quick actions
  quickRow: { flexDirection: "row", gap: spacing.sm },
  quickBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    gap: 6,
    overflow: "hidden",
  },
  quickShine: {
    position: "absolute",
    top: 0,
    left: 8,
    right: 8,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  quickBtnActive: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.18)",
  },
  quickIcon: { fontSize: 17, color: colors.text2 },
  quickIconActive: { color: colors.text1 },
  quickLabel: { fontSize: 11, fontWeight: "500", color: colors.text3 },
  quickLabelActive: { color: colors.text2, fontWeight: "600" },

  // Section head
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
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
  sectionCount: { fontSize: 12, color: colors.text3, marginLeft: "auto" as any },

  // Glass card
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  cardShine: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  // Line items
  lineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: 10,
  },
  rowLast: { borderBottomWidth: 0 },
  lineNum: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  lineNumText: { fontSize: 11, fontWeight: "700", color: colors.text3 },
  lineInfo: { flex: 1, minWidth: 0 },
  lineDesc: { fontSize: 13, fontWeight: "600", color: colors.text1 },
  lineSub: { fontSize: 11, color: colors.text3, marginTop: 2 },
  lineTotal: { fontSize: 14, fontWeight: "700", color: colors.text1, flexShrink: 0, paddingTop: 2 },

  // Totals
  totalsCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: spacing.xs,
    position: "relative",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  totalsDivider: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
    borderBottomWidth: 0,
    paddingVertical: 13,
  },
  totalsLabel: { fontSize: 13, color: colors.text3 },
  totalsValue: { fontSize: 13, fontWeight: "600", color: colors.text2 },
  totalsTotalLabel: { fontSize: 15, fontWeight: "700", color: colors.text1 },
  totalsTotalValue: { fontSize: 17, fontWeight: "700", color: colors.text1, letterSpacing: -0.3 },

  // Info rows
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoIconText: { fontSize: 13, color: colors.text2 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: colors.text3, marginBottom: 2 },
  infoValue: { fontSize: 13, fontWeight: "600", color: colors.text1 },
  chevron: { fontSize: 18, color: "rgba(255,255,255,0.20)" },

  // Error
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
