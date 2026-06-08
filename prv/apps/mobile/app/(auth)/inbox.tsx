import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useState } from "react"
import Svg, { Path } from "react-native-svg"
import {
  useInbox,
  useMarkRead,
  useMarkAllRead,
  formatTimeAgo,
  getItemIcon,
  getRowTint,
  getBadge,
  groupBySections,
  type InboxFilter,
  type InboxItem,
} from "@/hooks/useInbox"
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

const FILTERS: { key: InboxFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "alerts", label: "Alerts" },
  { key: "approvals", label: "Approvals" },
  { key: "messages", label: "Messages" },
  { key: "tasks", label: "Tasks" },
  { key: "system", label: "System" },
]

function ItemAvatar({ item }: { item: InboxItem }) {
  const icon = getItemIcon(item)
  const senderName = item.metadata?.senderName as string | undefined

  if (!icon && senderName) {
    const parts = senderName.trim().split(" ")
    const initials = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase()
    return (
      <View style={s.avatar}>
        <Text style={s.avatarInitials}>{initials}</Text>
        {!item.isRead && <View style={s.unreadDot} />}
      </View>
    )
  }

  return (
    <View style={s.avatarIcon}>
      <Text style={s.avatarIconText}>{icon ?? "●"}</Text>
    </View>
  )
}

function BadgeChip({ label, variant }: { label: string; variant: string }) {
  const variantStyle =
    variant === "alert"
      ? s.badgeAlert
      : variant === "approval"
        ? s.badgeApproval
        : variant === "task"
          ? s.badgeTask
          : s.badgeSystem
  return (
    <View style={[s.badge, variantStyle]}>
      <Text style={[s.badgeText, variantStyle]}>{label}</Text>
    </View>
  )
}

