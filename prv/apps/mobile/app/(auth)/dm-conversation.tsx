import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useState, useRef, useCallback } from "react"
import Svg, { Path } from "react-native-svg"
import { useDmMessages, useSendDmMessage, type DmMessage } from "@/hooks/useCommunications"
import { useAuthStore } from "@/store/auth"
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

function SendIcon({ active }: { active: boolean }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M18 10L2 2L6 10L2 18L18 10Z"
        fill={active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.25)"}
      />
    </Svg>
  )
}

function formatMsgTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isSameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (isSameDay) {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  }
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

function getInitials(first: string | null, last: string | null) {
  return ((first?.[0] ?? "") + (last?.[0] ?? "")).toUpperCase() || "?"
}

function DmBubble({ msg, isMine }: { msg: DmMessage; isMine: boolean }) {
  const initials = getInitials(msg.authorFirstName, msg.authorLastName)

  if (isMine) {
    return (
      <View style={[s.bubbleRow, s.bubbleRowMine]}>
        <View style={[s.bubble, s.bubbleMine]}>
          <Text style={s.bubbleTextMine}>{msg.content}</Text>
          {msg.editedAt && <Text style={s.edited}>edited</Text>}
        </View>
        <Text style={s.timeStamp}>{formatMsgTime(msg.createdAt)}</Text>
      </View>
    )
  }

  return (
    <View style={s.bubbleRow}>
      <View style={s.otherAvatar}>
        <Text style={s.otherAvatarText}>{initials}</Text>
      </View>
      <View style={s.bubbleGroup}>
        <View style={[s.bubble, s.bubbleOther]}>
          <Text style={s.bubbleTextOther}>{msg.content}</Text>
          {msg.editedAt && <Text style={s.edited}>edited</Text>}
        </View>
        <Text style={s.timeStamp}>{formatMsgTime(msg.createdAt)}</Text>
      </View>
    </View>
  )
}

function LoadMoreButton({ onPress, loading }: { onPress: () => void; loading: boolean }) {
  return (
    <TouchableOpacity style={s.loadMore} onPress={onPress} activeOpacity={0.7} disabled={loading}>
      {loading ? (
        <ActivityIndicator size="small" color={colors.text3} />
      ) : (
        <Text style={s.loadMoreText}>Load earlier messages</Text>
      )}
    </TouchableOpacity>
  )
}

export default function DmConversationScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { conversationId, name } = useLocalSearchParams<{
    conversationId: string
    name: string
  }>()
  const [draft, setDraft] = useState("")
  const listRef = useRef<FlatList>(null)

  const myUserId = useAuthStore((s) => s.session?.userId)

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useDmMessages(
    conversationId ?? ""
  )
  const { mutate: send, isPending: sending } = useSendDmMessage(conversationId ?? "")

  const allMessages = data?.pages.flatMap((p) => p.messages).reverse() ?? []

  const handleSend = useCallback(() => {
    const content = draft.trim()
    if (!content || sending) return
    setDraft("")
    send(
      { content },
      {
        onSuccess: () => {
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
        },
      }
    )
  }, [draft, sending, send])

  function renderItem({ item }: { item: DmMessage }) {
    const isMine = !!myUserId && item.authorId === myUserId
    return <DmBubble msg={item} isMine={isMine} />
  }

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft />
          <Text style={s.backLabel}>Back</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={s.headerAvatar}>
            <Text style={s.headerAvatarText}>
              {((name?.[0] ?? "") + (name?.split(" ")[1]?.[0] ?? "")).toUpperCase()}
            </Text>
          </View>
          <Text style={s.headerName} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <View style={{ minWidth: 72 }} />
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={s.loader}>
          <ActivityIndicator color={colors.text3} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={allMessages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={[s.list, { paddingBottom: 8 }]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={
            hasNextPage ? (
              <LoadMoreButton onPress={() => fetchNextPage()} loading={isFetchingNextPage} />
            ) : null
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>◎</Text>
              <Text style={s.emptyText}>No messages yet</Text>
              <Text style={s.emptySub}>Start the conversation</Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={s.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={`Message ${name ?? ""}`}
          placeholderTextColor={colors.text3}
          multiline
          maxLength={4000}
          returnKeyType="default"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[s.sendBtn, draft.trim() && s.sendBtnActive]}
          onPress={handleSend}
          activeOpacity={0.7}
          disabled={!draft.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.text3} />
          ) : (
            <SendIcon active={!!draft.trim()} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  headerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { fontSize: 11, fontWeight: "700", color: colors.text1 },
  headerName: { ...t.headline, color: colors.text1, flexShrink: 1 },

  loader: { flex: 1, alignItems: "center", justifyContent: "center" },

  list: { paddingHorizontal: spacing.base, paddingTop: 12, flexGrow: 1 },

  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 6,
  },
  bubbleRowMine: { flexDirection: "column", alignItems: "flex-end" },

  otherAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginBottom: 16,
  },
  otherAvatarText: { fontSize: 11, fontWeight: "700", color: colors.text1 },

  bubbleGroup: { alignItems: "flex-start", gap: 2 },

  bubble: {
    maxWidth: 280,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.panel,
  },
  bubbleMine: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: colors.shine,
    borderBottomRightRadius: radius.xs,
  },
  bubbleOther: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderBottomLeftRadius: radius.xs,
  },
  bubbleTextMine: { ...t.body, color: colors.text1, lineHeight: 22 },
  bubbleTextOther: { ...t.body, color: colors.text1, lineHeight: 22 },
  edited: { ...t.caption2, color: colors.text4, marginTop: 3 },

  timeStamp: { ...t.caption2, color: colors.text3, paddingHorizontal: 4 },

  loadMore: { alignItems: "center", paddingVertical: 14, marginBottom: 4 },
  loadMoreText: { ...t.footnote, color: colors.text3 },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 8,
  },
  emptyIcon: { fontSize: 36, opacity: 0.2 },
  emptyText: { ...t.headline, color: colors.text2 },
  emptySub: { ...t.footnote, color: colors.text3 },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: spacing.base,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: colors.glass1,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...t.body,
    color: colors.text1,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnActive: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: colors.shine,
  },
})
