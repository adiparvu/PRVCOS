import { useState } from "react"
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  usePeople,
  type TeamMember,
  type StoreGroup,
  type AttendanceRecord,
} from "@/hooks/usePeople"
import { colors, radius, spacing } from "@/tokens"

// ─── Types ────────────────────────────────────────────────────────────────────

type Segment = "team" | "schedule" | "attendance" | "org"

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPIPill({
  value,
  label,
  valueColor,
  delta,
  deltaColor,
}: {
  value: string
  label: string
  valueColor?: string
  delta?: string
  deltaColor?: string
}) {
  return (
    <View style={s.kpiPill}>
      <View style={s.pillShine} pointerEvents="none" />
      <Text style={[s.kpiValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
      {delta ? (
        <Text style={[s.kpiDelta, { color: deltaColor ?? colors.text3 }]}>{delta}</Text>
      ) : null}
    </View>
  )
}

function Avatar({
  initials,
  isOnline,
  size = 40,
  opacity = 1,
}: {
  initials: string
  isOnline: boolean
  size?: number
  opacity?: number
}) {
  const dotSize = Math.round(size * 0.26)
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2, opacity }]}>
      <Text style={[s.avatarText, { fontSize: size * 0.34 }]}>{initials}</Text>
      <View
        style={[
          s.onlineDot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            bottom: size * 0.02,
            right: size * 0.02,
            backgroundColor: isOnline ? colors.green : "rgba(255,255,255,0.22)",
          },
        ]}
      />
    </View>
  )
}

function MemberRow({ item, last }: { item: TeamMember; last: boolean }) {
  return (
    <View style={[s.listRow, last ? s.listRowLast : null]}>
      <Avatar initials={item.initials} isOnline={item.isOnline} />
      <View style={s.rowInfo}>
        <Text style={s.rowName}>
          {item.firstName} {item.lastName}
        </Text>
        <Text style={s.rowSub} numberOfLines={1}>
          {item.jobTitle ?? item.role}
        </Text>
      </View>
      <View style={s.memberRight}>
        <Text style={s.roleTag}>{item.role}</Text>
        <Text style={[s.timeAgo, item.isOnline ? { color: colors.green } : null]}>
          {item.lastActiveAt ?? "—"}
        </Text>
      </View>
    </View>
  )
}

