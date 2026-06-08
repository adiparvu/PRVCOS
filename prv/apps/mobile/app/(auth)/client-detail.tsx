import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useClientDetail } from "@/hooks/useClientDetail"
import { colors, radius, spacing } from "@/tokens"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; bg: string; fg: string; border: string }> = {
  active: {
    label: "Active",
    bg: "rgba(48,209,88,0.12)",
    fg: colors.green,
    border: "rgba(48,209,88,0.25)",
  },
  prospect: {
    label: "Prospect",
    bg: "rgba(255,214,10,0.10)",
    fg: colors.amber,
    border: "rgba(255,214,10,0.22)",
  },
  inactive: { label: "Inactive", bg: colors.glass1, fg: colors.text3, border: colors.border },
  archived: { label: "Archived", bg: colors.glass1, fg: colors.text3, border: colors.border },
}

const TYPE_MAP: Record<string, { label: string; bg: string; fg: string; border: string }> = {
  business: {
    label: "Business",
    bg: "rgba(100,210,255,0.08)",
    fg: "#64d2ff",
    border: "rgba(100,210,255,0.18)",
  },
  individual: {
    label: "Individual",
    bg: "rgba(191,90,242,0.10)",
    fg: "#bf5af2",
    border: "rgba(191,90,242,0.22)",
  },
}

const PROJECT_DOT: Record<string, string> = {
  in_progress: colors.green,
  active: colors.green,
  confirmed: "#64d2ff",
  pending: colors.text3,
  planning: colors.text3,
  on_hold: colors.amber,
}

