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
import { colors, radius, spacing, type as t } from "@/tokens"
import { useCreateClient } from "@/hooks/useCreateFlows"

type ClientType = "business" | "individual"

interface Props {
  visible: boolean
  onClose: () => void
}

export function CreateClientSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const slideAnim = useRef(new Animated.Value(500)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const [shown, setShown] = useState(false)

  const [name, setName] = useState("")
  const [clientType, setClientType] = useState<ClientType>("business")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [city, setCity] = useState("")
  const [vatNumber, setVatNumber] = useState("")
  const [notes, setNotes] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const { mutate, isPending } = useCreateClient()

  useEffect(() => {
    if (visible) {
      setName("")
      setClientType("business")
      setEmail("")
      setPhone("")
      setCity("")
      setVatNumber("")
      setNotes("")
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

  const handleSubmit = () => {
    if (!name.trim()) {
      setFormError("Name is required")
      return
    }
    setFormError(null)
    mutate(
      {
        name: name.trim(),
        type: clientType,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        city: city.trim() || undefined,
        vatNumber: vatNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => onClose(),
        onError: () => setFormError("Failed to create client. Please try again."),
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
            <Text style={s.title}>New Client</Text>
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
            <View style={s.pillRow}>
              {(["business", "individual"] as ClientType[]).map((tp) => (
                <TouchableOpacity
                  key={tp}
                  style={[s.pill, clientType === tp && s.pillActive]}
                  onPress={() => setClientType(tp)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.pillText, clientType === tp && s.pillTextActive]}>
                    {tp === "business" ? "Business" : "Individual"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>◇</Text>
                <TextInput
                  style={s.input}
                  placeholder={clientType === "business" ? "Company name" : "Full name"}
                  placeholderTextColor={colors.text4}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

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
                />
              </View>
              <View style={s.divider} />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>✆</Text>
                <TextInput
                  style={s.input}
                  placeholder="Phone number"
                  placeholderTextColor={colors.text4}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={s.divider} />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>◉</Text>
                <TextInput
                  style={s.input}
                  placeholder="City"
                  placeholderTextColor={colors.text4}
                  value={city}
                  onChangeText={setCity}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {clientType === "business" && (
              <>
                <Text style={s.sectionLabel}>Billing</Text>
                <View style={s.card}>
                  <View style={s.cardShine} pointerEvents="none" />
                  <View style={s.inputRow}>
                    <Text style={s.inputIcon}>⊞</Text>
                    <TextInput
                      style={s.input}
                      placeholder="VAT number (CUI)"
                      placeholderTextColor={colors.text4}
                      value={vatNumber}
                      onChangeText={setVatNumber}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>
              </>
            )}

            <Text style={s.sectionLabel}>Notes</Text>
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>≡</Text>
                <TextInput
                  style={[s.input, s.inputMultiline]}
                  placeholder="Optional notes"
                  placeholderTextColor={colors.text4}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
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
              <Text style={s.ctaText}>{isPending ? "Creating…" : "Create Client"}</Text>
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

  pillRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
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
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.text1,
    padding: 0,
  },
  inputMultiline: {
    minHeight: 60,
    paddingTop: 2,
  },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginHorizontal: spacing.base },

  errorText: {
    fontSize: 12,
    color: colors.red,
    textAlign: "center",
    marginTop: 4,
  },

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