function StoreCard({ group }: { group: StoreGroup }) {
  return (
    <View style={s.card}>
      <View style={s.cardShine} pointerEvents="none" />
      <View style={s.storeCardTop}>
        <View>
          <Text style={s.storeName}>{group.storeName}</Text>
          <Text style={s.storeSub}>
            {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
            {group.onlineCount > 0 ? ` · ${group.onlineCount} online` : ""}
          </Text>
        </View>
        {group.storeId === null ? (
          <View style={s.unassignedTag}>
            <Text style={s.unassignedTagText}>Unassigned</Text>
          </View>
        ) : (
          <View style={[s.onlineCountBadge, group.onlineCount === 0 ? { opacity: 0.4 } : null]}>
            <View
              style={[
                s.onlineCountDot,
                { backgroundColor: group.onlineCount > 0 ? colors.green : "rgba(255,255,255,0.3)" },
              ]}
            />
            <Text style={s.onlineCountText}>{group.onlineCount} online</Text>
          </View>
        )}
      </View>
      <View style={s.avatarStack}>
        {group.previews.map((p, i) => (
          <View
            key={p.id}
            style={[
              s.stackedAvatar,
              { marginLeft: i === 0 ? 0 : -8, zIndex: group.previews.length - i },
            ]}
          >
            <Avatar initials={p.initials} isOnline={p.isOnline} size={32} />
          </View>
        ))}
        {group.memberCount > group.previews.length ? (
          <View style={[s.stackedAvatar, s.overflowAvatar, { marginLeft: -8 }]}>
            <Text style={s.overflowText}>+{group.memberCount - group.previews.length}</Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

function AttendanceRow({ item, last }: { item: AttendanceRecord; last: boolean }) {
  return (
    <View style={[s.listRow, last ? s.listRowLast : null]}>
      <Avatar
        initials={item.initials}
        isOnline={item.isActiveToday}
        size={36}
        opacity={item.isActiveToday ? 1 : 0.45}
      />
      <View style={s.rowInfo}>
        <Text style={[s.rowName, !item.isActiveToday ? { color: colors.text2 } : null]}>
          {item.firstName} {item.lastName}
        </Text>
        <Text style={s.rowSub} numberOfLines={1}>
          {item.jobTitle ?? item.role}
        </Text>
      </View>
      <View style={s.memberRight}>
        {item.isActiveToday ? (
          <View style={s.activeBadge}>
            <Text style={s.activeBadgeText}>Active</Text>
          </View>
        ) : (
          <View style={s.inactiveBadge}>
            <Text style={s.inactiveBadgeText}>Inactive</Text>
          </View>
        )}
        {item.lastActiveAt ? (
          <Text style={[s.timeAgo, item.isActiveToday ? { color: colors.green } : null]}>
            {item.lastActiveAt}
          </Text>
        ) : null}
      </View>
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

function ListCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.listCard}>
      <View style={s.cardShine} pointerEvents="none" />
      {children}
    </View>
  )
}

function SkeletonBlock({ h, r }: { h: number; r?: number }) {
  return (
    <View
      style={{
        width: "100%",
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
        {[90, 90, 90].map((_, i) => (
          <SkeletonBlock key={i} h={68} r={14} />
        ))}
      </View>
      {[1, 2, 3, 4].map((i) => (
        <SkeletonBlock key={i} h={64} r={14} />
      ))}
    </View>
  )
}

function OrgPlaceholder() {
  return (
    <View style={s.placeholder}>
      <View style={s.placeholderInner}>
        <View style={s.cardShine} pointerEvents="none" />
        <Text style={s.placeholderIcon}>⎇</Text>
        <Text style={s.placeholderTitle}>Org Chart</Text>
        <Text style={s.placeholderSub}>
          Interactive org chart with reporting lines, roles, and team hierarchy coming in a future
          release.
        </Text>
      </View>
    </View>
  )
}

// ─── Segment content ──────────────────────────────────────────────────────────

function TeamContent({ data }: { data: ReturnType<typeof usePeople>["data"] }) {
  if (!data) return <SkeletonContent />

  const { teamKpi, members } = data
  const online = members.filter((m) => m.isOnline)
  const offline = members.filter((m) => !m.isOnline)

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.kpiScrollWrap}
        contentContainerStyle={s.kpiStrip}
      >
        <KPIPill value={String(teamKpi.total)} label="Total" />
        <KPIPill
          value={String(teamKpi.online)}
          label="Online Now"
          valueColor={teamKpi.online > 0 ? colors.green : undefined}
        />
        <KPIPill value={String(teamKpi.uniqueRoles)} label="Roles" />
      </ScrollView>

      {online.length > 0 ? (
        <>
          <SectionHeader title="Online Now" action="See all →" />
          <ListCard>
            {online.map((m, i) => (
              <MemberRow key={m.id} item={m} last={i === online.length - 1} />
            ))}
          </ListCard>
        </>
      ) : null}

      {offline.length > 0 ? (
        <>
          <SectionHeader title="All Members" action={online.length > 0 ? undefined : "See all →"} />
          <ListCard>
            {offline.map((m, i) => (
              <MemberRow key={m.id} item={m} last={i === offline.length - 1} />
            ))}
          </ListCard>
        </>
      ) : null}

      {members.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>No team members found</Text>
        </View>
      ) : null}
    </>
  )
}

function ScheduleContent({ data }: { data: ReturnType<typeof usePeople>["data"] }) {
  if (!data) return <SkeletonContent />

  const { scheduleKpi, storeGroups } = data

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.kpiScrollWrap}
        contentContainerStyle={s.kpiStrip}
      >
        <KPIPill value={String(scheduleKpi.locations)} label="Locations" />
        <KPIPill value={String(scheduleKpi.assigned)} label="Assigned" valueColor={colors.green} />
        {scheduleKpi.unassigned > 0 ? (
          <KPIPill
            value={String(scheduleKpi.unassigned)}
            label="Unassigned"
            valueColor={colors.amber}
          />
        ) : null}
      </ScrollView>

      <SectionHeader title="Teams by Location" />

      {storeGroups.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>No location assignments found</Text>
        </View>
      ) : (
        storeGroups.map((g) => <StoreCard key={g.storeId ?? "unassigned"} group={g} />)
      )}

      <View style={s.moduleNote}>
        <Text style={s.moduleNoteText}>
          Full shift scheduling with time-based rosters is coming in a future release.
        </Text>
      </View>
    </>
  )
}

