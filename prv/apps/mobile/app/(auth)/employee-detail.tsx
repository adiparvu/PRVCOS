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
import { useEmployeeDetail, getEmployeeInitials, formatActivityTime } from "@/hooks/useEmployees"
import { colors, radius, spacing } from "@/tokens"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; bg: string; fg: string; border: string }> = {
  active: {
    label: "Active",
    bg: "rgba(48,209,88,0.12)",
    fg: colors.green,
    border: "rgba(48,209,88,0.25)",
  },
  inactive: { label: "Inactive", bg: colors.glass1, fg: colors.text3, border: colors.border },
  suspended: {
    label: "Suspended",
    bg: "rgba(255,69,58,0.10)",
    fg: colors.red,
    border: "rgba(255,69,58,0.22)",
  },
  onboarding: {
    label: "Onboarding",
    bg: "rgba(255,159,10,0.10)",
    fg: colors.amber,
    border: "rgba(255,159,10,0.22)",
  },
  offboarded: { label: "Offboarded", bg: colors.glass1, fg: colors.text3, border: colors.border },
}

const SEC_LEVEL_MAP: Record<string, { label: string; bg: string; fg: string; border: string }> = {
  L2: { label: "L2", bg: colors.glass1, fg: colors.text3, border: colors.border },
  L3: {
    label: "L3",
    bg: "rgba(100,210,255,0.10)",
    fg: "#64d2ff",
    border: "rgba(100,210,255,0.22)",
  },
  L4: {
    label: "L4",
    bg: "rgba(255,159,10,0.10)",
    fg: colors.amber,
    border: "rgba(255,159,10,0.22)",
  },
  L5: {
    label: "L5",
    bg: "rgba(255,69,58,0.10)",
    fg: colors.red,
    border: "rgba(255,69,58,0.22)",
  },
}

const PROJECT_STATUS_COLOR: Record<string, string> = {
  active: colors.green,
  on_hold: colors.amber,
  draft: "rgba(255,255,255,0.3)",
}

