import { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams, useRouter } from "expo-router"
import * as LocalAuthentication from "expo-local-authentication"
import Svg, { Circle, Path, Rect } from "react-native-svg"
import { api } from "@/lib/api"
import { colors, radius, spacing, type } from "@/tokens"

// ── SF Symbol icons ───────────────────────────────────────────────────────────

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

// SF Symbol: person.badge.shield.checkmark (amber — default)
function PersonShieldIcon({ error = false }: { error?: boolean }) {
  const c = error ? "rgba(255,59,48,0.8)" : "rgba(255,179,64,0.85)"
  const shieldFill = error ? "rgba(255,59,48,0.8)" : "rgba(255,179,64,0.85)"
  return (
    <Svg width={36} height={36} viewBox="0 0 36 36" fill="none">
      <Circle cx={15} cy={10} r={5} stroke={c} strokeWidth={2} />
      <Path d="M6 28C6 22.48 10.03 18 15 18" stroke={c} strokeWidth={2} strokeLinecap="round" />
      <Path
        d="M22 16L16 19V24C16 27.3 18.8 30.4 22 31C25.2 30.4 28 27.3 28 24V19L22 16Z"
        fill={shieldFill}
      />
      {error ? (
        <Path
          d="M20 22L24 26M24 22L20 26"
          stroke="rgba(0,0,0,0.5)"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      ) : (
        <Path
          d="M19.5 23.5L21.5 25.5L25 21.5"
          stroke="rgba(0,0,0,0.55)"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  )
}

// SF Symbol: checkmark.circle.fill (green — success)
function CheckCircleFill() {
  return (
    <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
      <Circle cx={20} cy={20} r={18} fill="rgba(52,199,89,0.85)" />
      <Path
        d="M12 20L17.5 25.5L28 15"
        stroke="#000"
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// SF Symbol: lock.fill (password field)
function LockIcon({ active = false }: { active?: boolean }) {
  const c = active ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.3)"
  return (
    <Svg width={18} height={20} viewBox="0 0 22 24" fill="none">
      <Path
        d="M7 11V8C7 5.24 8.69 3 11 3C13.31 3 15 5.24 15 8V11"
        stroke={c}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Rect x={3} y={10} width={16} height={12} rx={3} stroke={c} strokeWidth={2} />
      <Circle cx={11} cy={16} r={1.5} fill={c} />
    </Svg>
  )
}

// SF Symbol: eye / eye.slash
function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <Svg width={20} height={14} viewBox="0 0 22 16" fill="none">
        <Path
          d="M11 2C7.13 2 3.5 4.5 1 8C3.5 11.5 7.13 14 11 14C14.87 14 18.5 11.5 21 8C18.5 4.5 14.87 2 11 2Z"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth={1.8}
        />
        <Circle cx={11} cy={8} r={3} stroke="rgba(255,255,255,0.4)" strokeWidth={1.8} />
      </Svg>
    )
  }
  return (
    <Svg width={20} height={14} viewBox="0 0 22 16" fill="none">
      <Path d="M1 1L21 15" stroke="rgba(255,255,255,0.4)" strokeWidth={1.8} strokeLinecap="round" />
      <Path
        d="M9.5 4.5C10 4.18 10.49 4 11 4C13.76 4 16 6.24 16 9C16 9.51 15.92 10 15.76 10.47"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M6.24 7.53C6.08 8 6 8.49 6 9C6 11.76 8.24 14 11 14C11.51 14 12 13.92 12.47 13.76"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M3 4C1.67 5.48 1 7.18 1 9C1 11 2 13 3.76 14.24"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M19 4C20.33 5.48 21 7.18 21 9C21 11 20 13 18.24 14.24"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  )
}

// SF Symbol: faceid
function FaceIDIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 26 26" fill="none">
      <Path
        d="M1 7V3C1 1.9 1.9 1 3 1H7"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M19 1H23C24.1 1 25 1.9 25 3V7"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M25 19V23C25 24.1 24.1 25 23 25H19"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M7 25H3C1.9 25 1 24.1 1 23V19"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M9 10V11.5"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M17 10V11.5"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M13 10V15.5"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M9 18C9 18 10.5 20 13 20C15.5 20 17 18 17 18"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  )
}

