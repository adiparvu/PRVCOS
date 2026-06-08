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
import { BlurView } from "expo-blur"
import Svg, { Path, Rect, Circle } from "react-native-svg"
import { useAuthStore } from "@/store/auth"
import { colors, radius, spacing, type } from "@/tokens"

const CODE_LENGTH = 6
const RESEND_SECONDS = 30

// SF Symbol: chevron.left
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

// SF Symbol: lock.fill
function LockFill() {
  return (
    <Svg width={32} height={38} viewBox="0 0 28 34" fill="none">
      <Path
        d="M7 15V10C7 6.13 10.13 3 14 3C17.87 3 21 6.13 21 10V15"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Rect x={3} y={14} width={22} height={17} rx={4} fill="rgba(255,255,255,0.85)" />
      <Circle cx={14} cy={22.5} r={2.5} fill="rgba(0,0,0,0.45)" />
      <Rect x={12.8} y={23.5} width={2.4} height={3.5} rx={1} fill="rgba(0,0,0,0.45)" />
    </Svg>
  )
}

// SF Symbol: faceid
function FaceID() {
  return (
    <Svg width={26} height={26} viewBox="0 0 26 26" fill="none">
      {/* corners */}
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
      {/* eyes */}
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
      {/* nose */}
      <Path
        d="M13 10V15.5"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* smile */}
      <Path
        d="M9 18C9 18 10.5 20 13 20C15.5 20 17 18 17 18"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  )
}

