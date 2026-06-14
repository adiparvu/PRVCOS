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
  type ShiftItem,
  type AttendanceItem,
} from "@/hooks/usePeople"
import { useRouter } from "expo-router"
import { FABWithSheets } from "@/components/FABWithSheets"
import { colors, radius, spacing } from "@/tokens"

// ─── Types ────────────────────────────────────────────────────────────────────

type Segment = "team" | "schedule" | "attendance" | "org"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}

const STATUS_CONFIG: Record<
  AttendanceItem["status"],
  { label: string; bg: string; border: string; fg: string }
> = {
  present: {
    label: "Present",
    bg: "rgba(48,209,88,0.12)",
    border: "rgba(48,209,88,0.25)",
    fg: colors.green,
  },
  clocked_out: {
    label: "Clocked Out",
    bg: "rgba(100,210,255,0.08)",
    border: "rgba(100,210,255,0.18)",
    fg: "rgba(100,210,255,0.85)",
  },
  late: {
    label: "Late",
    bg: "rgba(255,159,10,0.10)",
    border: "rgba(255,159,10,0.22)",
    fg: colors.amber,
  },
  absent: {
    label: "Absent",
    bg: "rgba(255,69,58,0.10)",
    border: "rgba(255,69,58,0.22)",
    fg: colors.red,
  },
  leave: {
    label: "On Leave",
    bg: "rgba(191,90,242,0.10)",
    border: "rgba(191,90,242,0.22)",
    fg: "rgba(191,90,242,0.9)",
  },
}

const SHIFT_STATUS_CONFIG: Record<
  ShiftItem["status"],
  { label: string; bg: string; border: string; fg: string }
> = {
  confirmed: {
    label: "Confirmed",
    bg: "rgba(48,209,88,0.10)",
    border: "rgba(48,209,88,0.2)",
    fg: colors.green,
  },
  scheduled: {
    label: "Scheduled",
    bg: "rgba(100,210,255,0.08)",
    border: "rgba(100,210,255,0.18)",
    fg: "rgba(100,210,255,0.8)",
  },
  open: {
    label: "Open",
    bg: "rgba(255,159,10,0.08)",
    border: "rgba(255,159,10,0.18)",
    fg: colors.amber,
  },
  draft: {
    label: "Draft",
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.08)",
    fg: colors.text3,
  },
}

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
  const router = useRouter()
  return (
    <TouchableOpacity
      style={[s.listRow, last ? s.listRowLast : null]}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: "/(auth)/employee-detail", params: { id: item.id } })}
    >
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
    </TouchableOpacity>
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