function AttendanceContent({ data }: { data: ReturnType<typeof usePeople>["data"] }) {
  if (!data) return <SkeletonContent />

  const { attendanceKpi, attendance } = data
  const active = attendance.filter((a) => a.isActiveToday)
  const inactive = attendance.filter((a) => !a.isActiveToday)

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.kpiScrollWrap}
        contentContainerStyle={s.kpiStrip}
      >
        <KPIPill
          value={String(attendanceKpi.activeToday)}
          label="Active Today"
          valueColor={attendanceKpi.activeToday > 0 ? colors.green : undefined}
        />
        <KPIPill value={String(attendanceKpi.inactiveToday)} label="Inactive" />
        <KPIPill value={String(attendanceKpi.total)} label="Total" />
      </ScrollView>

      {active.length > 0 ? (
        <>
          <SectionHeader title="Active Today" />
          <ListCard>
            {active.map((a, i) => (
              <AttendanceRow key={a.id} item={a} last={i === active.length - 1} />
            ))}
          </ListCard>
        </>
      ) : null}

      {inactive.length > 0 ? (
        <>
          <SectionHeader title="Not Active Today" />
          <ListCard>
            {inactive.map((a, i) => (
              <AttendanceRow key={a.id} item={a} last={i === inactive.length - 1} />
            ))}
          </ListCard>
        </>
      ) : null}

      <View style={s.moduleNote}>
        <Text style={s.moduleNoteText}>
          Based on system activity. Full check-in/check-out attendance tracking coming in a future
          release.
        </Text>
      </View>
    </>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: "team", label: "Team" },
  { key: "schedule", label: "Schedule" },
  { key: "attendance", label: "Attendance" },
  { key: "org", label: "Org" },
]

