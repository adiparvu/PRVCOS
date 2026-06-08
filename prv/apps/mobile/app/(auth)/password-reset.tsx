import { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Animated,
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
import { useLocalSearchParams, useRouter } from "expo-router"
import { BlurView } from "expo-blur"
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

// SF Symbol: lock.rotation
function LockResetIcon() {
  return (
    <Svg width={36} height={36} viewBox="0 0 36 36" fill="none">
      <Path
        d="M11 16V12C11 8.13 14.13 5 18 5C21.87 5 25 8.13 25 12V16"
        stroke="rgba(251,191,36,0.9)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Rect
        x={8}
        y={16}
        width={20}
        height={15}
        rx={5}
        fill="rgba(251,191,36,0.12)"
        stroke="rgba(251,191,36,0.6)"
        strokeWidth={1.5}
      />
      <Circle cx={18} cy={23} r={2} fill="rgba(251,191,36,0.8)" />
      <Path d="M18 23V26" stroke="rgba(251,191,36,0.8)" strokeWidth={2} strokeLinecap="round" />
      <Path
        d="M27 6C28.5 7.5 29.5 9.6 29.5 12"
        stroke="rgba(251,191,36,0.5)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M27 6L29 9M27 6L24 7.5"
        stroke="rgba(251,191,36,0.5)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// SF Symbol: envelope.badge.checkmark
function EnvelopeCheckIcon() {
  return (
    <Svg width={38} height={38} viewBox="0 0 38 38" fill="none">
      <Rect
        x={3}
        y={8}
        width={24}
        height={17}
        rx={4}
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={1.6}
      />
      <Path
        d="M3 12L15 19L27 12"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Circle
        cx={29}
        cy={27}
        r={7}
        fill="rgba(52,211,153,0.12)"
        stroke="rgba(52,211,153,0.5)"
        strokeWidth={1.4}
      />
      <Path
        d="M25 27L28 30L33 24"
        stroke="rgba(52,211,153,0.9)"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// SF Symbol: key (for new password state)
function KeyIcon() {
  return (
    <Svg width={36} height={36} viewBox="0 0 36 36" fill="none">
      <Circle
        cx={13}
        cy={16}
        r={7}
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth={1.8}
      />
      <Circle cx={13} cy={16} r={3} fill="rgba(255,255,255,0.35)" />
      <Path
        d="M19 19L30 25"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <Path d="M26 22L28 25" stroke="rgba(255,255,255,0.5)" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

// SF Symbol: checkmark.circle
function CheckCircleIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48" fill="none">
      <Circle
        cx={24}
        cy={24}
        r={20}
        fill="rgba(52,211,153,0.12)"
        stroke="rgba(52,211,153,0.7)"
        strokeWidth={2}
      />
      <Path
        d="M14 24L21 31L34 17"
        stroke="rgba(52,211,153,1)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// SF Symbol: lock.fill (inline field)
function LockIcon({ opacity = 0.45 }: { opacity?: number }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path
        d="M5 8V6C5 3.79 6.79 2 9 2C11.21 2 13 3.79 13 6V8"
        stroke={`rgba(255,255,255,${opacity})`}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Rect
        x={2}
        y={8}
        width={14}
        height={9}
        rx={3}
        fill={`rgba(255,255,255,${opacity * 0.3})`}
        stroke={`rgba(255,255,255,${opacity})`}
        strokeWidth={1.5}
      />
      <Circle cx={9} cy={12.5} r={1.5} fill={`rgba(255,255,255,${opacity * 0.8})`} />
    </Svg>
  )
}

// SF Symbol: envelope
function EnvelopeIcon({ opacity = 0.45 }: { opacity?: number }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Rect
        x={1}
        y={3.5}
        width={16}
        height={11}
        rx={3}
        stroke={`rgba(255,255,255,${opacity})`}
        strokeWidth={1.5}
      />
      <Path
        d="M1 6L9 11L17 6"
        stroke={`rgba(255,255,255,${opacity})`}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  )
}

// SF Symbol: eye / eye.slash
function EyeIcon({ hidden = false }: { hidden?: boolean }) {
  return hidden ? (
    <Svg width={22} height={16} viewBox="0 0 22 16" fill="none">
      <Path
        d="M1 8C1 8 4.5 2 11 2C17.5 2 21 8 21 8C21 8 17.5 14 11 14C4.5 14 1 8 1 8Z"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Circle cx={11} cy={8} r={3} stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} />
    </Svg>
  ) : (
    <Svg width={22} height={18} viewBox="0 0 22 18" fill="none">
      <Path
        d="M1 1L21 17M8.5 5.5C9.2 4.6 10.1 4 11 4C13.76 4 16 6.24 16 9C16 9.9 15.74 10.73 15.3 11.43"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M4 4.2C2.2 5.5 1 7 1 9C1 9 4.5 15 11 15C13.1 15 14.9 14.3 16.4 13.3"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  )
}

// SF Symbol: arrow.clockwise (resend)
function ArrowClockwiseIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M14 8C14 11.31 11.31 14 8 14C4.69 14 2 11.31 2 8C2 4.69 4.69 2 8 2"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M8 2L11 5M8 2L5 5"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// SF Symbol: arrow.right
function ArrowRightIcon({ dark = false }: { dark?: boolean }) {
  const c = dark ? "#000" : "rgba(255,255,255,0.65)"
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path
        d="M3 9H15M15 9L9 3M15 9L9 15"
        stroke={c}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ── Password validation ───────────────────────────────────────────────────────

interface PasswordStrength {
  hasLength: boolean
  hasUpper: boolean
  hasNumber: boolean
  hasSpecial: boolean
}

function checkStrength(pw: string): PasswordStrength {
  return {
    hasLength: pw.length >= 12,
    hasUpper: /[A-Z]/.test(pw),
    hasNumber: /[0-9]/.test(pw),
    hasSpecial: /[^A-Za-z0-9]/.test(pw),
  }
}

function strengthScore(s: PasswordStrength): number {
  return [s.hasLength, s.hasUpper, s.hasNumber, s.hasSpecial].filter(Boolean).length
}

function strengthLabel(score: number): string {
  if (score <= 1) return "Weak"
  if (score === 2) return "Fair"
  if (score === 3) return "Good"
  return "Strong"
}

function strengthColor(score: number): string {
  if (score <= 1) return colors.red
  if (score === 2) return colors.amber
  if (score === 3) return "rgba(255,204,0,0.9)"
  return colors.green
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Screen = "request" | "sent" | "newPassword" | "success"

// ── Main component ────────────────────────────────────────────────────────────

export default function PasswordReset() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { token: tokenParam } = useLocalSearchParams<{ token?: string }>()

  const [screen, setScreen] = useState<Screen>(tokenParam ? "newPassword" : "request")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentEmail, setSentEmail] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [confirmFocused, setConfirmFocused] = useState(false)
  const [token, setToken] = useState(tokenParam ?? "")

  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const confirmRef = useRef<TextInput>(null)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fadeAnim = useRef(new Animated.Value(1)).current

  const strength = checkStrength(password)
  const score = strengthScore(strength)

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    cooldownRef.current = setInterval(() => {
      setResendCooldown((v) => {
        if (v <= 1) {
          clearInterval(cooldownRef.current!)
          return 0
        }
        return v - 1
      })
    }, 1000)
    return () => clearInterval(cooldownRef.current!)
  }, [resendCooldown])

  function transitionTo(next: Screen) {
    Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setScreen(next)
      setError(null)
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start()
    })
  }

  async function handleRequest() {
    if (!email.trim()) {
      setError("Please enter your email address.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.post("/api/auth/password-reset/request", { email: email.trim().toLowerCase() })
      setSentEmail(email.trim().toLowerCase())
      setResendCooldown(60)
      transitionTo("sent")
    } catch (e: unknown) {
      // Always show success to prevent enumeration (matches backend behavior)
      setSentEmail(email.trim().toLowerCase())
      setResendCooldown(60)
      transitionTo("sent")
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return
    setLoading(true)
    try {
      await api.post("/api/auth/password-reset/request", { email: sentEmail })
    } catch {
      // silent — enumeration prevention
    } finally {
      setLoading(false)
      setResendCooldown(60)
    }
  }

  async function handleConfirm() {
    if (!token.trim()) {
      setError("Reset token is missing. Please use the link from your email.")
      return
    }
    if (!strength.hasLength || !strength.hasUpper || !strength.hasNumber || !strength.hasSpecial) {
      setError("Password does not meet all requirements.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.post("/api/auth/password-reset/confirm", {
        token: token.trim(),
        newPassword: password,
      })
      transitionTo("success")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Reset failed. The link may have expired.")
    } finally {
      setLoading(false)
    }
  }

  function handleBack() {
    if (screen === "sent") {
      transitionTo("request")
      return
    }
    if (screen === "newPassword" && !tokenParam) {
      transitionTo("sent")
      return
    }
    router.back()
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  function renderRequest() {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Icon */}
          <BlurView intensity={32} tint="dark" style={[s.iconCard, s.iconCardAmber]}>
            <LockResetIcon />
          </BlurView>

          <Text style={s.title}>Reset Password</Text>
          <Text style={s.subtitle}>
            Enter your account email and we'll send a secure reset link.
          </Text>

          {/* Email field */}
          <Text style={s.fieldLabel}>Email address</Text>
          <View style={[s.field, emailFocused && s.fieldFocused, !!error && s.fieldError]}>
            <EnvelopeIcon opacity={emailFocused ? 0.6 : 0.4} />
            <TextInput
              ref={emailRef}
              style={s.fieldInput}
              value={email}
              onChangeText={(t) => {
                setEmail(t)
                setError(null)
              }}
              placeholder="you@company.com"
              placeholderTextColor="rgba(255,255,255,0.22)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="go"
              onSubmitEditing={handleRequest}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              selectionColor="rgba(255,255,255,0.6)"
            />
          </View>

          {error ? <Text style={s.errorText}>{error}</Text> : null}

          {/* Info banner */}
          <View style={s.infoBanner}>
            <Svg
              width={16}
              height={16}
              viewBox="0 0 16 16"
              fill="none"
              style={{ flexShrink: 0, marginTop: 1 }}
            >
              <Circle cx={8} cy={8} r={7} stroke="rgba(255,255,255,0.3)" strokeWidth={1.3} />
              <Path
                d="M8 7V11"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
              <Circle cx={8} cy={5} r={0.8} fill="rgba(255,255,255,0.5)" />
            </Svg>
            <Text style={s.infoBannerText}>
              For security, we never confirm whether an account exists. If registered, a reset link
              will arrive within a minute.
            </Text>
          </View>

          {/* Send button */}
          <TouchableOpacity
            style={s.btnPrimary}
            onPress={handleRequest}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <>
                <ArrowRightIcon dark />
                <Text style={s.btnPrimaryText}>Send Reset Link</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.linkRow} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={s.linkText}>
              Remembered it? <Text style={s.linkAccent}>Back to Sign In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  function renderSent() {
    return (
      <ScrollView
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <BlurView intensity={32} tint="dark" style={[s.iconCard, s.iconCardWhite]}>
          <EnvelopeCheckIcon />
        </BlurView>

        <Text style={s.title}>Check Your Email</Text>
        <Text style={s.subtitle}>
          A reset link was sent to{" "}
          <Text style={{ color: "rgba(255,255,255,0.78)", fontWeight: "500" }}>{sentEmail}</Text>.
          Open it on this device to continue.
        </Text>

        {/* Email info card */}
        <BlurView intensity={24} tint="dark" style={s.infoCard}>
          <EnvelopeIcon opacity={0.4} />
          <View style={{ flex: 1 }}>
            <Text style={s.infoCardEmail}>{sentEmail}</Text>
            <Text style={s.infoCardHint}>Link expires in 15 minutes</Text>
          </View>
        </BlurView>

        {/* Divider */}
        <View style={s.divider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>Didn't receive it?</Text>
          <View style={s.dividerLine} />
        </View>

        {/* Resend */}
        <TouchableOpacity
          style={[s.btnGhost, resendCooldown > 0 && s.btnGhostDisabled]}
          onPress={handleResend}
          disabled={loading || resendCooldown > 0}
          activeOpacity={0.75}
        >
          {loading ? (
            <ActivityIndicator color="rgba(255,255,255,0.5)" size="small" />
          ) : (
            <>
              <ArrowClockwiseIcon />
              <Text style={s.btnGhostText}>Resend Reset Link</Text>
            </>
          )}
        </TouchableOpacity>

        {resendCooldown > 0 && (
          <Text style={s.countdownText}>
            Available again in{" "}
            <Text style={{ color: "rgba(255,255,255,0.6)" }}>{resendCooldown}s</Text>
          </Text>
        )}

        {/* Change email */}
        <TouchableOpacity
          style={[s.btnGhost, { marginTop: 8 }]}
          onPress={() => transitionTo("request")}
          activeOpacity={0.75}
        >
          <ArrowRightIcon />
          <Text style={s.btnGhostText}>Use a Different Email</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.linkRow, { marginTop: 24 }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={s.linkText}>
            Back to <Text style={s.linkAccent}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    )
  }

  function renderNewPassword() {
    const segColor = (idx: number) => (idx < score ? strengthColor(score) : "rgba(255,255,255,0.1)")
    const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword
    const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Icon */}
          <BlurView intensity={32} tint="dark" style={[s.iconCard, s.iconCardWhite]}>
            <KeyIcon />
          </BlurView>

          <Text style={s.title}>New Password</Text>
          <Text style={s.subtitle}>
            Set a strong password for your account. All existing sessions will be signed out for
            security.
          </Text>

          {/* New password */}
          <Text style={s.fieldLabel}>New password</Text>
          <View
            style={[
              s.field,
              passwordFocused && s.fieldFocused,
              !!error && !password && s.fieldError,
            ]}
          >
            <LockIcon opacity={passwordFocused ? 0.6 : 0.4} />
            <TextInput
              ref={passwordRef}
              style={s.fieldInput}
              value={password}
              onChangeText={(t) => {
                setPassword(t)
                setError(null)
              }}
              placeholder="Min. 12 characters"
              placeholderTextColor="rgba(255,255,255,0.22)"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              selectionColor="rgba(255,255,255,0.6)"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={12}
              activeOpacity={0.7}
            >
              <EyeIcon hidden={showPassword} />
            </TouchableOpacity>
          </View>

          {/* Strength bar */}
          {password.length > 0 && (
            <View style={{ marginTop: 10, marginBottom: 4 }}>
              <View style={s.strengthBar}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={[s.strengthSeg, { backgroundColor: segColor(i) }]} />
                ))}
              </View>
              <Text style={[s.strengthLabel, { color: strengthColor(score) }]}>
                {strengthLabel(score)}
              </Text>
            </View>
          )}

          {/* Requirements */}
          <View style={s.requirements}>
            {(
              [
                [strength.hasLength, "At least 12 characters"],
                [strength.hasUpper, "One uppercase letter"],
                [strength.hasNumber, "One number"],
                [strength.hasSpecial, "One special character"],
              ] as [boolean, string][]
            ).map(([met, label]) => (
              <View key={label} style={s.reqRow}>
                <View style={[s.reqDot, met && s.reqDotMet]} />
                <Text style={[s.reqText, met && s.reqTextMet]}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Confirm password */}
          <Text style={[s.fieldLabel, { marginTop: 8 }]}>Confirm password</Text>
          <View
            style={[
              s.field,
              confirmFocused && s.fieldFocused,
              passwordMismatch && s.fieldError,
              passwordsMatch && s.fieldSuccess,
            ]}
          >
            <LockIcon opacity={confirmFocused ? 0.6 : 0.4} />
            <TextInput
              ref={confirmRef}
              style={s.fieldInput}
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t)
                setError(null)
              }}
              placeholder="Re-enter password"
              placeholderTextColor="rgba(255,255,255,0.22)"
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleConfirm}
              onFocus={() => setConfirmFocused(true)}
              onBlur={() => setConfirmFocused(false)}
              selectionColor="rgba(255,255,255,0.6)"
            />
            <TouchableOpacity
              onPress={() => setShowConfirm((v) => !v)}
              hitSlop={12}
              activeOpacity={0.7}
            >
              {passwordsMatch ? (
                <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
                  <Path
                    d="M3 9L7.5 13.5L15 5"
                    stroke={colors.green}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              ) : (
                <EyeIcon hidden={showConfirm} />
              )}
            </TouchableOpacity>
          </View>

          {passwordMismatch && <Text style={s.errorText}>Passwords do not match.</Text>}

          {error ? <Text style={[s.errorText, { marginTop: 12 }]}>{error}</Text> : null}

          {/* Submit */}
          <TouchableOpacity
            style={[s.btnPrimary, { marginTop: 24 }]}
            onPress={handleConfirm}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <>
                <LockIcon opacity={0} />
                <Text style={s.btnPrimaryText}>Update Password</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  function renderSuccess() {
    return (
      <View style={[s.successContainer, { paddingBottom: insets.bottom + 24 }]}>
        <View style={{ flex: 1 }} />

        {/* Icon */}
        <View style={s.successIconWrap}>
          <CheckCircleIcon />
        </View>

        <Text style={[s.title, { textAlign: "center" }]}>Password Updated</Text>
        <Text style={[s.subtitle, { textAlign: "center", marginBottom: 32 }]}>
          Your password has been changed and all devices have been signed out for security.
        </Text>

        {/* Confirmation list */}
        <View style={s.successList}>
          {[
            "Password updated successfully",
            "All other sessions revoked",
            "Security token invalidated",
          ].map((item) => (
            <View key={item} style={s.successItem}>
              <View style={s.successDot} />
              <Text style={s.successItemText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          style={s.btnPrimary}
          onPress={() => router.replace("/(auth)/login")}
          activeOpacity={0.85}
        >
          <Text style={s.btnPrimaryText}>Sign In with New Password</Text>
          <ArrowRightIcon dark />
        </TouchableOpacity>
      </View>
    )
  }

  // ── Layout ─────────────────────────────────────────────────────────────────

  const showBack = screen !== "success"

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Back button */}
      {showBack && (
        <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <ChevronLeft />
          <Text style={s.backLabel}>
            {screen === "sent"
              ? "Reset Password"
              : screen === "newPassword" && !tokenParam
                ? "Password Reset"
                : "Sign In"}
          </Text>
        </TouchableOpacity>
      )}

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {screen === "request" && renderRequest()}
        {screen === "sent" && renderSent()}
        {screen === "newPassword" && renderNewPassword()}
        {screen === "success" && renderSuccess()}
      </Animated.View>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
    alignSelf: "flex-start",
  },
  backLabel: {
    fontSize: 17,
    fontWeight: "400",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: -0.2,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    flexGrow: 1,
  },

  // Icon card
  iconCard: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    overflow: "hidden",
    borderWidth: 1,
  },
  iconCardAmber: {
    borderColor: "rgba(251,191,36,0.22)",
    backgroundColor: "rgba(251,191,36,0.08)",
  },
  iconCardWhite: {
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  // Typography
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "rgba(255,255,255,0.95)",
    letterSpacing: -0.6,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "400",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: -0.1,
    lineHeight: 22,
    marginBottom: 32,
  },

  // Field
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 0.04,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: radius.base,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 4,
  },
  fieldFocused: {
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  fieldError: {
    borderColor: "rgba(239,68,68,0.5)",
    backgroundColor: "rgba(239,68,68,0.06)",
  },
  fieldSuccess: {
    borderColor: "rgba(52,211,153,0.35)",
    backgroundColor: "rgba(52,211,153,0.04)",
  },
  fieldInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: "400",
    color: "rgba(255,255,255,0.88)",
    letterSpacing: -0.2,
  },

  // Strength
  strengthBar: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 5,
  },
  strengthSeg: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Requirements
  requirements: {
    gap: 7,
    marginTop: 12,
    marginBottom: 20,
  },
  reqRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reqDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  reqDotMet: {
    backgroundColor: "rgba(52,211,153,0.8)",
  },
  reqText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.38)",
  },
  reqTextMet: {
    color: "rgba(52,211,153,0.85)",
  },

  // Buttons
  btnPrimary: {
    backgroundColor: "#fff",
    borderRadius: radius.base,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  btnPrimaryText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
    letterSpacing: -0.2,
  },
  btnGhost: {
    borderRadius: radius.base,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    marginTop: 0,
  },
  btnGhostDisabled: {
    opacity: 0.45,
  },
  btnGhostText: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: -0.1,
  },

  // Error
  errorText: {
    fontSize: 13,
    color: "rgba(239,68,68,0.85)",
    marginTop: 6,
    marginLeft: 2,
  },

  // Info banner
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 24,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: "rgba(255,255,255,0.42)",
    lineHeight: 19,
  },

  // Link
  linkRow: {
    marginTop: 16,
    alignItems: "center",
  },
  linkText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: -0.1,
  },
  linkAccent: {
    color: "rgba(255,255,255,0.75)",
    textDecorationLine: "underline",
  },

  // Sent screen
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.card,
    padding: 18,
    marginBottom: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  infoCardEmail: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: -0.2,
  },
  infoCardHint: {
    fontSize: 13,
    color: "rgba(255,255,255,0.38)",
    marginTop: 3,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  dividerText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.25)",
    fontWeight: "500",
    letterSpacing: 0.04,
    textTransform: "uppercase",
  },
  countdownText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
    marginTop: 10,
  },

  // Success
  successContainer: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  successIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 30,
    backgroundColor: "rgba(52,211,153,0.08)",
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  successList: {
    gap: 14,
    alignSelf: "stretch",
    marginBottom: 32,
  },
  successItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  successDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(52,211,153,0.65)",
  },
  successItemText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
    lineHeight: 21,
  },
})