function NotifRow({
  item,
  last,
  onPress,
}: {
  item: InboxItem
  last: boolean
  onPress: () => void
}) {
  const tint = getRowTint(item)
  const badge = getBadge(item)
  const icon = getItemIcon(item)
  const senderName = item.metadata?.senderName as string | undefined
  const subject = item.title
  const preview = item.body

  return (
    <TouchableOpacity
      style={[s.row, !last && s.rowBorder, tint ? { backgroundColor: tint } : null]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <ItemAvatar item={item} />
      <View style={s.rowBody}>
        <View style={s.rowTop}>
          <Text style={[s.rowSender, item.isRead && s.rowSenderRead]} numberOfLines={1}>
            {senderName ?? subject}
          </Text>
          <Text style={s.rowTime}>{formatTimeAgo(item.createdAt)}</Text>
        </View>
        {senderName && (
          <Text style={s.rowSubject} numberOfLines={1}>
            {subject}
          </Text>
        )}
        {preview ? (
          <Text style={s.rowPreview} numberOfLines={1}>
            {preview}
          </Text>
        ) : null}
        {badge && <BadgeChip label={badge.label} variant={badge.variant} />}
      </View>
      {!icon && !item.isRead && <View style={s.unreadIndicator} />}
    </TouchableOpacity>
  )
}

function SectionGroup({
  label,
  items,
  onPressItem,
}: {
  label: string
  items: InboxItem[]
  onPressItem: (item: InboxItem) => void
}) {
  return (
    <>
      <Text style={s.sectionLabel}>{label}</Text>
      <View style={s.card}>
        {items.map((item, i) => (
          <NotifRow
            key={item.id}
            item={item}
            last={i === items.length - 1}
            onPress={() => onPressItem(item)}
          />
        ))}
      </View>
    </>
  )
}

function EmptyState({ filter }: { filter: InboxFilter }) {
  const msg =
    filter === "unread"
      ? "You're all caught up"
      : filter === "alerts"
        ? "No active alerts"
        : filter === "approvals"
          ? "No pending approvals"
          : "Nothing here yet"
  return (
    <View style={s.empty}>
      <Text style={s.emptyIcon}>◎</Text>
      <Text style={s.emptyTitle}>{msg}</Text>
      <Text style={s.emptyDesc}>New items will appear here automatically</Text>
    </View>
  )
}

export default function InboxScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [filter, setFilter] = useState<InboxFilter>("all")

  const { data, isLoading, refetch } = useInbox(filter)
  const { mutate: markRead } = useMarkRead()
  const { mutate: markAllRead, isPending: markingAll } = useMarkAllRead()

  function handleItemPress(item: InboxItem) {
    if (!item.isRead) markRead(item.id)
  }

  const sections = filter === "all" && data ? groupBySections(data.items) : null
  const flatItems = filter !== "all" && data ? data.items : null

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft />
          <Text style={s.backLabel}>Command</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.title}>Inbox</Text>
          {(data?.unreadCount ?? 0) > 0 && (
            <View style={s.titleBadge}>
              <Text style={s.titleBadgeText}>{data!.unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={{ minWidth: 72 }} />
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filtersContent}
        style={s.filters}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[s.chip, filter === f.key && s.chipActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.75}
          >
            {filter === f.key && <View style={s.chipDot} />}
            <Text style={[s.chipText, filter === f.key && s.chipTextActive]}>
              {f.key === "unread" && (data?.unreadCount ?? 0) > 0
                ? `Unread · ${data!.unreadCount}`
                : f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Mark all read */}
      {(data?.unreadCount ?? 0) > 0 && (
        <TouchableOpacity
          style={s.markAllRow}
          onPress={() => markAllRead()}
          disabled={markingAll}
          activeOpacity={0.6}
        >
          <Text style={s.markAllText}>{markingAll ? "Marking…" : "Mark all as read"}</Text>
        </TouchableOpacity>
      )}

      {/* Body */}
      {isLoading ? (
        <View style={s.loader}>
          <ActivityIndicator color={colors.text3} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          onScrollEndDrag={() => refetch()}
        >
          {/* Grouped sections for "all" filter */}
          {sections &&
            sections.length > 0 &&
            sections.map((sec) => (
              <SectionGroup
                key={sec.key}
                label={sec.label}
                items={sec.data}
                onPressItem={handleItemPress}
              />
            ))}

          {/* Flat list for specific filters */}
          {flatItems && flatItems.length > 0 && (
            <View style={s.card}>
              {flatItems.map((item, i) => (
                <NotifRow
                  key={item.id}
                  item={item}
                  last={i === flatItems.length - 1}
                  onPress={() => handleItemPress(item)}
                />
              ))}
            </View>
          )}

          {/* Empty state */}
          {data && data.items.length === 0 && <EmptyState filter={filter} />}
        </ScrollView>
      )}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 72 },
  backLabel: { ...t.body, color: colors.text2 },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  title: { ...t.headline, color: colors.text1 },
  titleBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.88)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  titleBadgeText: { fontSize: 12, fontWeight: "700", color: "#000" },

  /* Filters */
  filters: { flexGrow: 0 },
  filtersContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  chip: {
    height: 30,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  chipActive: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.22)",
  },
  chipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.text1 },
  chipText: { ...t.footnote, color: colors.text2 },
  chipTextActive: { color: colors.text1, fontWeight: "600" },

  /* Mark all read */
  markAllRow: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 2, alignItems: "flex-end" },
  markAllText: { ...t.footnote, color: colors.text3 },

  /* Loader */
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },

  /* Scroll */
  scroll: { paddingHorizontal: 16, paddingTop: 12 },

  /* Section label */
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text3,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 16,
    paddingLeft: 4,
  },

  /* Card */
  card: {
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 6,
    marginBottom: 4,
  },

  /* Row */
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },

  /* Avatar */
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    position: "relative",
  },
  avatarInitials: { fontSize: 15, fontWeight: "700", color: colors.text1 },
  avatarIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarIconText: { fontSize: 17 },
  unreadDot: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.text1,
    borderWidth: 2,
    borderColor: colors.bg,
  },

  /* Row body */
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  rowSender: { ...t.subhead, fontWeight: "600", color: colors.text1, flex: 1, marginRight: 8 },
  rowSenderRead: { color: colors.text2, fontWeight: "500" },
  rowTime: { ...t.caption1, color: colors.text3, flexShrink: 0 },
  rowSubject: { ...t.footnote, fontWeight: "500", color: colors.text2, marginBottom: 2 },
  rowPreview: { ...t.footnote, color: colors.text3 },

  /* Unread indicator (for message rows that use initials avatar) */
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text1,
    flexShrink: 0,
    marginTop: 4,
  },

  /* Badge */
  badge: {
    alignSelf: "flex-start",
    height: 18,
    paddingHorizontal: 7,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },
  badgeText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.4 },
  badgeAlert: { backgroundColor: "rgba(255,80,80,0.22)", color: "rgba(255,120,120,0.9)" },
  badgeApproval: { backgroundColor: "rgba(255,200,80,0.18)", color: "rgba(255,200,80,0.85)" },
  badgeTask: { backgroundColor: "rgba(255,255,255,0.12)", color: colors.text2 },
  badgeSystem: { backgroundColor: "rgba(255,255,255,0.07)", color: colors.text3 },

  /* Empty state */
  empty: {
    marginTop: 48,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 10,
    borderRadius: radius.card,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  emptyIcon: { fontSize: 40, opacity: 0.25 },
  emptyTitle: { ...t.headline, color: colors.text2 },
  emptyDesc: { ...t.footnote, color: colors.text3, textAlign: "center", lineHeight: 18 },
})
