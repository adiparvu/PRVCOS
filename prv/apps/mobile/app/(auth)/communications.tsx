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
  useChannels,
  useDmConversations,
  useAnnouncements,
  type Channel,
  type DmConversation,
  type Announcement,
} from "@/hooks/useCommunications"
import { colors, radius, spacing, type as t } from "@/tokens"

type Segment = "channels" | "dms" | "announcements"

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: "channels", label: "Channels" },
  { key: "dms", label: "Messages" },
  { key: "announcements", label: "Announcements" },
]

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

function ChevronRight() {
  return (
    <Svg width={7} height={12} viewBox="0 0 7 12" fill="none">
      <Path
        d="M1 1L6 6L1 11"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function formatTime(iso: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = diffMs / 3_600_000
  if (diffH < 1) return `${Math.max(1, Math.floor(diffMs / 60_000))}m`
  if (diffH < 24) return `${Math.floor(diffH)}h`
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

function ChannelIcon({ type }: { type: Channel["type"] }) {
  const label = type === "private" ? "⌇" : type === "announcement" ? "◉" : "#"
  return (
    <View style={s.icon}>
      <Text style={s.iconText}>{label}</Text>
    </View>
  )
}

function ChannelRow({
  channel,
  last,
  onPress,
}: {
  channel: Channel
  last: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={[s.row, !last && s.rowBorder]} onPress={onPress} activeOpacity={0.75}>
      <ChannelIcon type={channel.type} />
      <View style={s.rowBody}>
        <View style={s.rowTop}>
          <Text style={s.rowTitle} numberOfLines={1}>
            {channel.name}
          </Text>
          <Text style={s.rowTime}>{formatTime(channel.lastMessageAt)}</Text>
        </View>
        {channel.lastMessagePreview ? (
          <Text style={s.rowSub} numberOfLines={1}>
            {channel.lastMessagePreview}
          </Text>
        ) : (
          <Text style={s.rowSubMuted}>No messages yet</Text>
        )}
      </View>
      <ChevronRight />
    </TouchableOpacity>
  )
}

function DmInitials({ conversation }: { conversation: DmConversation }) {
  const other = conversation.participants[0]
  const initials = other
    ? ((other.firstName[0] ?? "") + (other.lastName[0] ?? "")).toUpperCase()
    : "?"
  return (
    <View style={s.avatar}>
      <Text style={s.avatarText}>{initials}</Text>
    </View>
  )
}

function DmRow({
  conv,
  last,
  onPress,
}: {
  conv: DmConversation
  last: boolean
  onPress: () => void
}) {
  const other = conv.participants[0]
  const name = other ? `${other.firstName} ${other.lastName}` : "Unknown"
  return (
    <TouchableOpacity style={[s.row, !last && s.rowBorder]} onPress={onPress} activeOpacity={0.75}>
      <DmInitials conversation={conv} />
      <View style={s.rowBody}>
        <View style={s.rowTop}>
          <Text style={s.rowTitle} numberOfLines={1}>
            {name}
          </Text>
          <Text style={s.rowTime}>{formatTime(conv.lastMessageAt)}</Text>
        </View>
        {conv.lastMessagePreview ? (
          <Text style={s.rowSub} numberOfLines={1}>
            {conv.lastMessagePreview}
          </Text>
        ) : (
          <Text style={s.rowSubMuted}>No messages yet</Text>
        )}
      </View>
      <ChevronRight />
    </TouchableOpacity>
  )
}

function AnnouncementRow({
  ann,
  last,
  onPress,
}: {
  ann: Announcement
  last: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={[s.row, !last && s.rowBorder]} onPress={onPress} activeOpacity={0.75}>
      <View style={[s.icon, ann.isPinned && s.iconPinned]}>
        <Text style={s.iconText}>{ann.isPinned ? "◈" : "◎"}</Text>
      </View>
      <View style={s.rowBody}>
        <View style={s.rowTop}>
          <Text style={[s.rowTitle, !ann.isRead && s.rowTitleUnread]} numberOfLines={1}>
            {ann.title}
          </Text>
          <Text style={s.rowTime}>{formatTime(ann.publishedAt ?? ann.createdAt)}</Text>
        </View>
        <Text style={s.rowSub} numberOfLines={1}>
          {ann.body}
        </Text>
      </View>
      {!ann.isRead && <View style={s.unreadDot} />}
    </TouchableOpacity>
  )
}

function EmptyCard({ label }: { label: string }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyIcon}>◎</Text>
      <Text style={s.emptyText}>{label}</Text>
    </View>
  )
}

export default function CommunicationsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [segment, setSegment] = useState<Segment>("channels")

  const { data: channelsData, isLoading: loadingCh } = useChannels()
  const { data: dmsData, isLoading: loadingDm } = useDmConversations()
  const { data: annsData, isLoading: loadingAn } = useAnnouncements()

  const channels = channelsData?.channels ?? []
  const dms = dmsData?.conversations ?? []
  const announcements = annsData?.announcements ?? []

  const loading =
    (segment === "channels" && loadingCh) ||
    (segment === "dms" && loadingDm) ||
    (segment === "announcements" && loadingAn)

  function handleChannelPress(ch: Channel) {
    router.push({
      pathname: "/(auth)/channel-messages",
      params: { channelId: ch.id, name: ch.name },
    })
  }

  function handleDmPress(conv: DmConversation) {
    const other = conv.participants[0]
    const name = other ? `${other.firstName} ${other.lastName}` : "Message"
    router.push({
      pathname: "/(auth)/dm-conversation",
      params: { conversationId: conv.id, name },
    })
  }

  function handleAnnouncementPress(ann: Announcement) {
    router.push({
      pathname: "/(auth)/announcement-detail",
      params: { announcementId: ann.id },
    })
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft />
          <Text style={s.backLabel}>Command</Text>
        </TouchableOpacity>
        <Text style={s.title}>Communications</Text>
        <View style={{ minWidth: 72 }} />
      </View>

      {/* Segments */}
      <View style={s.segmentWrap}>
        {SEGMENTS.map((seg) => (
          <TouchableOpacity
            key={seg.key}
            style={[s.segBtn, segment === seg.key && s.segBtnActive]}
            onPress={() => setSegment(seg.key)}
            activeOpacity={0.75}
          >
            <Text style={[s.segLabel, segment === seg.key && s.segLabelActive]}>{seg.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Body */}
      {loading ? (
        <View style={s.loader}>
          <ActivityIndicator color={colors.text3} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Channels */}
          {segment === "channels" &&
            (channels.length > 0 ? (
              <View style={s.card}>
                {channels.map((ch, i) => (
                  <ChannelRow
                    key={ch.id}
                    channel={ch}
                    last={i === channels.length - 1}
                    onPress={() => handleChannelPress(ch)}
                  />
                ))}
              </View>
            ) : (
              <EmptyCard label="No channels yet" />
            ))}

          {/* DMs */}
          {segment === "dms" &&
            (dms.length > 0 ? (
              <View style={s.card}>
                {dms.map((conv, i) => (
                  <DmRow
                    key={conv.id}
                    conv={conv}
                    last={i === dms.length - 1}
                    onPress={() => handleDmPress(conv)}
                  />
                ))}
              </View>
            ) : (
              <EmptyCard label="No conversations yet" />
            ))}

          {/* Announcements */}
          {segment === "announcements" &&
            (announcements.length > 0 ? (
              <View style={s.card}>
                {announcements.map((ann, i) => (
                  <AnnouncementRow
                    key={ann.id}
                    ann={ann}
                    last={i === announcements.length - 1}
                    onPress={() => handleAnnouncementPress(ann)}
                  />
                ))}
              </View>
            ) : (
              <EmptyCard label="No announcements" />
            ))}
        </ScrollView>
      )}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 72 },
  backLabel: { ...t.body, color: colors.text2 },
  title: { flex: 1, textAlign: "center", ...t.headline, color: colors.text1 },

  segmentWrap: {
    flexDirection: "row",
    marginHorizontal: spacing.base,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: colors.glass1,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  segBtnActive: {
    backgroundColor: colors.glass2,
  },
  segLabel: { ...t.footnote, color: colors.text3 },
  segLabelActive: { color: colors.text1, fontWeight: "600" },

  loader: { flex: 1, alignItems: "center", justifyContent: "center" },

  scroll: { paddingHorizontal: spacing.base, paddingTop: 12 },

  card: {
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 5,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },

  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconPinned: { backgroundColor: "rgba(255,255,255,0.12)", borderColor: colors.shine },
  iconText: { fontSize: 18, color: colors.text1 },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 15, fontWeight: "700", color: colors.text1 },

  rowBody: { flex: 1, minWidth: 0 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  rowTitle: { ...t.subhead, color: colors.text2, flex: 1, marginRight: 8 },
  rowTitleUnread: { color: colors.text1, fontWeight: "600" },
  rowTime: { ...t.caption1, color: colors.text3, flexShrink: 0 },
  rowSub: { ...t.footnote, color: colors.text3 },
  rowSubMuted: { ...t.footnote, color: colors.text4, fontStyle: "italic" },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text1,
    flexShrink: 0,
  },

  empty: {
    marginTop: 32,
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 10,
    borderRadius: radius.card,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  emptyIcon: { fontSize: 36, opacity: 0.2 },
  emptyText: { ...t.subhead, color: colors.text3 },
})
