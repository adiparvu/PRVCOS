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
import {
  useProjectDetail,
  getProjectInitials,
  formatMilestoneDue,
  formatActivityTime,
} from "@/hooks/useProjects"
import { colors, radius, spacing, type as t } from "@/tokens"

// ─── Constants ────────────────────────────────────────────────────────────────

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
    label: "Completed",
    bg: "rgba(100,210,255,0.10)",
    fg: "#64d2ff",
    border: "rgba(100,210,255,0.22)",
  },
  draft: { label: "Draft", bg: colors.glass1, fg: colors.text3, border: colors.border },
  cancelled: {
    label: "Cancelled",
    bg: "rgba(255,69,58,0.10)",
    fg: colors.red,
    border: "rgba(255,69,58,0.22)",
  },
  archived: { label: "Archived", bg: colors.glass1, fg: colors.text3, border: colors.border },
}

const INVOICE_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: colors.text3 },
  sent: { label: "Sent", color: "#64d2ff" },
  paid: { label: "Paid", color: colors.green },
  overdue: { label: "Overdue", color: colors.red },
  cancelled: { label: "Cancelled", color: colors.text3 },
  refunded: { label: "Refunded", color: colors.amber },
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
      {count !== undefined ? (
        <View style={s.sectionBadge}>
          <Text style={s.sectionBadgeText}>{count}</Text>
        </View>
      ) : null}
    </View>
  )
}

function BudgetPill({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <View style={[s.budgetPill, dim ? s.budgetPillDim : null]}>
      <View style={s.pillShine} pointerEvents="none" />
      <Text style={[s.budgetPillVal, dim ? { color: colors.text3 } : null]}>{value}</Text>
      <Text style={s.budgetPillLbl}>{label}</Text>
    </View>
  )
}

function ProgressPhases({
  total,
  completed,
  progress,
}: {
  total: number
  completed: number
  progress: number
}) {
  const phases = Math.max(total, 1)
  const dots = Array.from({ length: Math.min(phases, 7) }, (_, i) => i < completed)

  return (
    <View style={s.phaseWrap}>
      <View style={s.phaseDots}>
        {dots.map((done, i) => (
          <View key={i} style={[s.phaseDot, done ? s.phaseDotDone : null]}>
            {done ? <Text style={s.phaseDotCheck}>✓</Text> : null}
          </View>
        ))}
      </View>
      <Text style={s.progressPct}>{progress}%</Text>
    </View>
  )
}

function TimelineStrip({
  startDate,
  dueDate,
}: {
  startDate: string | null
  dueDate: string | null
}) {
  const fmt = (d: string | null) => {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    })
  }
  const now = new Date()
  const start = startDate ? new Date(startDate) : null
  const due = dueDate ? new Date(dueDate) : null

  let progress = 0
  if (start && due) {
    const total = due.getTime() - start.getTime()
    const elapsed = Math.min(now.getTime() - start.getTime(), total)
    progress = total > 0 ? Math.max(0, Math.min(100, (elapsed / total) * 100)) : 0
  }

  const isOverdue = due ? due < now : false

  return (
    <View style={s.timeline}>
      <View style={s.timelineTrack}>
        <View style={[s.timelineFill, { width: `${progress}%` }]} />
        <View style={[s.timelineNow, { left: `${progress}%` as any }]} />
      </View>
      <View style={s.timelineDates}>
        <Text style={s.timelineDate}>{fmt(startDate)}</Text>
        <Text style={[s.timelineDue, isOverdue ? { color: colors.red } : null]}>
          Due {fmt(dueDate)}
        </Text>
      </View>
    </View>
  )
}

