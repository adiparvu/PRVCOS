import { useRef, useState } from "react"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useAuthStore } from "@/store/auth"
import { COMPANY_SLUG } from "@/lib/public-config"
import { colors, radius, spacing, type as t } from "@/tokens"

// Client sign-in (preview approved 2026-07): email → 6-digit one-time code.
// The company is implicit (EXPO_PUBLIC_COMPANY_SLUG, same as the public shop).
// On verify, the API returns the raw portal-session token; it is stored as
// the Bearer the client-portal routes already validate, with role "client"
// so the root router lands in the (client) group.

type Step = "email" | "code"

export default function ClientLoginScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const login = useAuthStore((s) => s.login)

  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const codeRef = useRef<TextInput>(null)

  const requestCode = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!/.+@.+\..+/.test(trimmed)) {
      setError("Enter a valid email address")
      return
    }
    setBusy(true)
    setError(null)
    try {
      // Always 200 (anti-enumeration) — advance regardless.
      await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/portal/auth/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, companySlug: COMPANY_SLUG, portalType: "client" }),
      })
      setStep("code")
      setTimeout(() => codeRef.current?.focus(), 300)
    } catch {
      setError("Could not reach the server. Check your connection.")
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from the email")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/portal/auth/verify-mobile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          companySlug: COMPANY_SLUG,
          code,
        }),
      })
      const data = (await res.json()) as {
        token?: string
        accountId?: string
        companyId?: string
        error?: string
      }
      if (!res.ok || !data.token || !data.accountId || !data.companyId) {
        setError(data.error ?? "Invalid or expired code")
        return
      }
      await login({
        token: data.token,
        userId: data.accountId,
        role: "client",
        companyId: data.companyId,
      })
      router.replace("/(client)/overview")
    } catch {
      setError("Could not reach the server. Check your connection.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[s.body, { paddingTop: insets.top + 60 }]}>
        <Text style={s.logo}>PRV</Text>
        <Text style={s.tagline}>Client access</Text>

        {step === "email" ? (
          <>
            <Text style={s.title}>Sign in as client</Text>
            <Text style={s.desc}>
              Enter the email your project team has on file. We&apos;ll send you a one-time code.
            </Text>
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>✉</Text>
                <TextInput
                  style={s.input}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.text4}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onSubmitEditing={() => void requestCode()}
                />
              </View>
            </View>
            {error && <Text style={s.error}>{error}</Text>}
            <TouchableOpacity
              style={[s.cta, busy && s.ctaDisabled]}
              onPress={() => void requestCode()}
              disabled={busy}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              {busy ? <ActivityIndicator color="#000" /> : <Text style={s.ctaText}>Send code</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.ghost}
              onPress={() => router.back()}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={s.ghostText}>
                Team member? <Text style={s.ghostBold}>Staff sign in →</Text>
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.title}>Check your email</Text>
            <Text style={s.desc}>
              We sent a 6-digit code to <Text style={s.descBold}>{email.trim()}</Text>. It expires
              in 15 minutes.
            </Text>
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>#</Text>
                <TextInput
                  ref={codeRef}
                  style={[s.input, s.codeInput]}
                  placeholder="······"
                  placeholderTextColor={colors.text4}
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  onSubmitEditing={() => void verify()}
                  accessibilityLabel="6-digit code"
                />
              </View>
            </View>
            {error && <Text style={s.error}>{error}</Text>}
            <TouchableOpacity
              style={[s.cta, (busy || code.length < 6) && s.ctaDisabled]}
              onPress={() => void verify()}
              disabled={busy || code.length < 6}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              {busy ? <ActivityIndicator color="#000" /> : <Text style={s.ctaText}>Verify</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.ghost}
              onPress={() => void requestCode()}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={s.ghostText}>
                Didn&apos;t get it? <Text style={s.ghostBold}>Resend code</Text>
              </Text>
            </TouchableOpacity>
            <Text style={s.fineprint}>
              Same security as the web portal link: single-use, hashed at rest, strict rate limits.
            </Text>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, paddingHorizontal: 26 },
  logo: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -1,
    color: colors.text1,
  },
  tagline: { ...t.caption1, color: colors.text3, textAlign: "center", marginTop: 4 },
  title: {
    ...t.title3,
    color: colors.text1,
    textAlign: "center",
    marginTop: 34,
    letterSpacing: -0.4,
  },
  desc: {
    ...t.footnote,
    color: colors.text2,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 22,
    lineHeight: 19,
  },
  descBold: { color: colors.text1, fontWeight: "600" },
  card: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.card,
    overflow: "hidden",
    position: "relative",
  },
  cardShine: {
    position: "absolute",
    top: 0,
    left: 14,
    right: 14,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.20)",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
  },
  inputIcon: { fontSize: 15, color: colors.text3, width: 20, textAlign: "center" },
  input: { flex: 1, fontSize: 15, color: colors.text1, padding: 0 },
  codeInput: { fontSize: 22, fontWeight: "700", letterSpacing: 10 },
  error: { fontSize: 12.5, color: colors.red, textAlign: "center", marginTop: 12 },
  cta: {
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: radius.pill,
    paddingVertical: 15,
    alignItems: "center",
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { fontSize: 15, fontWeight: "700", color: "#000" },
  ghost: { marginTop: 18, alignItems: "center" },
  ghostText: { ...t.footnote, color: colors.text2 },
  ghostBold: { color: colors.text1, fontWeight: "600" },
  fineprint: {
    ...t.caption2,
    color: colors.text3,
    textAlign: "center",
    marginTop: 14,
    lineHeight: 15,
  },
})
