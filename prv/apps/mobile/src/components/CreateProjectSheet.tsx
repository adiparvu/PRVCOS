import {
  Animated,
  Modal,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { useRef, useEffect, useState } from "react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { colors, radius, spacing } from "@/tokens"
import { useCreateProject } from "@/hooks/useCreateFlows"

type ProjectStatus = "draft" | "active"

interface Props {
  visible: boolean
  onClose: () => void
}

export function CreateProjectSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const slideAnim = useRef(new Animated.Value(500)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const [shown, setShown] = useState(false)

  const [name, setName] = useState("")
  const [clientName, setClientName] = useState("")
  const [storeName, setStoreName] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [memberInput, setMemberInput] = useState("")
  const [members, setMembers] = useState<string[]>([])
  const [status, setStatus] = useState<ProjectStatus>("draft")
  const [formError, setFormError] = useState<string | null>(null)

  const { mutate, isPending } = useCreateProject()

  useEffect(() => {
    if (visible) {
      setName("")
      setClientName("")
      setStoreName("")
      setDueDate("")
      setMemberInput("")
      setMembers([])
      setStatus("draft")
      setFormError(null)
      setShown(true)
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 220,
        }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 500, duration: 220, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => setShown(false))
    }
  }, [visible])

  const addMember = () => {
    const trimmed = memberInput.trim()
    if (trimmed && !members.includes(trimmed)) {
      setMembers((prev) => [...prev, trimmed])
    }
    setMemberInput("")
  }

  const removeMember = (m: string) => setMembers((prev) => prev.filter((x) => x !== m))

  const handleSubmit = () => {
    if (!name.trim()) {
      setFormError("Project name is required")
      return
    }
    setFormError(null)
    mutate(
      {
        name: name.trim(),
        dueDate: dueDate.trim() || undefined,
        status,
      },
      {
        onSuccess: () => onClose(),
        onError: () => setFormError("Failed to create project. Please try again."),
      }
    )
  }

  return (
    <Modal transparent visible={shown} animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Animated.View
          style={[StyleSheet.absoluteFillObject, s.backdrop, { opacity: opacityAnim }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          style={[
            s.sheet,
            { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom + 20 },
          ]}
        >
          <View style={s.shine} pointerEvents="none" />
          <View style={s.handleRow}>
            <View style={s.handle} />
          </View>

          <View style={s.header}>
            <Text style={s.title}>New Project</Text>
            <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={s.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={s.body}
            contentContainerStyle={s.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Name */}
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>◎</Text>
                <TextInput
                  style={s.input}
                  placeholder="Project name"
                  placeholderTextColor={colors.text4}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Client & Scope */}
            <Text style={s.sectionLabel}>Client & Scope</Text>
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>◇</Text>
                <TextInput
                  style={s.input}
                  placeholder="Client name"
                  placeholderTextColor={colors.text4}
                  value={clientName}
                  onChangeText={setClientName}
                  autoCapitalize="words"
                />
              </View>
              <View style={s.divider} />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>◈</Text>
                <TextInput
                  style={s.input}
                  placeholder="Store / location"
                  placeholderTextColor={colors.text4}
                  value={storeName}
                  onChangeText={setStoreName}
                  autoCapitalize="words"
                />
              </View>
              <View style={s.divider} />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>◉</Text>
                <TextInput
                  style={s.input}
                  placeholder="Due date (YYYY-MM-DD)"
                  placeholderTextColor={colors.text4}
                  value={dueDate}
                  onChangeText={setDueDate}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            {/* Team */}
            <Text style={s.sectionLabel}>Team</Text>
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              {members.length > 0 && (
                <View style={s.chipsWrap}>
                  {members.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={s.chip}
                      onPress={() => removeMember(m)}
                      activeOpacity={0.7}
                    >
                      <Text style={s.chipText}>{m}</Text>
                      <Text style={s.chipRemove}>✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={[s.inputRow, members.length > 0 && s.inputRowTop]}>
                <Text style={s.inputIcon}>◐</Text>
                <TextInput
                  style={s.input}
                  placeholder="Add team member name"
                  placeholderTextColor={colors.text4}
                  value={memberInput}
                  onChangeText={setMemberInput}
                  onSubmitEditing={addMember}
                  returnKeyType="done"
                  autoCapitalize="words"
                />
                {memberInput.trim().length > 0 && (
                  <TouchableOpacity onPress={addMember} style={s.addMemberBtn} activeOpacity={0.7}>
                    <Text style={s.addMemberText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Status */}
            <Text style={s.sectionLabel}>Start as</Text>
            <View style={s.pillRow}>
              {(["draft", "active"] as ProjectStatus[]).map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[s.pill, status === st && s.pillActive]}
                  onPress={() => setStatus(st)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.pillText, status === st && s.pillTextActive]}>
                    {st.charAt(0).toUpperCase() + st.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {formError && <Text style={s.errorText}>{formError}</Text>}
          </ScrollView>

          <View style={s.ctaWrap}>
            <TouchableOpacity
              style={[s.cta, (!name.trim() || isPending) && s.ctaDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={!name.trim() || isPending}
            >
              <Text style={s.ctaText}>{isPending ? "Creating…" : "Create Project"}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    backgroundColor: "rgba(28,28,30,0.97)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(255,255,255,0.12)",
    maxHeight: "88%",
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

  body: { flex: 1 },
  bodyContent: { paddingHorizontal: spacing.lg, paddingBottom: 8, gap: 8 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 4,
    marginLeft: 2,
  },

  card: {
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
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    gap: 10,
  },
  inputRowTop: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" },
  inputIcon: { fontSize: 15, color: colors.text3, width: 20, textAlign: "center" },
  input: { flex: 1, fontSize: 14, color: colors.text1, padding: 0 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginHorizontal: spacing.base },

  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    padding: spacing.base,
    paddingBottom: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  chipText: { fontSize: 12, color: colors.text1, fontWeight: "600" },
  chipRemove: { fontSize: 10, color: colors.text3 },
  addMemberBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  addMemberText: { fontSize: 12, color: colors.text2, fontWeight: "600" },

  pillRow: { flexDirection: "row", gap: 8 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  pillActive: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.25)",
  },
  pillText: { fontSize: 13, fontWeight: "600", color: colors.text3 },
  pillTextActive: { color: colors.text1 },

  errorText: { fontSize: 12, color: colors.red, textAlign: "center", marginTop: 4 },

  ctaWrap: { paddingHorizontal: spacing.lg, paddingTop: 12 },
  cta: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: radius.pill,
    paddingVertical: 15,
    alignItems: "center",
  },
  ctaDisabled: { opacity: 0.35 },
  ctaText: { fontSize: 15, fontWeight: "700", color: "#000" },
})