export default function PeopleScreen() {
  const insets = useSafeAreaInsets()
  const [segment, setSegment] = useState<Segment>("team")
  const { data, isLoading, isError, refetch, isRefetching } = usePeople()

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Fixed header */}
      <View style={s.header}>
        <Text style={s.title}>People</Text>
        <TouchableOpacity style={s.headerBtn} activeOpacity={0.7}>
          <Text style={s.headerBtnText}>⊕</Text>
        </TouchableOpacity>
      </View>

      {/* Fixed segment */}
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

      {/* Content */}
      {isLoading ? (
        <SkeletonContent />
      ) : isError ? (
        <View style={s.errorWrap}>
          <Text style={s.errorText}>Failed to load people data.</Text>
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
          {segment === "team" && <TeamContent data={data} />}
          {segment === "schedule" && <ScheduleContent data={data} />}
          {segment === "attendance" && <AttendanceContent data={data} />}
          {segment === "org" && <OrgPlaceholder />}
        </ScrollView>
      )}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5, color: colors.text1 },
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
  headerBtnText: { fontSize: 18, color: colors.text1, lineHeight: 22 },

  segmentWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.md,
    padding: 3,
    gap: 2,
  },
  segBtn: { flex: 1, paddingVertical: 7, alignItems: "center", borderRadius: 9 },
  segBtnActive: { backgroundColor: "rgba(255,255,255,0.12)" },
  segBtnText: { fontSize: 13, fontWeight: "500", color: colors.text3 },
  segBtnTextActive: { color: colors.text1 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },

  kpiScrollWrap: { marginHorizontal: -spacing.lg },
  kpiStrip: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  kpiPill: {
    minWidth: 90,
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
  kpiDelta: { fontSize: 11, fontWeight: "500", marginTop: 4 },

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
  sectionAction: { fontSize: 13, fontWeight: "500", color: colors.text3 },

  listCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  cardShine: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: spacing.md,
  },
  listRowLast: { borderBottomWidth: 0 },

  // Avatar
  avatar: {
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    position: "relative",
  },
  avatarText: { color: "rgba(255,255,255,0.75)", fontWeight: "700" },
  onlineDot: {
    position: "absolute",
    borderWidth: 2,
    borderColor: colors.bg,
  },

  // Member row
  rowInfo: { flex: 1, gap: 2, minWidth: 0 },
  rowName: { fontSize: 14, fontWeight: "600", color: colors.text1 },
  rowSub: { fontSize: 12, color: colors.text3, overflow: "hidden" },
  memberRight: { alignItems: "flex-end", gap: 3, flexShrink: 0 },
  roleTag: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.text3,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  timeAgo: { fontSize: 11, color: colors.text3, fontWeight: "500" },

  // Store card
  card: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: spacing.base,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  storeCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  storeName: { fontSize: 15, fontWeight: "600", color: colors.text1, marginBottom: 3 },
  storeSub: { fontSize: 12, color: colors.text3 },
  onlineCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(48,209,88,0.08)",
    borderWidth: 1,
    borderColor: "rgba(48,209,88,0.2)",
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  onlineCountDot: { width: 6, height: 6, borderRadius: 3 },
  onlineCountText: { fontSize: 11, fontWeight: "600", color: colors.green },
  unassignedTag: {
    backgroundColor: "rgba(255,159,10,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,159,10,0.2)",
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  unassignedTagText: { fontSize: 11, fontWeight: "600", color: colors.amber },
  avatarStack: { flexDirection: "row", alignItems: "center" },
  stackedAvatar: { borderWidth: 2, borderColor: colors.bg, borderRadius: 18 },
  overflowAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  overflowText: { fontSize: 10, fontWeight: "700", color: colors.text3 },

  // Attendance badges
  activeBadge: {
    backgroundColor: "rgba(48,209,88,0.12)",
    borderWidth: 1,
    borderColor: "rgba(48,209,88,0.25)",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeBadgeText: { fontSize: 11, fontWeight: "600", color: colors.green },
  inactiveBadge: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  inactiveBadgeText: { fontSize: 11, fontWeight: "500", color: colors.text3 },

  // Module note
  moduleNote: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  moduleNoteText: { fontSize: 12, color: colors.text3, lineHeight: 18, textAlign: "center" },

  // Placeholder
  placeholder: { paddingTop: spacing.xxl, alignItems: "center" },
  placeholderInner: {
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
  placeholderIcon: { fontSize: 36, color: colors.text2, marginBottom: spacing.sm },
  placeholderTitle: { fontSize: 17, fontWeight: "600", color: colors.text2 },
  placeholderSub: { fontSize: 14, color: colors.text3, textAlign: "center", lineHeight: 20 },

  // Empty / error
  empty: {
    padding: spacing.xl,
    alignItems: "center",
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    marginBottom: spacing.sm,
  },
  emptyText: { fontSize: 15, color: colors.text3 },
  errorWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.base },
  errorText: { fontSize: 15, color: colors.text3 },
  retryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },
  retryBtnText: { fontSize: 15, fontWeight: "600", color: colors.text1 },
})