export default function MFAScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { token: factorId } = useLocalSearchParams<{ token: string }>()
  const { login, isLoading } = useAuthStore()

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""))
  const [activeIndex, setActiveIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [resendCount, setResendCount] = useState(RESEND_SECONDS)
  const [canResend, setCanResend] = useState(false)
  const inputs = useRef<(TextInput | null)[]>([])

  // Cursor blink animation
  const cursorOpacity = useRef(new Animated.Value(1)).current
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    )
    blink.start()
    return () => blink.stop()
  }, [cursorOpacity])

  // Resend countdown
  useEffect(() => {
    if (resendCount <= 0) {
      setCanResend(true)
      return
    }
    const t = setTimeout(() => setResendCount((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCount])

  function handleDigit(value: string, index: number) {
    const cleaned = value.replace(/\D/g, "").slice(-1)
    const next = [...digits]
    next[index] = cleaned
    setDigits(next)
    setError(null)
    if (cleaned && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus()
      setActiveIndex(index + 1)
    }
    if (cleaned && index === CODE_LENGTH - 1) {
      // Auto-submit on last digit
      const full = [...next].join("")
      if (full.length === CODE_LENGTH) {
        submitCode(full)
      }
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === "Backspace") {
      if (!digits[index] && index > 0) {
        const next = [...digits]
        next[index - 1] = ""
        setDigits(next)
        inputs.current[index - 1]?.focus()
        setActiveIndex(index - 1)
      }
    }
  }

  async function submitCode(code: string) {
    setError(null)
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/mfa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mfaToken: factorId, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Verification failed")
      await login({
        token: data.sessionId,
        userId: data.userId,
        role: data.role,
        companyId: data.companyId,
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Verification failed. Please try again.")
      setDigits(Array(CODE_LENGTH).fill(""))
      inputs.current[0]?.focus()
      setActiveIndex(0)
    }
  }

  async function handleVerify() {
    const code = digits.join("")
    if (code.length < CODE_LENGTH) {
      setError("Enter the 6-digit code from your authenticator app.")
      return
    }
    await submitCode(code)
  }

  function handleResend() {
    if (!canResend) return
    setResendCount(RESEND_SECONDS)
    setCanResend(false)
    setDigits(Array(CODE_LENGTH).fill(""))
    inputs.current[0]?.focus()
    setActiveIndex(0)
  }

  const codeComplete = digits.every(Boolean)
  const hasError = !!error

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[styles.inner, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
      >
        {/* Back button */}
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        {/* Lock icon card */}
        <BlurView intensity={18} tint="dark" style={styles.lockCard}>
          <View style={styles.lockCardInner}>
            <LockFill />
          </View>
        </BlurView>

        {/* Titles */}
        <Text style={styles.title}>Two-Factor Auth</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code from your{"\n"}
          <Text style={styles.subtitleBold}>authenticator app</Text>
        </Text>

        {/* OTP cells */}
        <View style={styles.codeRow}>
          {digits.map((digit, i) => {
            const isActive = activeIndex === i
            const isFilled = !!digit
            const showCursor = isActive && !isFilled

            return (
              <Pressable
                key={i}
                onPress={() => {
                  inputs.current[i]?.focus()
                  setActiveIndex(i)
                }}
                style={[
                  styles.cell,
                  isFilled && styles.cellFilled,
                  isActive && styles.cellActive,
                  hasError && styles.cellError,
                ]}
              >
                <TextInput
                  ref={(el) => {
                    inputs.current[i] = el
                  }}
                  style={styles.cellInput}
                  value={digit}
                  onChangeText={(v) => handleDigit(v, i)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                  onFocus={() => setActiveIndex(i)}
                  keyboardType="number-pad"
                  keyboardAppearance="dark"
                  maxLength={1}
                  selectTextOnFocus
                  autoFocus={i === 0}
                  caretHidden
                />
                {showCursor && (
                  <Animated.View style={[styles.cursor, { opacity: cursorOpacity }]} />
                )}
              </Pressable>
            )
          })}
        </View>

        {/* Error message */}
        {error && <Text style={styles.error}>{error}</Text>}

        {/* Verify button */}
        <TouchableOpacity
          style={[styles.primaryBtn, !codeComplete && styles.primaryBtnDim]}
          onPress={handleVerify}
          activeOpacity={0.85}
          disabled={isLoading || !codeComplete}
        >
          {isLoading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={[styles.primaryBtnText, !codeComplete && styles.primaryBtnTextDim]}>
              Verify
            </Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Face ID button */}
        <TouchableOpacity style={styles.faceIdBtn} activeOpacity={0.8} onPress={handleVerify}>
          <FaceID />
          <Text style={styles.faceIdText}>Use Face ID</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          {canResend ? (
            <Pressable onPress={handleResend}>
              <Text style={styles.resendActive}>Resend code</Text>
            </Pressable>
          ) : (
            <Text style={styles.resendCountdown}>
              Resend in <Text style={styles.resendTimer}>{resendCount}s</Text>
            </Text>
          )}
          <Text style={styles.footerDot}>·</Text>
          <Pressable>
            <Text style={styles.switchMethod}>Use backup code</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

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
    marginBottom: spacing.lg,
    paddingVertical: 4,
  },
  backLabel: {
    ...type.subhead,
    color: "rgba(255,255,255,0.65)",
  },
  lockCard: {
    width: 72,
    height: 72,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  lockCardInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  title: {
    ...type.title2,
    color: colors.text1,
    marginBottom: 8,
  },
  subtitle: {
    ...type.subhead,
    color: colors.text3,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 40,
  },
  subtitleBold: {
    color: "rgba(255,255,255,0.75)",
    fontWeight: "600",
  },
  codeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  cell: {
    width: 48,
    height: 58,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cellFilled: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.22)",
  },
  cellActive: {
    borderColor: "rgba(255,255,255,0.55)",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  cellError: {
    borderColor: colors.red,
    backgroundColor: "rgba(255,59,48,0.08)",
  },
  cellInput: {
    position: "absolute",
    width: "100%",
    height: "100%",
    textAlign: "center",
    ...type.title2,
    color: colors.text1,
    opacity: 1,
  },
  cursor: {
    width: 2,
    height: 22,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 1,
  },
  error: {
    ...type.footnote,
    color: colors.red,
    textAlign: "center",
    marginBottom: 12,
    marginTop: 4,
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
    color: "rgba(255,255,255,0.75)",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 28,
  },
  resendActive: {
    ...type.footnote,
    color: "rgba(255,255,255,0.65)",
  },
  resendCountdown: {
    ...type.footnote,
    color: "rgba(255,255,255,0.3)",
  },
  resendTimer: {
    color: "rgba(255,255,255,0.5)",
  },
  footerDot: {
    ...type.footnote,
    color: "rgba(255,255,255,0.2)",
  },
  switchMethod: {
    ...type.footnote,
    color: "rgba(255,255,255,0.4)",
  },
})
