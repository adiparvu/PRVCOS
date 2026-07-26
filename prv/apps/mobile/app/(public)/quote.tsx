import { useState } from "react"
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams, useRouter } from "expo-router"
import { GlassCard } from "@/components/Glass"
import { COMPANY_SLUG } from "@/lib/public-config"
import { colors, radius, spacing, type } from "@/tokens"

// POST /api/public/leads requires companySlug + name, and at least one of
// email/phone (server-side refine). The form enforces the same rule so the user
// sees it before a round trip.
export default function QuoteScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { service } = useLocalSearchParams<{ service?: string }>()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState(service ? `I am interested in: ${service}` : "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = name.trim().length > 0 && (email.trim().length > 0 || phone.trim().length > 0)

  async function submit() {
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/public/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companySlug: COMPANY_SLUG,
          name: name.trim(),
          ...(email.trim() ? { email: email.trim() } : {}),
          ...(phone.trim() ? { phone: phone.trim() } : {}),
          ...(message.trim() ? { message: message.trim() } : {}),
          source: "mobile_app",
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok) throw new Error(data.error ?? "Could not send your request.")

      Alert.alert("Request sent", "Thank you — our team will get back to you shortly.", [
        { text: "OK", onPress: () => router.back() },
      ])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not send your request.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backIcon}>{"‹"}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Request a quote</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.base, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>
          Tell us about your project and we will come back with a free, no-obligation quote.
        </Text>

        <GlassCard style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.text4}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.text4}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Phone"
            placeholderTextColor={colors.text4}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <TextInput
            style={[styles.input, styles.textarea, styles.inputLast]}
            placeholder="What do you need? (optional)"
            placeholderTextColor={colors.text4}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </GlassCard>

        <Text style={styles.hint}>Provide an email or a phone number so we can reach you.</Text>
        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.primaryBtn, (!canSubmit || submitting) && styles.primaryBtnDisabled]}
          activeOpacity={0.85}
          disabled={!canSubmit || submitting}
          onPress={() => void submit()}
        >
          {submitting ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.primaryBtnText}>Send request</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.glass1,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 18, color: colors.text1 },
  title: { ...type.headline, color: colors.text1 },
  intro: { ...type.subhead, color: colors.text2, marginBottom: spacing.lg, lineHeight: 21 },
  form: { padding: spacing.sm },
  input: {
    ...type.subhead,
    color: colors.text1,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  inputLast: { borderBottomWidth: 0 },
  textarea: { minHeight: 96, paddingTop: 13 },
  hint: { ...type.caption1, color: colors.text3, marginTop: spacing.md },
  error: { ...type.footnote, color: colors.red, marginTop: spacing.sm },
  primaryBtn: {
    backgroundColor: "#ffffff",
    borderRadius: radius.base,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  primaryBtnDisabled: { opacity: 0.3 },
  primaryBtnText: { ...type.headline, color: "#000000" },
})
