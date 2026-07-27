import { useEffect } from "react"
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  useClientNotifications,
  useMarkNotificationsSeen,
  type ClientNotification,
} from "@/hooks/useClientPortal"
import { colors, radius, spacing, type as t } from "@/tokens"

// Client notifications sheet (preview approved 2026-07): the feed is derived
// server-side from client-visible entities. Opening the sheet marks all seen.

const KIND_GLYPH: Record<ClientNotification["kind"], string> = {
  site_report: "◎",
  quote: "◇",
  invoice: "⊟",
  contract: "≡",
  document: "⊞",
  message: "✉",
}

function when(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  if (sameDay)
    return `Today, ${d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}`
  return d.toLocaleDateString("ro-RO", { day: "numeric", month: "short" })
}

export function ClientNotificationsSheet({
  visible,
  onClose,
}: {
  visible: boolean
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()
  const { data, isLoading } = useClientNotifications()
  const markSeen = useMarkNotificationsSeen()

  useEffect(() => {
    if (visible) markSeen.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const items = data?.items ?? []

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.shine} pointerEvents="none" />
          <View style={s.handleRow}>
            <View style={s.handle} />
          </View>
          <View style={s.header}>
            <Text style={s.title}>Notifications</Text>
            <TouchableOpacity
              style={s.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityLabel="Close"
            >
              <Text style={s.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <Text style={s.emptyText}>Loading…</Text>
            ) : items.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyGlyph}>◌</Text>
                <Text style={s.emptyTitle}>Nothing yet</Text>
                <Text style={s.emptyText}>
                  Progress updates, quotes, invoices and shared documents will appear here.
                </Text>
              </View>
            ) : (
              <View style={s.list}>
                {items.map((n, i) => (
                  <View key={n.id} style={[s.row, i > 0 && s.rowBorder]}>
                    <View style={s.icon}>
                      <Text style={s.iconGlyph}>{KIND_GLYPH[n.kind]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowTitle}>{n.title}</Text>
                      <Text style={s.rowBody} numberOfLines={2}>
                        {n.body}
                      </Text>
                      <Text style={s.rowWhen}>{when(n.date)}</Text>
                    </View>
                    {n.unread && <View style={s.unreadDot} accessibilityLabel="Unread" />}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    backgroundColor: "rgba(28,28,30,0.97)",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.borderSubtle,
    maxHeight: "80%",
    overflow: "hidden",
  },
  shine: {
    position: "absolute",
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  handleRow: { alignItems: "center", paddingTop: 12, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: { ...t.headline, color: colors.text1 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: { fontSize: 13, color: colors.text3 },
  body: { paddingHorizontal: spacing.lg },
  list: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.card,
    overflow: "hidden",
    marginBottom: spacing.base,
  },
  row: { flexDirection: "row", gap: 11, padding: 12, alignItems: "flex-start" },
  rowBorder: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGlyph: { fontSize: 13, color: colors.text2 },
  rowTitle: { ...t.footnote, fontWeight: "600", color: colors.text1 },
  rowBody: { ...t.caption1, color: colors.text2, marginTop: 2, lineHeight: 16 },
  rowWhen: { ...t.caption2, color: colors.text3, marginTop: 3 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#fff", marginTop: 6 },
  empty: { alignItems: "center", paddingVertical: 30 },
  emptyGlyph: { fontSize: 22, color: colors.text3 },
  emptyTitle: { ...t.headline, color: colors.text1, marginTop: 8 },
  emptyText: {
    ...t.footnote,
    color: colors.text2,
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
})
