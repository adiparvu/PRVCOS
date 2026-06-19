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
import { useEffect } from "react"
import Svg, { Path } from "react-native-svg"
import { useAnnouncement, useMarkAnnouncementRead } from "@/hooks/useCommunications"
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

const AUDIENCE_LABELS: Record<string, string> = {
  all: "Everyone",
  managers: "Managers",
  employees: "Employees",
  department: "Department",
  team: "Team",
}

function formatDate(iso: string | null) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getInitials(first: string | null, last: string | null) {
  return ((first?.[0] ?? "") + (last?.[0] ?? "")).toUpperCase() || "?"
}

export default function AnnouncementDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { announcementId } = useLocalSearchParams<{ announcementId: string }>()

  const { data, isLoading } = useAnnouncement(announcementId ?? "")
  const { mutate: markRead } = useMarkAnnouncementRead()

  const ann = data?.announcement

  useEffect(() => {
    if (ann && !ann.isRead) {
      markRead(ann.id)
    }
  }, [ann?.id, ann?.isRead])

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft />
          <Text style={s.backLabel}>Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>
          Announcement
        </Text>
        <View style={{ minWidth: 72 }} />
      </View>

      {isLoading || !ann ? (
        <View style={s.loader}>
          <ActivityIndicator color={colors.text3} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Title card */}
          <View style={s.titleCard}>
            <View style={s.titleRow}>
              <View style={[s.pinBadge, ann.isPinned && s.pinBadgeActive]}>
                <Text style={s.pinBadgeText}>{ann.isPinned ? "◈ Pinned" : "◎ Announcement"}</Text>
              </View>
              <Text style={s.audienceTag}>{AUDIENCE_LABELS[ann.audience] ?? ann.audience}</Text>
            </View>
            <Text style={s.title}>{ann.title}</Text>
          </View>

          {/* Author + date */}
          <View style={s.metaCard}>
            <View style={s.authorRow}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>
                  {getInitials(ann.authorFirstName, ann.authorLastName)}
                </Text>
              </View>
              <View style={s.authorInfo}>
                <Text style={s.authorName}>
                  {ann.authorFirstName
                    ? `${ann.authorFirstName} ${ann.authorLastName ?? ""}`.trim()
                    : "System"}
                </Text>
                <Text style={s.publishedAt}>{formatDate(ann.publishedAt ?? ann.createdAt)}</Text>
              </View>
            </View>
            {/* Read stats */}
            {ann.totalAudience > 0 && (
              <View style={s.statsRow}>
                <View style={s.statItem}>
                  <Text style={s.statValue}>{ann.readCount}</Text>
                  <Text style={s.statLabel}>Read</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={s.statValue}>{ann.totalAudience}</Text>
                  <Text style={s.statLabel}>Recipients</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={s.statValue}>
                    {Math.round((ann.readCount / ann.totalAudience) * 100)}%
                  </Text>
                  <Text style={s.statLabel}>Open rate</Text>
                </View>
              </View>
            )}
          </View>

          {/* Body */}
          <View style={s.bodyCard}>
            <Text style={s.body}>{ann.body}</Text>
          </View>

          {/* Email badge */}
          {ann.sendEmail && (
            <View style={s.emailBadge}>
              <Text style={s.emailBadgeText}>◉ Also sent by email</Text>
            </View>
          )}
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
  headerTitle: { flex: 1, textAlign: "center", ...t.headline, color: colors.text1 },

  loader: { flex: 1, alignItems: "center", justifyContent: "center" },

  scroll: { paddingHorizontal: spacing.base, paddingTop: 20, gap: 12 },

  titleCard: {
    backgroundColor: colors.glass1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pinBadge: {
    backgroundColor: colors.glass2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pinBadgeActive: {
    borderColor: colors.shine,
  },
  pinBadgeText: { ...t.caption1, color: colors.text2 },
  audienceTag: {
    ...t.caption1,
    color: colors.text3,
    marginLeft: "auto",
  },
  title: { ...t.title2, color: colors.text1 },

  metaCard: {
    backgroundColor: colors.glass1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 16,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
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
  avatarText: { fontSize: 14, fontWeight: "700", color: colors.text1 },
  authorInfo: { gap: 2 },
  authorName: { ...t.subhead, fontWeight: "600", color: colors.text1 },
  publishedAt: { ...t.footnote, color: colors.text3 },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { ...t.title3, color: colors.text1 },
  statLabel: { ...t.caption2, color: colors.text3 },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderSubtle,
  },

  bodyCard: {
    backgroundColor: colors.glass1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  body: { ...t.body, color: colors.text1, lineHeight: 26 },

  emailBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.glass1,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  emailBadgeText: { ...t.footnote, color: colors.text3 },
})
