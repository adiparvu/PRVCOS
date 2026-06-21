import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useState, useRef, useCallback } from "react"
import Svg, { Path } from "react-native-svg"
import { useAuthStore } from "@/store/auth"
import { colors, radius, spacing, type as t } from "@/tokens"

// ─── Agent Types ──────────────────────────────────────────────────────────────

const AGENT_TYPES = [
  "General",
  "Finance",
  "HR",
  "Projects",
  "Renovation",
  "Report Builder",
] as const
type AgentType = (typeof AGENT_TYPES)[number]

// ─── Message Types ────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  messageId?: string // from X-Message-Id header or response body
  feedback?: "up" | "down" | null
}

// ─── Icons ────────────────────────────────────────────────────────────────────

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

function ThumbUpIcon({ active }: { active: boolean }) {
  const fill = active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.30)"
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"
        fill={fill}
      />
      <Path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" fill={fill} />
    </Svg>
  )
}

function ThumbDownIcon({ active }: { active: boolean }) {
  const fill = active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.30)"
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"
        fill={fill}
      />
      <Path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" fill={fill} />
    </Svg>
  )
}

// ─── Agent Selector ───────────────────────────────────────────────────────────

function AgentSelector({
  selected,
  onSelect,
}: {
  selected: AgentType
  onSelect: (a: AgentType) => void
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.agentRow}
      style={s.agentScroll}
    >
      {AGENT_TYPES.map((agent) => {
        const isActive = agent === selected
        return (
          <Pressable
            key={agent}
            onPress={() => onSelect(agent)}
            style={({ pressed }) => [
              s.agentPill,
              isActive ? s.agentPillActive : s.agentPillInactive,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text
              style={[s.agentPillText, isActive ? s.agentPillTextActive : s.agentPillTextInactive]}
            >
              {agent}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

// ─── Feedback Buttons ─────────────────────────────────────────────────────────

function FeedbackButtons({
  messageId,
  currentFeedback,
  onFeedback,
}: {
  messageId: string | undefined
  currentFeedback: "up" | "down" | null | undefined
  onFeedback: (rating: "up" | "down") => void
}) {
  if (!messageId) return null

  return (
    <View style={s.feedbackRow}>
      <Pressable
        onPress={() => onFeedback("up")}
        style={({ pressed }) => [s.feedbackBtn, pressed && { opacity: 0.6 }]}
        hitSlop={8}
      >
        <ThumbUpIcon active={currentFeedback === "up"} />
      </Pressable>
      <Pressable
        onPress={() => onFeedback("down")}
        style={({ pressed }) => [s.feedbackBtn, pressed && { opacity: 0.6 }]}
        hitSlop={8}
      >
        <ThumbDownIcon active={currentFeedback === "down"} />
      </Pressable>
    </View>
  )
}

// ─── Chat Bubble ──────────────────────────────────────────────────────────────

function ChatBubble({
  msg,
  onFeedback,
}: {
  msg: ChatMessage
  onFeedback: (msgId: string, rating: "up" | "down") => void
}) {
  const isUser = msg.role === "user"

  if (isUser) {
    return (
      <View style={[s.bubbleWrap, s.bubbleWrapUser]}>
        <View style={[s.bubble, s.bubbleUser]}>
          <Text style={s.bubbleTextUser}>{msg.content}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[s.bubbleWrap, s.bubbleWrapAI]}>
      {/* AI icon */}
      <View style={s.aiAvatar}>
        <Text style={s.aiAvatarText}>✦</Text>
      </View>
      <View style={s.bubbleAIGroup}>
        <View style={[s.bubble, s.bubbleAI]}>
          <Text style={s.bubbleTextAI}>{msg.content}</Text>
        </View>
        <FeedbackButtons
          messageId={msg.messageId}
          currentFeedback={msg.feedback}
          onFeedback={(rating) => onFeedback(msg.id, rating)}
        />
      </View>
    </View>
  )
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function sendChatMessage(
  content: string,
  agentType: AgentType,
  token: string | undefined
): Promise<{ reply: string; messageId: string | null }> {
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/intelligence/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message: content, agentType }),
  })

  const messageId = res.headers.get("X-Message-Id")

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed")

  const reply: string =
    (data as { reply?: string; message?: string; content?: string }).reply ??
    (data as { reply?: string; message?: string; content?: string }).message ??
    (data as { reply?: string; message?: string; content?: string }).content ??
    "No response."

  const bodyMessageId: string | null =
    (data as { messageId?: string; id?: string }).messageId ??
    (data as { messageId?: string; id?: string }).id ??
    null

  return { reply, messageId: messageId ?? bodyMessageId }
}

async function submitFeedback(
  messageId: string,
  rating: "up" | "down",
  token: string | undefined
): Promise<void> {
  await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/intelligence/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messageId, rating }),
  })
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function IntelligenceChatScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const session = useAuthStore((s) => s.session)

  const [agentType, setAgentType] = useState<AgentType>("General")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const listRef = useRef<FlatList>(null)
  const idCounterRef = useRef(0)

  const nextId = useCallback(() => {
    idCounterRef.current += 1
    return `msg-${idCounterRef.current}`
  }, [])

  const handleSend = useCallback(async () => {
    const content = draft.trim()
    if (!content || sending) return

    setDraft("")
    setSending(true)

    const userMsg: ChatMessage = { id: nextId(), role: "user", content }
    setMessages((prev) => [...prev, userMsg])
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50)

    try {
      const { reply, messageId } = await sendChatMessage(content, agentType, session?.token)
      const aiMsg: ChatMessage = {
        id: nextId(),
        role: "assistant",
        content: reply,
        messageId: messageId ?? undefined,
        feedback: null,
      }
      setMessages((prev) => [...prev, aiMsg])
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50)
    } catch {
      const errorMsg: ChatMessage = {
        id: nextId(),
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setSending(false)
    }
  }, [draft, sending, agentType, session, nextId])

  const handleFeedback = useCallback(
    async (localMsgId: string, rating: "up" | "down") => {
      // Optimistic update
      let targetMessageId: string | undefined
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === localMsgId) {
            targetMessageId = m.messageId
            return { ...m, feedback: rating }
          }
          return m
        })
      )
      if (targetMessageId) {
        await submitFeedback(targetMessageId, rating, session?.token).catch(() => {
          // Revert on failure
          setMessages((prev) =>
            prev.map((m) => (m.id === localMsgId ? { ...m, feedback: null } : m))
          )
        })
      }
    },
    [session]
  )

  const handleAgentChange = useCallback((agent: AgentType) => {
    setAgentType(agent)
    // Clear messages when switching agents
    setMessages([])
  }, [])

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
          <View style={s.aiAvatarSmall}>
            <Text style={s.aiAvatarSmallText}>✦</Text>
          </View>
          <Text style={s.headerTitle} numberOfLines={1}>
            AI Chat
          </Text>
        </View>
        <TouchableOpacity
          style={s.usageBtn}
          onPress={() => router.push("/intelligence/cost" as never)}
          activeOpacity={0.7}
        >
          <Text style={s.usageBtnText}>AI Usage</Text>
        </TouchableOpacity>
      </View>

      {/* Agent Selector */}
      <AgentSelector selected={agentType} onSelect={handleAgentChange} />

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <ChatBubble msg={item} onFeedback={handleFeedback} />}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Text style={s.emptyIconText}>✦</Text>
            </View>
            <Text style={s.emptyTitle}>Ask PRV AI</Text>
            <Text style={s.emptySub}>
              Ask anything about your business. Select an agent above for specialized answers.
            </Text>
          </View>
        }
      />

      {/* Sending indicator */}
      {sending && (
        <View style={s.typingRow}>
          <View style={s.aiAvatarTiny}>
            <Text style={s.aiAvatarTinyText}>✦</Text>
          </View>
          <View style={s.typingBubble}>
            <ActivityIndicator size="small" color={colors.text3} />
          </View>
        </View>
      )}

      {/* Input Bar */}
      <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={s.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={`Ask ${agentType} agent…`}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // Header
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
  aiAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  aiAvatarSmallText: { fontSize: 12, color: colors.text1 },
  headerTitle: { ...t.headline, color: colors.text1, flexShrink: 1 },
  usageBtn: {
    minWidth: 72,
    alignItems: "flex-end",
    paddingVertical: 4,
  },
  usageBtnText: { ...t.footnote, color: colors.text3, textDecorationLine: "underline" },

  // Agent selector
  agentScroll: { flexGrow: 0 },
  agentRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.base,
    paddingVertical: 10,
  },
  agentPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  agentPillActive: {
    backgroundColor: "#ffffff",
    borderColor: "#ffffff",
  },
  agentPillInactive: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  agentPillText: { ...t.footnote, fontWeight: "600" },
  agentPillTextActive: { color: "#000000" },
  agentPillTextInactive: { color: "rgba(255,255,255,0.60)" },

  // Messages list
  list: {
    paddingHorizontal: spacing.base,
    paddingTop: 12,
    paddingBottom: 8,
    flexGrow: 1,
  },

  // Bubbles
  bubbleWrap: {
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  bubbleWrapUser: { justifyContent: "flex-end" },
  bubbleWrapAI: { justifyContent: "flex-start", gap: 8 },

  bubble: {
    maxWidth: 288,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.panel,
  },
  bubbleUser: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: colors.shine,
    borderBottomRightRadius: radius.xs,
  },
  bubbleAI: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderBottomLeftRadius: radius.xs,
  },
  bubbleTextUser: { ...t.body, color: colors.text1, lineHeight: 22 },
  bubbleTextAI: { ...t.body, color: colors.text1, lineHeight: 22 },

  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginBottom: 18,
  },
  aiAvatarText: { fontSize: 12, color: colors.text1 },

  bubbleAIGroup: { alignItems: "flex-start", gap: 4, flex: 1 },

  // Feedback
  feedbackRow: {
    flexDirection: "row",
    gap: 6,
    paddingLeft: 4,
    marginTop: 2,
  },
  feedbackBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Typing indicator
  typingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: spacing.base,
    paddingBottom: 6,
  },
  aiAvatarTiny: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  aiAvatarTinyText: { fontSize: 12, color: colors.text1 },
  typingBubble: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.panel,
    borderBottomLeftRadius: radius.xs,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  // Empty state
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconText: { fontSize: 22, color: colors.text2 },
  emptyTitle: { ...t.headline, color: colors.text1 },
  emptySub: {
    ...t.footnote,
    color: colors.text3,
    textAlign: "center",
    lineHeight: 18,
  },

  // Input bar
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
