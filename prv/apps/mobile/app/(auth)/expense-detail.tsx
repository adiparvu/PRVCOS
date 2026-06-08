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
import { useExpenseDetail, useUpdateExpenseStatus } from "@/hooks/useFinanceDetail"
import { colors, radius, spacing } from "@/tokens"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; bg: string; fg: string; border: string }> = {
  draft: { label: "Draft", bg: colors.glass1, fg: colors.text3, border: colors.border },
  submitted: {
    label: "Submitted",
    bg: "rgba(255,214,10,0.10)",
    fg: colors.amber,
    border: "rgba(255,214,10,0.22)",
  },
  approved: {
    label: "Approved",
    bg: "rgba(48,209,88,0.12)",
    fg: colors.green,
    border: "rgba(48,209,88,0.25)",
  },
  rejected: {
    label: "Rejected",
    bg: "rgba(255,69,58,0.10)",
    fg: colors.red,
    border: "rgba(255,69,58,0.22)",
  },
  paid: {
    label: "Paid",
    bg: "rgba(48,209,88,0.12)",
    fg: colors.green,
    border: "rgba(48,209,88,0.25)",
  },
}

const CATEGORY_ICONS: Record<string, string> = {
  materials: "◈",
  labor: "◐",
  equipment: "⊟",
  transport: "◎",
  rent: "⊙",
  utilities: "◉",
  marketing: "◇",
  salaries: "◐",
  subscriptions: "⊕",
  other: "◫",
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHead({ title }: { title: string }) {
  return (
    <View style={s.sectionHead}>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  )
}

function InfoRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: string
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIcon}>
        <Text style={s.infoIconText}>{icon}</Text>
      </View>
      <View style={s.infoContent}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={[s.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      </View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExpenseDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data, isLoading, isError, refetch } = useExpenseDetail(id ?? "")
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateExpenseStatus(id ?? "")

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
        <Text style={s.errText}>Could not load expense.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => void refetch()} activeOpacity={0.8}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const { expense, submittedBy } = data
  const status = STATUS_MAP[expense.status] ?? STATUS_MAP.draft!
  const catIcon = CATEGORY_ICONS[expense.category] ?? "◫"
  const catLabel = expense.category.charAt(0).toUpperCase() + expense.category.slice(1)

  const quickActions = [
    expense.status === "draft"
      ? { label: "Submit", icon: "⊕", onPress: () => updateStatus("submitted"), active: true }
      : null,
    expense.status === "submitted"
      ? { label: "Approve", icon: "◉", onPress: () => updateStatus("approved"), active: true }
      : null,
    expense.status === "submitted"
      ? {
          label: "Reject",
          icon: "⊗",
          onPress: () => updateStatus("rejected"),
          active: true,
          danger: true,
        }
      : null,
    expense.status === "approved"
      ? { label: "Mark Paid", icon: "◎", onPress: () => updateStatus("paid"), active: true }
      : null,
  ].filter(Boolean) as {
    label: string
    icon: string
    onPress: () => void
    active: boolean
    danger?: boolean
  }[]

  const fmtDate = (iso: string) =>
    new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.navbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Expense</Text>
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
            <View style={s.heroLeft}>
              <View style={s.catBadge}>
                <Text style={s.catBadgeIcon}>{catIcon}</Text>
              </View>
              <View>
                <Text style={s.heroTitle} numberOfLines={2}>
                  {expense.title}
                </Text>
                <Text style={s.heroSub}>{catLabel}</Text>
              </View>
            </View>
            <View
              style={[s.statusBadge, { backgroundColor: status.bg, borderColor: status.border }]}
            >
              <Text style={[s.statusBadgeText, { color: status.fg }]}>{status.label}</Text>
            </View>
          </View>

          <View style={s.amountBlock}>
            <Text style={s.amountBig}>{expense.amountFormatted}</Text>
            <Text style={s.amountLabel}>{fmtDate(expense.date)}</Text>
          </View>
        </View>

        {/* Quick actions */}
        {quickActions.length > 0 && (
          <View style={s.quickRow}>
            {quickActions.map((a) => (
              <TouchableOpacity
                key={a.label}
                style={[
                  s.quickBtn,
                  a.active && !a.danger && s.quickBtnActive,
                  a.danger && s.quickBtnDanger,
                ]}
                activeOpacity={0.75}
                onPress={a.onPress}
                disabled={isUpdating}
              >
                <View style={s.quickShine} pointerEvents="none" />
                {isUpdating ? (
                  <ActivityIndicator size="small" color={colors.text2} />
                ) : (
                  <Text
                    style={[
                      s.quickIcon,
                      a.active && !a.danger && s.quickIconActive,
                      a.danger && s.quickIconDanger,
                    ]}
                  >
                    {a.icon}
                  </Text>
                )}
                <Text
                  style={[
                    s.quickLabel,
                    a.active && !a.danger && s.quickLabelActive,
                    a.danger && s.quickLabelDanger,
                  ]}
                >
                  {a.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Details */}
        <SectionHead title="Details" />
        <View style={s.card}>
          <View style={s.cardShine} pointerEvents="none" />
          <InfoRow icon={catIcon} label="Category" value={catLabel} />
          <InfoRow icon="⊗" label="Currency" value={expense.currency} />
          <InfoRow icon="◴" label="Date" value={fmtDate(expense.date)} />
          {submittedBy ? <InfoRow icon="⊙" label="Submitted by" value={submittedBy.name} /> : null}
          {expense.notes ? <InfoRow icon="≡" label="Notes" value={expense.notes} /> : null}
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
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  heroLeft: { flexDirection: "row", alignItems: "flex-start", gap: 10, flex: 1 },
  catBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  catBadgeIcon: { fontSize: 18, color: colors.text2 },
  heroTitle: { fontSize: 17, fontWeight: "700", color: colors.text1, letterSpacing: -0.3, flex: 1 },
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
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    paddingTop: spacing.base,
  },
  amountBig: { fontSize: 34, fontWeight: "700", letterSpacing: -1, color: colors.text1 },
  amountLabel: { fontSize: 12, color: colors.text3, marginTop: 3 },

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
  quickBtnDanger: {
    backgroundColor: "rgba(255,69,58,0.08)",
    borderColor: "rgba(255,69,58,0.20)",
  },
  quickIcon: { fontSize: 17, color: colors.text2 },
  quickIconActive: { color: colors.text1 },
  quickIconDanger: { color: colors.red },
  quickLabel: { fontSize: 11, fontWeight: "500", color: colors.text3 },
  quickLabelActive: { color: colors.text2, fontWeight: "600" },
  quickLabelDanger: { color: colors.red, fontWeight: "600" },

  // Section head
  sectionHead: {
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
