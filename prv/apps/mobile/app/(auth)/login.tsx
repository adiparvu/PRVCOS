import { useEffect, useState } from "react"
import {
  ActivityIndicator,
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
import * as LocalAuthentication from "expo-local-authentication"
import { useRouter } from "expo-router"
import { PRVMark } from "@/components/PRVMark"
import { useAuthStore } from "@/store/auth"
import { getSession, isBiometricUnlockEnabled } from "@/lib/session"
import { colors, radius, spacing, type } from "@/tokens"

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { login, isLoading } = useAuthStore()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [biometricAvailable, setBiometricAvailable] = useState(false)

  // Biometrics UNLOCK a session that already exists on this device; they are not
  // an authentication method on their own. Device-level enrolment alone must
  // never grant access, so the button is offered only when a stored session is
  // present.
  useEffect(() => {
    async function probe() {
      const [hasHardware, stored, prefEnabled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        getSession(),
        isBiometricUnlockEnabled(),
      ])
      if (!hasHardware || !stored || !prefEnabled) return
      const enrolled = await LocalAuthentication.isEnrolledAsync()
      setBiometricAvailable(enrolled)
    }
    void probe()
  }, [])

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.")
      return
    }
    setError(null)
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Login failed")

      if (data.requiresMfa) {
        router.push({ pathname: "/(auth)/mfa", params: { token: data.factorId } })
        return
      }

      await login({
        token: data.sessionId,
        userId: data.userId,
        role: data.role,
        companyId: data.companyId,
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed. Please try again.")
    }
  }

  async function handleFaceId() {
    // Re-read the stored session at press time: it may have been cleared since
    // the probe ran (e.g. a sign-out in another tab of the flow).
    const stored = await getSession()
    if (!stored) {
      setBiometricAvailable(false)
      setError("No saved session on this device. Please sign in with your password.")
      return
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Sign in to PRV",
      fallbackLabel: "Use password",
    })
    if (!result.success) return

    // Restore the real session so every subsequent request carries its bearer
    // token. Navigation happens through the auth store, never on its own.
    await login(stored)
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Mark */}
        <View style={styles.markWrap}>
          <PRVMark size={48} color="rgba(255,255,255,0.92)" />
        </View>

        <Text style={styles.title}>PRV</Text>
        <Text style={styles.subtitle}>Sign in to your company{"\n"}operating system</Text>

        {/* Form */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="work@company.ro"
            placeholderTextColor={colors.text3}
            autoCapitalize="none"
            keyboardType="email-address"
            keyboardAppearance="dark"
            returnKeyType="next"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.text3}
            secureTextEntry
            keyboardAppearance="dark"
            returnKeyType="go"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleLogin}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.primaryBtnText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Face ID */}
        {biometricAvailable && (
          <TouchableOpacity style={styles.biometricBtn} onPress={handleFaceId} activeOpacity={0.8}>
            <Text style={styles.biometricText}>Sign in with Face ID</Text>
          </TouchableOpacity>
        )}

        {/* Footer */}
        <Pressable onPress={() => router.push("/(auth)/password-reset")} style={styles.forgotWrap}>
          <Text style={styles.forgot}>Forgot password?</Text>
        </Pressable>

        <Pressable onPress={() => router.push("/(auth)/client-login")} style={styles.forgotWrap}>
          <Text style={styles.forgot}>Client? Sign in with email code</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  markWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#0d0d0d",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    ...type.title1,
    color: colors.text1,
    marginBottom: 8,
  },
  subtitle: {
    ...type.subhead,
    color: colors.text3,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 36,
  },
  form: {
    width: "100%",
    gap: 10,
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    ...type.body,
    color: colors.text1,
  },
  error: {
    ...type.footnote,
    color: colors.red,
    textAlign: "center",
  },
  primaryBtn: {
    height: 50,
    backgroundColor: "#ffffff",
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryBtnText: {
    ...type.headline,
    color: "#000000",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 16,
    width: "100%",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  dividerText: {
    ...type.caption1,
    color: colors.text3,
  },
  biometricBtn: {
    width: "100%",
    height: 50,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  biometricText: {
    ...type.body,
    color: colors.text2,
  },
  forgotWrap: {
    marginTop: 20,
  },
  forgot: {
    ...type.footnote,
    color: colors.text3,
  },
})