function QuickActions({ projectId }: { projectId: string }) {
  const actions = [
    { label: "New Task", icon: "◈" },
    { label: "Log Update", icon: "◎" },
    { label: "Invoice", icon: "◇" },
    { label: "Photos", icon: "⊞" },
  ]
  return (
    <View style={s.quickRow}>
      {actions.map((a) => (
        <TouchableOpacity key={a.label} style={s.quickBtn} activeOpacity={0.75}>
          <View style={s.quickBtnShine} pointerEvents="none" />
          <Text style={s.quickIcon}>{a.icon}</Text>
          <Text style={s.quickLabel}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

function MilestoneRow({
  item,
  last,
}: {
  item: {
    id: string
    title: string
    dueDate: string | null
    isComplete: boolean
    isOverdue: boolean
  }
  last: boolean
}) {
  const due = formatMilestoneDue(item.dueDate, item.isOverdue)
  return (
    <View style={[s.milestoneRow, last ? s.rowLast : null]}>
      <View
        style={[
          s.checkCircle,
          item.isComplete ? s.checkDone : null,
          item.isOverdue ? s.checkOverdue : null,
        ]}
      >
        {item.isComplete ? <Text style={s.checkMark}>✓</Text> : null}
      </View>
      <View style={s.rowInfo}>
        <Text style={[s.rowTitle, item.isComplete ? s.rowTitleDone : null]} numberOfLines={2}>
          {item.title}
        </Text>
      </View>
      <Text style={[s.dueLabel, { color: due.color }]}>{due.label}</Text>
    </View>
  )
}

function TeamRow({
  member,
  last,
}: {
  member: {
    id: string
    name: string
    role: string
    jobTitle: string | null
    avatarUrl: string | null
  }
  last: boolean
}) {
  const initials = member.name
    .split(" ")
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase()
  const isOwner = member.role === "owner"

  return (
    <View style={[s.teamRow, last ? s.rowLast : null]}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{initials}</Text>
      </View>
      <View style={s.rowInfo}>
        <Text style={s.rowTitle} numberOfLines={1}>
          {member.name}
        </Text>
        {member.jobTitle ? (
          <Text style={s.rowSub} numberOfLines={1}>
            {member.jobTitle}
          </Text>
        ) : null}
      </View>
      <View style={[s.roleTag, isOwner ? s.roleTagOwner : null]}>
        <Text style={[s.roleTagText, isOwner ? { color: colors.text1 } : null]}>
          {MEMBER_ROLE[member.role] ?? member.role.toUpperCase()}
        </Text>
      </View>
    </View>
  )
}

function ActivityRow({
  item,
  last,
}: {
  item: { id: string; title: string; body: string | null; type: string; createdAt: string }
  last: boolean
}) {
  const typeIcon: Record<string, string> = {
    info: "◎",
    success: "◉",
    warning: "◈",
    error: "⊗",
  }
  return (
    <View style={[s.actRow, last ? s.rowLast : null]}>
      <View style={s.actIcon}>
        <Text style={s.actIconText}>{typeIcon[item.type] ?? "◎"}</Text>
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

function InvoiceRow({
  item,
  last,
}: {
  item: {
    id: string
    invoiceNumber: string
    status: string
    total: string
    issueDate: string
    dueDate: string
    paidAt: string | null
  }
  last: boolean
}) {
  const st = INVOICE_STATUS[item.status] ?? { label: item.status, color: colors.text3 }
  return (
    <View style={[s.invRow, last ? s.rowLast : null]}>
      <View style={s.invIcon}>
        <Text style={{ fontSize: 15 }}>◇</Text>
      </View>
      <View style={s.rowInfo}>
        <Text style={s.rowTitle} numberOfLines={1}>
          {item.invoiceNumber}
        </Text>
        <Text style={s.rowSub}>
          {new Date(item.issueDate).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "2-digit",
          })}
        </Text>
      </View>
      <View style={s.invRight}>
        <Text style={s.invTotal}>{item.total}</Text>
        <View style={s.statusDotRow}>
          <View style={[s.statusDot, { backgroundColor: st.color }]} />
          <Text style={[s.statusDotLabel, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProjectDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data, isLoading, isError, refetch } = useProjectDetail(id ?? "")

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
        <Text style={s.errText}>Could not load project.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => void refetch()} activeOpacity={0.8}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const { project, kpis, milestones, team, activity, invoices } = data
  const status = PROJECT_STATUS[project.status] ?? PROJECT_STATUS.draft!

  const openMilestones = milestones.filter((m) => !m.isComplete)
  const doneMilestones = milestones.filter((m) => m.isComplete)

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Nav bar */}
      <View style={s.navbar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navTitle} numberOfLines={1}>
          {project.name}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <View style={s.hero}>
          <View style={s.heroShine} pointerEvents="none" />

          <View style={s.heroTop}>
            <View style={s.heroInitials}>
              <Text style={s.heroInitialsText}>{getProjectInitials(project.name)}</Text>
            </View>
            <View style={s.heroMeta}>
              <Text style={s.heroName} numberOfLines={2}>
                {project.name}
              </Text>
              {project.clientName ? (
                <Text style={s.heroClient} numberOfLines={1}>
                  {project.clientName}
                </Text>
              ) : null}
            </View>
            <View
              style={[s.statusBadge, { backgroundColor: status.bg, borderColor: status.border }]}
            >
              <Text style={[s.statusBadgeText, { color: status.fg }]}>{status.label}</Text>
            </View>
          </View>

          <ProgressPhases
            total={kpis.totalMilestones}
            completed={kpis.completedMilestones}
            progress={kpis.progress}
          />

          {project.budget || kpis.totalInvoiced !== "€0" ? (
            <View style={s.budgetRow}>
              {project.budget ? <BudgetPill label="Budget" value={project.budget} /> : null}
              {kpis.totalInvoiced !== "€0" ? (
                <BudgetPill label="Billed" value={kpis.totalInvoiced} />
              ) : null}
              {kpis.remaining ? <BudgetPill label="Remaining" value={kpis.remaining} dim /> : null}
            </View>
          ) : null}

          <TimelineStrip startDate={project.startDate} dueDate={project.dueDate} />
        </View>

        {/* Quick actions */}
        <QuickActions projectId={project.id} />

        {/* Open milestones */}
        {openMilestones.length > 0 ? (
          <>
            <SectionHead
              title="Open Tasks"
              count={kpis.overdueMilestones > 0 ? kpis.overdueMilestones : undefined}
            />
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              {openMilestones.map((m, i) => (
                <MilestoneRow key={m.id} item={m} last={i === openMilestones.length - 1} />
              ))}
            </View>
          </>
        ) : null}

        {/* Completed milestones */}
        {doneMilestones.length > 0 ? (
          <>
            <SectionHead title="Completed" />
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              {doneMilestones.map((m, i) => (
                <MilestoneRow key={m.id} item={m} last={i === doneMilestones.length - 1} />
              ))}
            </View>
          </>
        ) : null}

        {milestones.length === 0 ? (
          <>
            <SectionHead title="Tasks" />
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>No milestones yet</Text>
            </View>
          </>
        ) : null}

        {/* Team */}
        {team.length > 0 ? (
          <>
            <SectionHead title="Team" count={kpis.teamCount} />
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              {team.map((m, i) => (
                <TeamRow key={m.id} member={m} last={i === team.length - 1} />
              ))}
            </View>
          </>
        ) : null}

        {/* Activity */}
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

        {/* Invoices */}
        {invoices.length > 0 ? (
          <>
            <SectionHead title="Invoices" count={invoices.length} />
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              {invoices.map((inv, i) => (
                <InvoiceRow key={inv.id} item={inv} last={i === invoices.length - 1} />
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

  // Navbar
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

  // Hero card
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
    gap: spacing.md,
  },
  heroInitials: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  heroInitialsText: { fontSize: 16, fontWeight: "700", color: colors.text1 },
  heroMeta: { flex: 1, gap: 3 },
  heroName: { fontSize: 17, fontWeight: "700", color: colors.text1, letterSpacing: -0.3 },
  heroClient: { fontSize: 13, color: colors.text3 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexShrink: 0,
    alignSelf: "flex-start",
  },
  statusBadgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.02 },

  // Phase progress dots
  phaseWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  phaseDots: { flex: 1, flexDirection: "row", gap: 6, flexWrap: "wrap" },
  phaseDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  phaseDotDone: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderColor: "rgba(255,255,255,0.5)",
  },
  phaseDotCheck: { fontSize: 10, color: colors.text1, fontWeight: "700" },
  progressPct: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text2,
    minWidth: 36,
    textAlign: "right",
  },

  // Budget pills
  budgetRow: { flexDirection: "row", gap: spacing.sm },
  budgetPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 12,
    overflow: "hidden",
  },
  budgetPillDim: { backgroundColor: "rgba(255,255,255,0.03)" },
  pillShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  budgetPillVal: { fontSize: 15, fontWeight: "700", color: colors.text1, letterSpacing: -0.2 },
  budgetPillLbl: { fontSize: 10, color: colors.text3, marginTop: 2 },

  // Timeline
  timeline: { gap: 6 },
  timelineTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
    overflow: "visible",
    position: "relative",
  },
  timelineFill: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 2,
  },
  timelineNow: {
    position: "absolute",
    top: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.text1,
    marginLeft: -5,
  },
  timelineDates: { flexDirection: "row", justifyContent: "space-between" },
  timelineDate: { fontSize: 11, color: colors.text3 },
  timelineDue: { fontSize: 11, color: colors.text3 },

  // Quick actions
  quickRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
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
  quickBtnShine: {
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
  sectionBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,69,58,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,69,58,0.25)",
  },
  sectionBadgeText: { fontSize: 11, fontWeight: "700", color: colors.red },

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

  // Row base
  rowLast: { borderBottomWidth: 0 },
  rowInfo: { flex: 1, gap: 3, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: "600", color: colors.text1 },
  rowTitleDone: { color: colors.text3, textDecorationLine: "line-through" },
  rowSub: { fontSize: 12, color: colors.text3 },

  // Milestone row
  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: spacing.md,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.20)",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  checkDone: {
    backgroundColor: "rgba(48,209,88,0.20)",
    borderColor: "rgba(48,209,88,0.50)",
  },
  checkOverdue: {
    borderColor: "rgba(255,69,58,0.50)",
    backgroundColor: "rgba(255,69,58,0.08)",
  },
  checkMark: { fontSize: 11, color: colors.green, fontWeight: "700" },
  dueLabel: { fontSize: 11, fontWeight: "500", flexShrink: 0 },

  // Team row
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 13, fontWeight: "700", color: colors.text1 },
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

  // Invoice row
  invRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: spacing.md,
  },
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
  invRight: { alignItems: "flex-end", gap: 4, flexShrink: 0 },
  invTotal: { fontSize: 14, fontWeight: "700", color: colors.text1 },
  statusDotRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotLabel: { fontSize: 11, fontWeight: "500" },

  // Empty / error
  emptyCard: {
    padding: spacing.xl,
    alignItems: "center",
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    marginBottom: spacing.xs,
  },
  emptyText: { fontSize: 14, color: colors.text3 },
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
