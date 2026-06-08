import { Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { useRef, useEffect } from "react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { colors, radius, spacing } from "@/tokens"

const ACTIONS = [
  {
    type: "invoice" as const,
    icon: "⊕",
    title: "New Invoice",
    sub: "Bill a client for completed work",
  },
  {
    type: "order" as const,
    icon: "◈",
    title: "New Order",
    sub: "Place a materials or product order",
  },
  { type: "project" as const, icon: "◎", title: "New Project", sub: "Start a new renovation job" },
  { type: "client" as const, icon: "◇", title: "New Client", sub: "Add a person or company" },
  { type: "expense" as const, icon: "◫", title: "New Expense", sub: "Record a business expense" },
  {
    type: "employee" as const,
    icon: "◉",
    title: "Invite Employee",
    sub: "Add a new team member by email",
  },
]

export type CreateType = "invoice" | "order" | "project" | "client" | "expense" | "employee"

interface Props {
  visible: boolean
  onClose: () => void
  onSelect: (type: CreateType) => void
}

export function ActionChooser({ visible, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets()
  const slideAnim = useRef(new Animated.Value(300)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 220,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [visible])

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[s.overlay, { opacity: opacityAnim }]}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
        <Animated.View
          style={[
            s.sheet,
            { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={s.shine} pointerEvents="none" />
          <View style={s.handleRow}>
            <View style={s.handle} />
          </View>
          <View style={s.header}>
            <Text style={s.title}>Create New</Text>
            <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={s.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={s.card}>
            <View style={s.cardShine} pointerEvents="none" />
            {ACTIONS.map((a, i) => (
              <TouchableOpacity
                key={a.type}
                style={[s.actionRow, i < ACTIONS.length - 1 && s.rowBorder]}
                activeOpacity={0.7}
                onPress={() => {
                  onSelect(a.type)
                  onClose()
                }}
              >
                <View style={s.actionIcon}>
                  <Text style={s.actionIconText}>{a.icon}</Text>
                </View>
                <View style={s.actionInfo}>
                  <Text style={s.actionTitle}>{a.title}</Text>
                  <Text style={s.actionSub}>{a.sub}</Text>
                </View>
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    backgroundColor: "rgba(28,28,30,0.97)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(255,255,255,0.12)",
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
    paddingBottom: spacing.base,
  },
  title: { fontSize: 17, fontWeight: "700", color: colors.text1, letterSpacing: -0.3 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: { fontSize: 13, color: colors.text3 },

  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
  },
  cardShine: {
    position: "absolute",
    top: 0,
    left: 14,
    right: 14,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.base,
    gap: spacing.base,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionIconText: { fontSize: 18, color: colors.text2 },
  actionInfo: { flex: 1, gap: 3 },
  actionTitle: { fontSize: 15, fontWeight: "600", color: colors.text1 },
  actionSub: { fontSize: 12, color: colors.text3 },
  chevron: { fontSize: 18, color: "rgba(255,255,255,0.18)" },
})