const MEMBER_ROLE: Record<string, string> = {
  owner: "OWNER",
  manager: "MANAGER",
  worker: "MEMBER",
  observer: "OBSERVER",
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

function DetailRow({
  icon,
  label,
  value,
  chip,
  chevron,
}: {
  icon: string
  label: string
  value: string
  chip?: { text: string; bg: string; fg: string; border: string }
  chevron?: boolean
}) {
  return (
    <View style={s.detailRow}>
      <View style={s.detailIcon}>
        <Text style={s.detailIconText}>{icon}</Text>
      </View>
      <View style={s.detailContent}>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={s.detailValue}>{value}</Text>
      </View>
      {chip ? (
        <View style={[s.detailChip, { backgroundColor: chip.bg, borderColor: chip.border }]}>
          <Text style={[s.detailChipText, { color: chip.fg }]}>{chip.text}</Text>
        </View>
      ) : null}
      {chevron && !chip ? <Text style={s.chevron}>›</Text> : null}
    </View>
  )
}

function ProjectRow({
  item,
  last,
  onPress,
}: {
  item: { id: string; name: string; status: string; role: string; dueDate: string | null }
  last: boolean
  onPress: () => void
}) {
  const dotColor = PROJECT_STATUS_COLOR[item.status] ?? "rgba(255,255,255,0.3)"
  const isOwner = item.role === "owner"

  return (
    <TouchableOpacity
      style={[s.listRow, last ? s.rowLast : null]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={[s.projDot, { backgroundColor: dotColor }]} />
      <View style={s.rowInfo}>
        <Text style={s.rowTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={s.rowSub}>
          {item.status.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
          {item.dueDate
            ? ` · Due ${new Date(item.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
            : ""}
        </Text>
      </View>
      <View style={[s.roleTag, isOwner ? s.roleTagOwner : null]}>
        <Text style={[s.roleTagText, isOwner ? { color: colors.text1 } : null]}>
          {MEMBER_ROLE[item.role] ?? item.role.toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

function ReportRow({
  item,
  last,
  onPress,
}: {
  item: { id: string; name: string; jobTitle: string | null; role: string; isOnline: boolean }
  last: boolean
  onPress: () => void
}) {
  const parts = item.name.trim().split(" ")
  const initials = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase()

  return (
    <TouchableOpacity
      style={[s.listRow, last ? s.rowLast : null]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={s.repAvatar}>
        <Text style={s.repAvatarText}>{initials}</Text>
        <View
          style={[
            s.onlineDot,
            { backgroundColor: item.isOnline ? colors.green : "rgba(255,255,255,0.22)" },
          ]}
        />
      </View>
      <View style={s.rowInfo}>
        <Text style={s.rowTitle} numberOfLines={1}>
          {item.name}
        </Text>
        {item.jobTitle ? (
          <Text style={s.rowSub} numberOfLines={1}>
            {item.jobTitle}
          </Text>
        ) : null}
      </View>
      <Text style={s.chevron}>›</Text>
    </TouchableOpacity>
  )
}

function ActivityRow({
  item,
  last,
}: {
  item: { id: string; title: string; body: string | null; type: string; createdAt: string }
  last: boolean
}) {
  const iconMap: Record<string, string> = {
    info: "◎",
    success: "◉",
    warning: "◈",
    error: "⊗",
  }
  return (
    <View style={[s.actRow, last ? s.rowLast : null]}>
      <View style={s.actIcon}>
        <Text style={s.actIconText}>{iconMap[item.type] ?? "◎"}</Text>
      </View>
      <View style={s.rowInfo}>
        <Text style={s.rowTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.body ? (
          <Text style={s.rowSub} numberOfLines={1}>
            {item.body}
          </Text>
        ) : null}
      </View>
      <Text style={s.actTime}>{formatActivityTime(item.createdAt)}</Text>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function EmployeeDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data, isLoading, isError, refetch } = useEmployeeDetail(id ?? "")

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
        <Text style={s.errText}>Could not load employee.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => void refetch()} activeOpacity={0.8}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const { employee, employment, directReports, projects, activity } = data
  const status = STATUS_MAP[employee.status] ?? STATUS_MAP.inactive!
  const secLevel = SEC_LEVEL_MAP[employee.securityLevel] ?? SEC_LEVEL_MAP.L2!
  const initials = getEmployeeInitials(employee.firstName, employee.lastName)

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Navbar */}
      <View style={s.navbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navTitle} numberOfLines={1}>
          Employee
        </Text>
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
            <View style={s.heroAvatarWrap}>
              <View style={s.heroAvatar}>
                <Text style={s.heroAvatarText}>{initials}</Text>
              </View>
              <View
                style={[
                  s.heroOnlineDot,
                  {
                    backgroundColor: employee.isOnline ? colors.green : "rgba(255,255,255,0.22)",
                  },
                ]}
              />
            </View>
            <View style={s.heroMeta}>
              <Text style={s.heroName} numberOfLines={1}>
                {employee.fullName}
              </Text>
              {employee.jobTitle ? (
                <Text style={s.heroTitle} numberOfLines={1}>
                  {employee.jobTitle}
                </Text>
              ) : null}
              <View style={s.heroBadgeRow}>
                <View
                  style={[
                    s.statusBadge,
                    { backgroundColor: status.bg, borderColor: status.border },
                  ]}
                >
                  <Text style={[s.statusBadgeText, { color: status.fg }]}>{status.label}</Text>
                </View>
                <View style={s.roleBadge}>
                  <Text style={s.roleBadgeText}>{employee.role}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Contact strip */}
          <View style={s.contactStrip}>
            <TouchableOpacity style={s.contactBtn} activeOpacity={0.75}>
              <View style={s.contactBtnShine} pointerEvents="none" />
              <Text style={s.contactIcon}>✉</Text>
              <View style={s.contactTextWrap}>
                <Text style={s.contactLabel}>Email</Text>
                <Text style={s.contactValue} numberOfLines={1}>
                  {employee.email}
                </Text>
              </View>
            </TouchableOpacity>
            {employee.phone ? (
              <TouchableOpacity style={s.contactBtn} activeOpacity={0.75}>
                <View style={s.contactBtnShine} pointerEvents="none" />
                <Text style={s.contactIcon}>☎</Text>
                <View style={s.contactTextWrap}>
                  <Text style={s.contactLabel}>Phone</Text>
                  <Text style={s.contactValue} numberOfLines={1}>
                    {employee.phone}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Quick actions */}
        <View style={s.quickRow}>
          {[
            { label: "Message", icon: "✉" },
            { label: "Assign Task", icon: "◈" },
            { label: "Schedule", icon: "◎" },
            { label: "Report", icon: "◇" },
          ].map((a) => (
            <TouchableOpacity key={a.label} style={s.quickBtn} activeOpacity={0.75}>
              <View style={s.quickShine} pointerEvents="none" />
              <Text style={s.quickIcon}>{a.icon}</Text>
              <Text style={s.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Employment */}
        <SectionHead title="Employment" />
        <View style={s.card}>
          <View style={s.cardShine} pointerEvents="none" />
          {employment.departmentName ? (
            <DetailRow icon="⊞" label="Department" value={employment.departmentName} chevron />
          ) : null}
          {employment.teamName ? (
            <DetailRow icon="◎" label="Team" value={employment.teamName} chevron />
          ) : null}
          {employment.storeName ? (
            <DetailRow icon="◈" label="Store" value={employment.storeName} chevron />
          ) : null}
          {employment.manager ? (
            <DetailRow icon="◇" label="Reports to" value={employment.manager.name} chevron />
          ) : null}
          {employee.employeeId ? (
            <DetailRow icon="⊗" label="Employee ID" value={employee.employeeId} />
          ) : null}
          <DetailRow
            icon="⊙"
            label="Joined"
            value={new Date(employee.joinedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            chip={{ text: status.label, bg: status.bg, fg: status.fg, border: status.border }}
          />
          <DetailRow
            icon="◉"
            label="Security Level"
            value={`${employee.securityLevel} — ${employee.securityLevel === "L2" ? "Standard" : employee.securityLevel === "L3" ? "Senior" : employee.securityLevel === "L4" ? "Lead" : "Executive"}`}
            chip={{
              text: secLevel.label,
              bg: secLevel.bg,
              fg: secLevel.fg,
              border: secLevel.border,
            }}
          />
        </View>

        {/* Active projects */}
        {projects.length > 0 ? (
          <>
            <SectionHead title="Active Projects" count={projects.length} />
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              {projects.map((p, i) => (
                <ProjectRow
                  key={p.id}
                  item={p}
                  last={i === projects.length - 1}
                  onPress={() =>
                    router.push({ pathname: "/(auth)/project-detail", params: { id: p.id } })
                  }
                />
              ))}
            </View>
          </>
        ) : null}

        {/* Direct reports */}
        {directReports.length > 0 ? (
          <>
            <SectionHead title="Direct Reports" count={directReports.length} />
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              {directReports.map((r, i) => (
                <ReportRow
                  key={r.id}
                  item={r}
                  last={i === directReports.length - 1}
                  onPress={() =>
                    router.push({ pathname: "/(auth)/employee-detail", params: { id: r.id } })
                  }
                />
              ))}
            </View>
          </>
        ) : null}

        {/* Recent activity */}
        {activity.length > 0 ? (
          <>
            <SectionHead title="Recent Activity" />
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              {activity.map((a, i) => (
                <ActivityRow key={a.id} item={a} last={i === activity.length - 1} />
              ))}
            </View>
          </>
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
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.base },
  heroAvatarWrap: { position: "relative", flexShrink: 0 },
  heroAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroAvatarText: { fontSize: 22, fontWeight: "700", color: colors.text1 },
  heroOnlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: colors.bg,
  },
  heroMeta: { flex: 1, gap: 3 },
  heroName: { fontSize: 20, fontWeight: "700", color: colors.text1, letterSpacing: -0.4 },
  heroTitle: { fontSize: 13, color: colors.text3, marginBottom: 4 },
  heroBadgeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.02 },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleBadgeText: { fontSize: 11, fontWeight: "600", color: colors.text3 },

  // Contact strip
  contactStrip: { flexDirection: "row", gap: spacing.sm },
  contactBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    borderRadius: 14,
    padding: 11,
    overflow: "hidden",
  },
  contactBtnShine: {
    position: "absolute",
    top: 0,
    left: 8,
    right: 8,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  contactIcon: { fontSize: 16, color: colors.text2 },
  contactTextWrap: { flex: 1, minWidth: 0 },
  contactLabel: {
    fontSize: 10,
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.05,
    marginBottom: 1,
  },
  contactValue: { fontSize: 12, fontWeight: "600", color: colors.text2 },

  // Quick actions
  quickRow: { flexDirection: "row", gap: spacing.sm },
  quickBtn: {
    flex: 1,
    paddingVertical: 14,
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
  quickIcon: { fontSize: 18, color: colors.text2 },
  quickLabel: { fontSize: 11, fontWeight: "500", color: colors.text3 },

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

  // Detail row
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: spacing.md,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  detailIconText: { fontSize: 14, color: colors.text2 },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 11, color: colors.text3, marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: "600", color: colors.text1 },
  detailChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexShrink: 0,
  },
  detailChipText: { fontSize: 10, fontWeight: "700" },
  chevron: { fontSize: 18, color: "rgba(255,255,255,0.20)" },

  // List rows
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: spacing.md,
  },
  rowLast: { borderBottomWidth: 0 },
  rowInfo: { flex: 1, gap: 3, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: "600", color: colors.text1 },
  rowSub: { fontSize: 12, color: colors.text3 },

  // Project row
  projDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  roleTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  roleTagOwner: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.22)",
  },
  roleTagText: { fontSize: 10, fontWeight: "700", color: colors.text3, letterSpacing: 0.04 },

  // Report row
  repAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    position: "relative",
  },
  repAvatarText: { fontSize: 13, fontWeight: "700", color: colors.text1 },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.bg,
  },

  // Activity row
  actRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.base,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: spacing.md,
  },
  actIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  actIconText: { fontSize: 14, color: colors.text2 },
  actTime: { fontSize: 11, color: colors.text3, flexShrink: 0, paddingTop: 2 },

  // Error / retry
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
