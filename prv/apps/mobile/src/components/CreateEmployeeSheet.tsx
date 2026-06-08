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
import { useCreateEmployee } from "@/hooks/useCreateFlows"

const ROLES = [
  { value: "worker", label: "Worker" },
  { value: "team_leader", label: "Team Leader" },
  { value: "operations_manager", label: "Ops Manager" },
  { value: "store_manager", label: "Store Manager" },
  { value: "project_director", label: "Project Director" },
  { value: "hr_payroll", label: "HR / Payroll" },
] as const

type RoleValue = (typeof ROLES)[number]["value"]

interface Props {
  visible: boolean
  onClose: () => void
}

export function CreateEmployeeSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const slideAnim = useRef(new Animated.Value(500)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const [shown, setShown] = useState(false)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [role, setRole] = useState<RoleValue>("worker")
  const [formError, setFormError] = useState<string | null>(null)

  const { mutate, isPending } = useCreateEmployee()

  useEffect(() => {
    if (visible) {
      setFirstName("")
      setLastName("")
      setEmail("")
      setPhone("")
      setJobTitle("")
      setRole("worker")
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

  const canSubmit =
    firstName.trim().length > 0 && lastName.trim().length > 0 && email.trim().length > 0

  const handleSubmit = () => {
    if (!firstName.trim()) {
      setFormError("First name is required")
      return
    }
    if (!lastName.trim()) {
      setFormError("Last name is required")
      return
    }
    if (!email.trim()) {
      setFormError("Email is required")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError("Enter a valid email address")
      return
    }
    setFormError(null)
    mutate(
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        jobTitle: jobTitle.trim() || undefined,
        phone: phone.trim() || undefined,
        role,
      },
      {
        onSuccess: () => onClose(),
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : ""
          setFormError(
            msg.includes("already exists")
              ? "A user with this email already exists."
              : "Failed to send invitation. Please try again."
          )
        },
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
            <Text style={s.title}>Invite Employee</Text>
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
                <Text style={s.inputIcon}>◇</Text>
                <TextInput
                  style={s.input}
                  placeholder="First name"
                  placeholderTextColor={colors.text4}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
              </View>
              <View style={s.divider} />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>◇</Text>
                <TextInput
                  style={s.input}
                  placeholder="Last name"
                  placeholderTextColor={colors.text4}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Contact */}
            <Text style={s.sectionLabel}>Contact</Text>
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>@</Text>
                <TextInput
                  style={s.input}
                  placeholder="Email address"
                  placeholderTextColor={colors.text4}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={s.divider} />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>✆</Text>
                <TextInput
                  style={s.input}
                  placeholder="Phone (optional)"
                  placeholderTextColor={colors.text4}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Position */}
            <Text style={s.sectionLabel}>Position</Text>
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>≡</Text>
                <TextInput
                  style={s.input}
                  placeholder="Job title (optional)"
                  placeholderTextColor={colors.text4}
                  value={jobTitle}
                  onChangeText={setJobTitle}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Role */}
            <Text style={s.sectionLabel}>Role</Text>
            <View style={s.roleGrid}>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[s.rolePill, role === r.value && s.rolePillActive]}
                  onPress={() => setRole(r.value)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.rolePillText, role === r.value && s.rolePillTextActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.inviteNote}>
              <View style={s.inviteNoteShine} pointerEvents="none" />
              <Text style={s.inviteNoteIcon}>✉</Text>
              <Text style={s.inviteNoteText}>
                An invitation email will be sent to the address above with a link to set up their
                account.
              </Text>
            </View>

            {formError && <Text style={s.errorText}>{formError}</Text>}
          </ScrollView>

          <View style={s.ctaWrap}>
            <TouchableOpacity
              style={[s.cta, (!canSubmit || isPending) && s.ctaDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={!canSubmit || isPending}
            >
              <Text style={s.ctaText}>{isPending ? "Sending invite…" : "Send Invitation"}</Text>
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
    maxHeight: "92%",
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
  inputIcon: { fontSize: 15, color: colors.text3, width: 20, textAlign: "center" },
  input: { flex: 1, fontSize: 14, color: colors.text1, padding: 0 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginHorizontal: spacing.base },

  roleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rolePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  rolePillActive: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.28)",
  },
  rolePillText: { fontSize: 13, fontWeight: "600", color: colors.text3 },
  rolePillTextActive: { color: colors.text1 },

  inviteNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
    overflow: "hidden",
  },
  inviteNoteShine: {
    position: "absolute",
    top: 0,
    left: 12,
    right: 12,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  inviteNoteIcon: { fontSize: 14, color: colors.text3, marginTop: 1 },
  inviteNoteText: { flex: 1, fontSize: 12, color: colors.text3, lineHeight: 17 },

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