// SF Symbol: exclamationmark.shield (reason chip)
function ShieldAlertIcon() {
  return (
    <Svg width={16} height={18} viewBox="0 0 22 24" fill="none">
      <Path
        d="M11 1L2 5V11C2 16.5 5.9 21.7 11 23C16.1 21.7 20 16.5 20 11V5L11 1Z"
        stroke="rgba(255,179,64,0.8)"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="M11 8V13" stroke="rgba(255,179,64,0.8)" strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={11} cy={16} r={0.9} fill="rgba(255,179,64,0.8)" />
    </Svg>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ReauthScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { reason } = useLocalSearchParams<{ reason?: string }>()

  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [focused, setFocused] = useState(false)

  const successScale = useRef(new Animated.Value(0.8)).current
  const successOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    LocalAuthentication.hasHardwareAsync().then((has) => {
      if (has) LocalAuthentication.isEnrolledAsync().then(setBiometricAvailable)
    })
  }, [])

  // Animate success card in, then navigate back
  useEffect(() => {
    if (!confirmed) return
    Animated.parallel([
      Animated.spring(successScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }),
      Animated.timing(successOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start()
    const t = setTimeout(() => router.back(), 1400)
    return () => clearTimeout(t)
  }, [confirmed])

  async function callReauth(body?: { password: string }) {
    setLoading(true)
    setError(null)
    try {
      await api.post<{ ok: boolean }>("/api/auth/reauth", body ?? {})
      setConfirmed(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Verification failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (!password.trim()) {
      setError("Please enter your password.")
      return
    }
    await callReauth({ password: password.trim() })
  }

  async function handleFaceId() {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Confirm your identity",
      fallbackLabel: "Use password",
      disableDeviceFallback: false,
    })
    if (result.success) {
      await callReauth()
    }
  }

  const hasPassword = password.length > 0
  const hasError = !!error

  // ── Success state ─────────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <View
        style={[
          styles.root,
          styles.successRoot,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <Animated.View
          style={[
            styles.successWrap,
            { opacity: successOpacity, transform: [{ scale: successScale }] },
          ]}
        >
          <View style={styles.successCard}>
            <CheckCircleFill />
          </View>
          <Text style={styles.successTitle}>Identity Confirmed</Text>
          <Text style={styles.successSub}>
            {reason
              ? `You can now proceed to\n${reason.toLowerCase()}.`
              : "Your identity has been verified."}
          </Text>
        </Animated.View>
      </View>
    )
  }

  // ── Default state ─────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[styles.inner, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
      >
        {/* Cancel button */}
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft />
          <Text style={styles.backLabel}>Cancel</Text>
        </Pressable>

        {/* Shield icon */}
        <View style={[styles.iconCard, hasError && styles.iconCardError]}>
          <PersonShieldIcon error={hasError} />
        </View>

        <Text style={styles.title}>Confirm Identity</Text>
        <Text style={styles.subtitle}>
          {"For your security, re-enter your\npassword before continuing."}
        </Text>

        {/* Reason chip */}
        {reason ? (
          <View style={styles.reasonChip}>
            <ShieldAlertIcon />
            <Text style={styles.reasonText} numberOfLines={2}>
              {reason}
            </Text>
          </View>
        ) : null}

        {/* Password field */}
        <View
          style={[
            styles.fieldWrap,
            focused && styles.fieldWrapFocused,
            hasError && styles.fieldWrapError,
          ]}
        >
          <LockIcon active={focused || hasPassword} />
          <TextInput
            style={styles.fieldInput}
            placeholder="Password"
            placeholderTextColor="rgba(255,255,255,0.25)"
            secureTextEntry={!showPassword}
            keyboardAppearance="dark"
            returnKeyType="go"
            autoFocus
            value={password}
            onChangeText={(v) => {
              setPassword(v)
              setError(null)
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={handleConfirm}
          />
          <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
            <EyeIcon visible={showPassword} />
          </Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Confirm button */}
        <TouchableOpacity
          style={[styles.primaryBtn, (!hasPassword || loading) && styles.primaryBtnDim]}
          onPress={handleConfirm}
          activeOpacity={0.85}
          disabled={!hasPassword || loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={[styles.primaryBtnText, !hasPassword && styles.primaryBtnTextDim]}>
              Confirm
            </Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        {biometricAvailable && (
          <>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Face ID button */}
            <TouchableOpacity style={styles.faceIdBtn} onPress={handleFaceId} activeOpacity={0.8}>
              <FaceIDIcon />
              <Text style={styles.faceIdText}>Use Face ID</Text>
            </TouchableOpacity>
          </>
        )}

        <Pressable onPress={() => router.back()} style={styles.cancelWrap} hitSlop={10}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  inner: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  backBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 36,
    paddingVertical: 4,
  },
  backLabel: {
    ...type.subhead,
    color: "rgba(255,255,255,0.65)",
  },
  iconCard: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "rgba(255,179,64,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,179,64,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "rgba(255,179,64,0.3)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  iconCardError: {
    backgroundColor: "rgba(255,59,48,0.08)",
    borderColor: "rgba(255,59,48,0.2)",
    shadowColor: "rgba(255,59,48,0.2)",
  },
  title: {
    ...type.title2,
    color: colors.text1,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    ...type.subhead,
    color: colors.text3,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  reasonChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,179,64,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,179,64,0.14)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 28,
    width: "100%",
  },
  reasonText: {
    flex: 1,
    ...type.footnote,
    color: "rgba(255,179,64,0.8)",
    lineHeight: 18,
  },
  fieldWrap: {
    width: "100%",
    height: 54,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  fieldWrapFocused: {
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  fieldWrapError: {
    borderColor: "rgba(255,59,48,0.5)",
    backgroundColor: "rgba(255,59,48,0.06)",
  },
  fieldInput: {
    flex: 1,
    ...type.body,
    color: colors.text1,
    letterSpacing: 0.5,
  },
  errorText: {
    ...type.footnote,
    color: colors.red,
    textAlign: "center",
    marginBottom: 12,
    marginTop: -4,
  },
  primaryBtn: {
    width: "100%",
    height: 54,
    backgroundColor: "#ffffff",
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryBtnDim: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  primaryBtnText: {
    ...type.headline,
    color: "#000000",
  },
  primaryBtnTextDim: {
    color: "rgba(255,255,255,0.25)",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
    width: "100%",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  dividerText: {
    ...type.footnote,
    color: "rgba(255,255,255,0.3)",
  },
  faceIdBtn: {
    width: "100%",
    height: 50,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  faceIdText: {
    ...type.callout,
    color: "rgba(255,255,255,0.65)",
  },
  cancelWrap: {
    marginTop: 28,
  },
  cancelText: {
    ...type.footnote,
    color: "rgba(255,255,255,0.3)",
  },
  // Success
  successRoot: {
    alignItems: "center",
    justifyContent: "center",
  },
  successWrap: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  successCard: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(52,199,89,0.10)",
    borderWidth: 1,
    borderColor: "rgba(52,199,89,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  successTitle: {
    ...type.title2,
    color: colors.text1,
    marginBottom: 10,
    textAlign: "center",
  },
  successSub: {
    ...type.subhead,
    color: colors.text3,
    textAlign: "center",
    lineHeight: 22,
  },
})