const INVOICE_BADGE: Record<string, { bg: string; text: string }> = {
  paid: { bg: "rgba(48,209,88,0.15)", text: colors.green },
  sent: { bg: "rgba(255,214,10,0.13)", text: colors.amber },
  overdue: { bg: "rgba(255,69,58,0.12)", text: colors.red },
  draft: { bg: "rgba(255,255,255,0.07)", text: colors.text3 },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
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

function ContactBtn({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: string
  label: string
  onPress?: () => void
  disabled?: boolean
}) {
  return (
    <TouchableOpacity
      style={[s.contactBtn, disabled && s.contactDisabled]}
      activeOpacity={disabled ? 1 : 0.7}
      onPress={disabled ? undefined : onPress}
    >
      <View style={s.contactBtnShine} pointerEvents="none" />
      <Text style={s.contactIcon}>{icon}</Text>
      <Text style={s.contactLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

function InfoRow({
  icon,
  label,
  value,
  chevron,
  muted,
  onPress,
}: {
  icon: string
  label: string
  value: string
  chevron?: boolean
  muted?: boolean
  onPress?: () => void
}) {
  const inner = (
    <>
      <View style={s.infoIcon}>
        <Text style={s.infoIconText}>{icon}</Text>
      </View>
      <View style={s.infoContent}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={[s.infoValue, muted && s.infoValueMuted]}>{value}</Text>
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

export default function ClientDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data, isLoading, isError, refetch } = useClientDetail(id ?? "")

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
        <Text style={s.errText}>Could not load client.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => void refetch()} activeOpacity={0.8}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const { client, assignedTo, kpis, projects, invoices } = data
  const status = STATUS_MAP[client.status] ?? STATUS_MAP.inactive!
  const type = TYPE_MAP[client.type] ?? TYPE_MAP.business!

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

  const fmtSince = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { month: "short", year: "numeric" })

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.navbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Client</Text>
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
            <View style={s.avatar}>
              <Text style={s.avatarText}>{getInitials(client.name)}</Text>
            </View>
            <View style={s.heroInfo}>
              <Text style={s.heroName}>{client.name}</Text>
              {client.website ? (
                <Text style={s.heroSub} numberOfLines={1}>
                  {client.website.replace(/^https?:\/\//, "")}
                </Text>
              ) : client.phone ? (
                <Text style={s.heroSub}>{client.phone}</Text>
              ) : client.email ? (
                <Text style={s.heroSub} numberOfLines={1}>
                  {client.email}
                </Text>
              ) : null}
              <View style={s.badgeRow}>
                <View style={[s.badge, { backgroundColor: type.bg, borderColor: type.border }]}>
                  <Text style={[s.badgeText, { color: type.fg }]}>{type.label}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: status.bg, borderColor: status.border }]}>
                  <Text style={[s.badgeText, { color: status.fg }]}>{status.label}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Contact strip */}
          <View style={s.contactStrip}>
            <ContactBtn
              icon="✉"
              label="Email"
              disabled={!client.email}
              onPress={() => client.email && void Linking.openURL(`mailto:${client.email}`)}
            />
            <ContactBtn
              icon="☎"
              label="Call"
              disabled={!client.phone}
              onPress={() => client.phone && void Linking.openURL(`tel:${client.phone}`)}
            />
            <ContactBtn
              icon="⊕"
              label="Website"
              disabled={!client.website}
              onPress={() => client.website && void Linking.openURL(client.website)}
            />
            <ContactBtn
              icon="◎"
              label="Map"
              disabled={!client.address && !client.city}
              onPress={() => {
                const q = [client.address, client.city, client.country].filter(Boolean).join(", ")
                void Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(q)}`)
              }}
            />
          </View>
        </View>

        {/* Quick actions */}
        <View style={s.quickRow}>
          {[
            { label: "Invoice", icon: "⊕" },
            { label: "Project", icon: "◎" },
            { label: "Note", icon: "≡" },
            { label: "More", icon: "···" },
          ].map((a) => (
            <TouchableOpacity key={a.label} style={s.quickBtn} activeOpacity={0.75}>
              <View style={s.quickShine} pointerEvents="none" />
              <Text style={s.quickIcon}>{a.icon}</Text>
              <Text style={s.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* KPI strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.kpiStrip}
        >
          <View style={s.kpiCard}>
            <View style={s.kpiShine} pointerEvents="none" />
            <Text style={s.kpiValue}>{kpis.totalBilled ?? "—"}</Text>
            <Text style={s.kpiLabel}>Total Billed</Text>
          </View>
          <View style={s.kpiCard}>
            <View style={s.kpiShine} pointerEvents="none" />
            <Text style={[s.kpiValue, kpis.openInvoicesCount > 0 ? s.kpiAmber : null]}>
              {kpis.openInvoicesCount}
            </Text>
            <Text style={s.kpiLabel}>Open Invoices</Text>
          </View>
          <View style={s.kpiCard}>
            <View style={s.kpiShine} pointerEvents="none" />
            <Text style={s.kpiValue}>{kpis.projectsCount}</Text>
            <Text style={s.kpiLabel}>Projects</Text>
          </View>
          <View style={s.kpiCard}>
            <View style={s.kpiShine} pointerEvents="none" />
            <Text style={s.kpiValue}>{fmtSince(client.createdAt)}</Text>
            <Text style={s.kpiLabel}>Client Since</Text>
          </View>
        </ScrollView>

        {/* Active Projects */}
        {projects.length > 0 ? (
          <>
            <SectionHead title="Active Projects" count={projects.length} />
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              {projects.map((p, i) => (
                <TouchableOpacity
                  key={p.id}
                  style={[s.projRow, i === projects.length - 1 && s.rowLast]}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({ pathname: "/(auth)/project-detail", params: { id: p.id } })
                  }
                >
                  <View
                    style={[s.projDot, { backgroundColor: PROJECT_DOT[p.status] ?? colors.text3 }]}
                  />
                  <View style={s.projInfo}>
                    <Text style={s.projName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={s.projSub}>
                      {p.statusLabel}
                      {p.dueDate
                        ? ` · Due ${new Date(p.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                        : ""}
                    </Text>
                  </View>
                  {p.budget ? <Text style={s.projBudget}>{p.budget}</Text> : null}
                  <Text style={s.projChevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}

        {/* Recent Invoices */}
        <SectionHead
          title="Recent Invoices"
          count={invoices.length > 0 ? invoices.length : undefined}
        />
        {invoices.length > 0 ? (
          <View style={s.card}>
            <View style={s.cardShine} pointerEvents="none" />
            {invoices.map((inv, i) => {
              const badge = INVOICE_BADGE[inv.status] ?? INVOICE_BADGE.draft!
              return (
                <TouchableOpacity
                  key={inv.id}
                  style={[s.invRow, i === invoices.length - 1 && s.rowLast]}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({ pathname: "/(auth)/invoice-detail", params: { id: inv.id } })
                  }
                >
                  <View style={s.invInfo}>
                    <Text style={s.invNumber}>{inv.invoiceNumber}</Text>
                    <Text style={s.invSub}>Issued {fmtDate(inv.issueDate)}</Text>
                  </View>
                  <View style={s.invRight}>
                    <Text style={s.invAmount}>{inv.total}</Text>
                    <View style={[s.invBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[s.invBadgeText, { color: badge.text }]}>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        ) : (
          <View style={[s.card, s.emptyCard]}>
            <Text style={s.emptyText}>No invoices yet</Text>
          </View>
        )}

        {/* Details */}
        <SectionHead title="Details" />
        <View style={s.card}>
          <View style={s.cardShine} pointerEvents="none" />
          {client.address ? (
            <InfoRow
              icon="⊟"
              label="Address"
              value={`${client.address}${client.postalCode ? `, ${client.postalCode}` : ""}`}
              chevron
              onPress={() => {
                const q = [client.address, client.city, client.country].filter(Boolean).join(", ")
                void Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(q!)}`)
              }}
            />
          ) : null}
          {client.city || client.country ? (
            <InfoRow
              icon="⊙"
              label="City · Country"
              value={[client.city, client.country].filter(Boolean).join(" · ")}
            />
          ) : null}
          {client.vatNumber ? (
            <InfoRow icon="◈" label="VAT Number" value={client.vatNumber} />
          ) : null}
          {client.registrationNumber ? (
            <InfoRow icon="◇" label="Reg. Number" value={client.registrationNumber} />
          ) : null}
          {assignedTo ? (
            <InfoRow
              icon="⊙"
              label="Account Manager"
              value={assignedTo.name}
              chevron
              onPress={() =>
                router.push({ pathname: "/(auth)/employee-detail", params: { id: assignedTo.id } })
              }
            />
          ) : (
            <InfoRow icon="⊙" label="Account Manager" value="Unassigned" muted />
          )}
          {!client.vatNumber && !client.registrationNumber && !client.address && !assignedTo ? (
            <InfoRow icon="◴" label="Client Since" value={fmtSince(client.createdAt)} />
          ) : null}
          {client.notes ? <InfoRow icon="≡" label="Notes" value={client.notes} /> : null}
        </View>

        {/* Tags */}
        {client.tags.length > 0 ? (
          <View style={s.tagsWrap}>
            {client.tags.map((tag) => (
              <View key={tag} style={s.tag}>
                <Text style={s.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
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
  heroTop: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 22, fontWeight: "700", color: colors.text1, letterSpacing: -1 },
  heroInfo: { flex: 1, minWidth: 0 },
  heroName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text1,
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  heroSub: { fontSize: 13, color: colors.text3, marginTop: 3 },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.02 },

  // Contact strip
  contactStrip: { flexDirection: "row", gap: 8 },
  contactBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    overflow: "hidden",
  },
  contactBtnShine: {
    position: "absolute",
    top: 0,
    left: 6,
    right: 6,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  contactDisabled: { opacity: 0.35 },
  contactIcon: { fontSize: 16, color: colors.text2 },
  contactLabel: { fontSize: 10, fontWeight: "500", color: colors.text3 },

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
  quickIcon: { fontSize: 17, color: colors.text2 },
  quickLabel: { fontSize: 11, fontWeight: "500", color: colors.text3 },

  // KPI strip
  kpiStrip: { gap: 8, paddingRight: 4 },
  kpiCard: {
    padding: 12,
    minWidth: 90,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    borderRadius: 14,
    overflow: "hidden",
  },
  kpiShine: {
    position: "absolute",
    top: 0,
    left: 8,
    right: 8,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  kpiValue: { fontSize: 16, fontWeight: "700", color: colors.text1, letterSpacing: -0.3 },
  kpiAmber: { color: colors.amber },
  kpiLabel: { fontSize: 10, color: colors.text3, marginTop: 3 },

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
  rowLast: { borderBottomWidth: 0 },

  // Project rows
  projRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: 10,
  },
  projDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  projInfo: { flex: 1, minWidth: 0 },
  projName: { fontSize: 13, fontWeight: "600", color: colors.text1 },
  projSub: { fontSize: 11, color: colors.text3, marginTop: 2 },
  projBudget: { fontSize: 13, fontWeight: "600", color: colors.text2, flexShrink: 0 },
  projChevron: { fontSize: 16, color: "rgba(255,255,255,0.20)" },

  // Invoice rows
  invRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: 10,
  },
  invInfo: { flex: 1, minWidth: 0 },
  invNumber: { fontSize: 13, fontWeight: "600", color: colors.text1 },
  invSub: { fontSize: 11, color: colors.text3, marginTop: 2 },
  invRight: { alignItems: "flex-end", gap: 4 },
  invAmount: { fontSize: 13, fontWeight: "600", color: colors.text1 },
  invBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.sm },
  invBadgeText: { fontSize: 10, fontWeight: "700" },

  // Info rows
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: 12,
  },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoIconText: { fontSize: 12, color: colors.text2 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 10, color: colors.text3, marginBottom: 1 },
  infoValue: { fontSize: 13, fontWeight: "600", color: colors.text1 },
  infoValueMuted: { color: colors.text3, fontWeight: "500" },
  chevron: { fontSize: 16, color: "rgba(255,255,255,0.20)" },

  // Tags
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    paddingBottom: spacing.xs,
  },
  tag: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: radius.pill,
  },
  tagText: { fontSize: 11, fontWeight: "500", color: colors.text3 },

  // Empty
  emptyCard: { padding: 22, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 13, color: colors.text3 },

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