function ShiftCard({ item }: { item: ShiftItem }) {
  const sc = SHIFT_STATUS_CONFIG[item.status]
  const coverage = item.totalSlots > 0 ? `${item.filledSlots}/${item.totalSlots}` : "—"
  const isFull = item.filledSlots >= item.totalSlots && item.totalSlots > 0
  return (
    <View style={s.shiftCard}>
      <View style={s.cardShine} pointerEvents="none" />
      <View style={s.shiftCardTop}>
        <View style={s.shiftTimeBlock}>
          <Text style={s.shiftTime}>
            {item.startTime} – {item.endTime}
          </Text>
          {item.location ? (
            <Text style={s.shiftLocation} numberOfLines={1}>
              {item.location}
            </Text>
          ) : null}
        </View>
        <View style={[s.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
          <Text style={[s.statusBadgeText, { color: sc.fg }]}>{sc.label}</Text>
        </View>
      </View>
      <Text style={s.shiftTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <View style={s.shiftFooter}>
        <View style={s.shiftRoleBadge}>
          <Text style={s.shiftRoleText}>{item.role}</Text>
        </View>
        <View style={s.shiftFooterRight}>
          {item.assignees.length > 0 ? (
            <View style={s.assigneeStack}>
              {item.assignees.slice(0, 4).map((a, i) => (
                <View
                  key={a.id}
                  style={[
                    s.assigneeAvatar,
                    { marginLeft: i === 0 ? 0 : -7, zIndex: item.assignees.length - i },
                  ]}
                >
                  <Text style={s.assigneeInitials}>{a.initials}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <Text
            style={[s.coverageText, isFull ? { color: colors.green } : { color: colors.amber }]}
          >
            {coverage} filled
          </Text>
        </View>
      </View>
    </View>
  )
}

function AttendanceItemRow({ item, last }: { item: AttendanceItem; last: boolean }) {
  const router = useRouter()
  const sc = STATUS_CONFIG[item.status]
  return (
    <TouchableOpacity
      style={[s.listRow, last ? s.listRowLast : null]}
      activeOpacity={0.7}
      onPress={() =>
        router.push({ pathname: "/(auth)/employee-detail", params: { id: item.userId } })
      }
    >
      <Avatar
        initials={item.initials}
        isOnline={item.status === "present"}
        size={36}
        opacity={item.status === "absent" ? 0.4 : 1}
      />
      <View style={s.rowInfo}>
        <Text style={s.rowName}>
          {item.firstName} {item.lastName}
        </Text>
        <Text style={s.rowSub}>
          {item.clockIn ? `In ${formatTime(item.clockIn)}` : "—"}
          {item.clockOut ? `  ·  Out ${formatTime(item.clockOut)}` : ""}
          {item.lateMinutes ? `  ·  ${item.lateMinutes}m late` : ""}
        </Text>
      </View>
      <View style={[s.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
        <Text style={[s.statusBadgeText, { color: sc.fg }]}>{sc.label}</Text>
      </View>
    </TouchableOpacity>
  )
}

function AttendanceRow({ item, last }: { item: AttendanceRecord; last: boolean }) {
  const router = useRouter()
  return (
    <TouchableOpacity
      style={[s.listRow, last ? s.listRowLast : null]}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: "/(auth)/employee-detail", params: { id: item.id } })}
    >
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
    </TouchableOpacity>
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

function OrgMemberNode({ item, last }: { item: TeamMember; last: boolean }) {
  const router = useRouter()
  return (
    <TouchableOpacity
      style={[s.orgMemberRow, last ? s.listRowLast : null]}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: "/(auth)/employee-detail", params: { id: item.id } })}
    >
      <View style={s.orgMemberBranch}>
        <View style={s.orgBranchV} />
        <View style={s.orgBranchH} />
      </View>
      <Avatar initials={item.initials} isOnline={item.isOnline} size={32} />
      <View style={s.rowInfo}>
        <Text style={s.rowName}>
          {item.firstName} {item.lastName}
        </Text>
        <Text style={s.rowSub} numberOfLines={1}>
          {item.jobTitle ?? item.role}
        </Text>
      </View>
      <View
        style={[
          s.onlineDotSmall,
          { backgroundColor: item.isOnline ? colors.green : "rgba(255,255,255,0.18)" },
        ]}
      />
    </TouchableOpacity>
  )
}

function OrgContent({ data }: { data: ReturnType<typeof usePeople>["data"] }) {
  if (!data) return <SkeletonContent />

  const { members, storeGroups, teamKpi } = data

  const membersByStore = new Map<string | null, TeamMember[]>()
  for (const m of members) {
    const key = m.storeId
    if (!membersByStore.has(key)) membersByStore.set(key, [])
    membersByStore.get(key)!.push(m)
  }

  return (
    <>
      {/* Company root node */}
      <View style={s.orgRootCard}>
        <View style={s.cardShine} pointerEvents="none" />
        <View style={s.orgRootIcon}>
          <Text style={s.orgRootIconText}>⊞</Text>
        </View>
        <View style={s.orgRootInfo}>
          <Text style={s.orgRootName}>PRV Group</Text>
          <Text style={s.orgRootSub}>
            {teamKpi.total} members · {teamKpi.uniqueRoles} roles
          </Text>
        </View>
        <View style={[s.onlineCountBadge, teamKpi.online === 0 ? { opacity: 0.4 } : null]}>
          <View
            style={[
              s.onlineCountDot,
              { backgroundColor: teamKpi.online > 0 ? colors.green : "rgba(255,255,255,0.3)" },
            ]}
          />
          <Text style={s.onlineCountText}>{teamKpi.online} online</Text>
        </View>
      </View>

      {/* Department / store branches */}
      {storeGroups.map((group) => {
        const groupMembers = membersByStore.get(group.storeId) ?? []
        return (
          <View key={group.storeId ?? "unassigned"} style={s.orgBranch}>
            <View style={s.orgBranchConnector} />

            {/* Department node */}
            <View style={s.orgDeptCard}>
              <View style={s.cardShine} pointerEvents="none" />
              <Text style={s.orgDeptName}>{group.storeName}</Text>
              <View style={s.orgDeptRight}>
                <Text style={s.orgDeptCount}>{group.memberCount}</Text>
                <Text
                  style={[
                    s.orgDeptTag,
                    { color: group.storeId === null ? colors.amber : colors.text3 },
                  ]}
                >
                  {group.storeId === null ? "Unassigned" : "Location"}
                </Text>
              </View>
            </View>

            {/* Member nodes */}
            {groupMembers.length > 0 ? (
              <View style={s.orgMembersCard}>
                <View style={s.cardShine} pointerEvents="none" />
                {groupMembers.map((m, i) => (
                  <OrgMemberNode key={m.id} item={m} last={i === groupMembers.length - 1} />
                ))}
              </View>
            ) : null}
          </View>
        )
      })}

      {members.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>No team members found</Text>
        </View>
      ) : null}
    </>
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

  const { scheduleKpi, shifts, storeGroups } = data
  const covPct =
    scheduleKpi.todayShifts > 0
      ? Math.round((scheduleKpi.covered / scheduleKpi.todayShifts) * 100)
      : 0

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.kpiScrollWrap}
        contentContainerStyle={s.kpiStrip}
      >
        <KPIPill value={String(scheduleKpi.todayShifts)} label="Today" />
        <KPIPill
          value={`${covPct}%`}
          label="Covered"
          valueColor={covPct === 100 ? colors.green : covPct > 50 ? colors.amber : colors.red}
        />
        <KPIPill value={String(scheduleKpi.assigned)} label="Assigned" />
        {scheduleKpi.unassigned > 0 ? (
          <KPIPill
            value={String(scheduleKpi.unassigned)}
            label="Unassigned"
            valueColor={colors.amber}
          />
        ) : null}
      </ScrollView>

      {shifts.length > 0 ? (
        <>
          <SectionHeader title="Today's Shifts" />
          {shifts.map((shift) => (
            <ShiftCard key={shift.id} item={shift} />
          ))}
        </>
      ) : null}

      <SectionHeader title="Teams by Location" />
      {storeGroups.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>No location assignments found</Text>
        </View>
      ) : (
        storeGroups.map((g) => <StoreCard key={g.storeId ?? "unassigned"} group={g} />)
      )}

      {shifts.length === 0 ? (
        <View style={s.moduleNote}>
          <Text style={s.moduleNoteText}>No shifts scheduled for today.</Text>
        </View>
      ) : null}
    </>
  )
}

function AttendanceContent({ data }: { data: ReturnType<typeof usePeople>["data"] }) {
  if (!data) return <SkeletonContent />

  const { attendanceKpi, todayAttendance, attendance } = data

  const present = todayAttendance.filter(
    (a) => a.status === "present" || a.status === "clocked_out"
  )
  const late = todayAttendance.filter((a) => a.status === "late")
  const absent = todayAttendance.filter((a) => a.status === "absent")
  const onLeave = todayAttendance.filter((a) => a.status === "leave")

  const hasRealData = todayAttendance.length > 0

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.kpiScrollWrap}
        contentContainerStyle={s.kpiStrip}
      >
        <KPIPill
          value={String(attendanceKpi.present)}
          label="Present"
          valueColor={attendanceKpi.present > 0 ? colors.green : undefined}
        />
        <KPIPill
          value={String(attendanceKpi.late)}
          label="Late"
          valueColor={attendanceKpi.late > 0 ? colors.amber : undefined}
        />
        <KPIPill
          value={String(attendanceKpi.absent)}
          label="Absent"
          valueColor={attendanceKpi.absent > 0 ? colors.red : undefined}
        />
        <KPIPill value={String(attendanceKpi.total)} label="Total" />
      </ScrollView>

      {hasRealData ? (
        <>
          {present.length > 0 ? (
            <>
              <SectionHeader title="Present" />
              <ListCard>
                {present.map((a, i) => (
                  <AttendanceItemRow key={a.id} item={a} last={i === present.length - 1} />
                ))}
              </ListCard>
            </>
          ) : null}

          {late.length > 0 ? (
            <>
              <SectionHeader title="Late" />
              <ListCard>
                {late.map((a, i) => (
                  <AttendanceItemRow key={a.id} item={a} last={i === late.length - 1} />
                ))}
              </ListCard>
            </>
          ) : null}

          {onLeave.length > 0 ? (
            <>
              <SectionHeader title="On Leave" />
              <ListCard>
                {onLeave.map((a, i) => (
                  <AttendanceItemRow key={a.id} item={a} last={i === onLeave.length - 1} />
                ))}
              </ListCard>
            </>
          ) : null}

          {absent.length > 0 ? (
            <>
              <SectionHeader title="Absent" />
              <ListCard>
                {absent.map((a, i) => (
                  <AttendanceItemRow key={a.id} item={a} last={i === absent.length - 1} />
                ))}
              </ListCard>
            </>
          ) : null}
        </>
      ) : (
        <>
          {(() => {
            const active = attendance.filter((a) => a.isActiveToday)
            const inactive = attendance.filter((a) => !a.isActiveToday)
            return (
              <>
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
                    No check-in records for today. Showing activity-based presence.
                  </Text>
                </View>
              </>
            )
          })()}
        </>
      )}
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
          {segment === "org" && <OrgContent data={data} />}
        </ScrollView>
      )}

      <FABWithSheets />
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

  // Status badge (universal)
  statusBadge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "600" },

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

  // Shift card
  shiftCard: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: spacing.base,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  shiftCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  shiftTimeBlock: { flex: 1 },
  shiftTime: { fontSize: 13, fontWeight: "700", color: colors.text1, letterSpacing: -0.2 },
  shiftLocation: { fontSize: 11, color: colors.text3, marginTop: 2 },
  shiftTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text1,
    marginBottom: spacing.md,
  },
  shiftFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shiftRoleBadge: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  shiftRoleText: { fontSize: 11, fontWeight: "600", color: colors.text2 },
  shiftFooterRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  assigneeStack: { flexDirection: "row", alignItems: "center" },
  assigneeAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1.5,
    borderColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  assigneeInitials: { fontSize: 8, fontWeight: "700", color: "rgba(255,255,255,0.7)" },
  coverageText: { fontSize: 12, fontWeight: "600" },

  // Attendance badges (legacy)
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

  // Org chart
  orgRootCard: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: spacing.base,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  orgRootIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  orgRootIconText: { fontSize: 18, color: colors.text1 },
  orgRootInfo: { flex: 1, gap: 2 },
  orgRootName: { fontSize: 15, fontWeight: "700", color: colors.text1 },
  orgRootSub: { fontSize: 12, color: colors.text3 },

  orgBranch: { marginBottom: spacing.sm },
  orgBranchConnector: {
    width: 2,
    height: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginLeft: 19,
    marginBottom: 0,
  },
  orgDeptCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingHorizontal: spacing.base,
    paddingVertical: 11,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  orgDeptName: { fontSize: 14, fontWeight: "600", color: colors.text2 },
  orgDeptRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  orgDeptCount: { fontSize: 14, fontWeight: "700", color: colors.text1 },
  orgDeptTag: { fontSize: 11, fontWeight: "500" },

  orgMembersCard: {
    backgroundColor: "rgba(255,255,255,0.025)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    overflow: "hidden",
    marginLeft: 20,
    marginTop: 2,
    borderTopLeftRadius: 4,
  },
  orgMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
    gap: spacing.sm,
  },
  orgMemberBranch: {
    width: 12,
    height: 32,
    flexShrink: 0,
    position: "relative",
  },
  orgBranchV: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 16,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  orgBranchH: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 15,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  onlineDotSmall: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },

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
