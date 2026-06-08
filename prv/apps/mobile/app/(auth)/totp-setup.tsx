import { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { BlurView } from "expo-blur"
import Svg, { Path, Rect, Circle } from "react-native-svg"
import { SvgXml } from "react-native-svg"
import { api } from "@/lib/api"
import { colors, radius, spacing, type } from "@/tokens"

const CODE_LENGTH = 6

type Step = 1 | 2 | 3

interface EnrollData {
  factorId: string
  qrCodeUrl: string
  secret: string
}

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

// SF Symbol: chevron.right (for "Can't scan?" toggle)
function ChevronRight({ open }: { open: boolean }) {
  return (
    <Svg
      width={10}
      height={14}
      viewBox="0 0 10 14"
      fill="none"
      style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}
    >
      <Path
        d="M2 1L8 7L2 13"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// SF Symbol: qrcode
function QRCodeIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 30 30" fill="none">
      <Rect
        x={2}
        y={2}
        width={11}
        height={11}
        rx={2}
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={1.8}
      />
      <Rect x={5} y={5} width={5} height={5} rx={1} fill="rgba(255,255,255,0.85)" />
      <Rect
        x={17}
        y={2}
        width={11}
        height={11}
        rx={2}
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={1.8}
      />
      <Rect x={20} y={5} width={5} height={5} rx={1} fill="rgba(255,255,255,0.85)" />
      <Rect
        x={2}
        y={17}
        width={11}
        height={11}
        rx={2}
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={1.8}
      />
      <Rect x={5} y={20} width={5} height={5} rx={1} fill="rgba(255,255,255,0.85)" />
      <Rect x={17} y={17} width={4} height={4} rx={1} fill="rgba(255,255,255,0.85)" />
      <Rect x={23} y={17} width={4} height={4} rx={1} fill="rgba(255,255,255,0.85)" />
      <Rect x={17} y={23} width={4} height={4} rx={1} fill="rgba(255,255,255,0.85)" />
      <Rect x={23} y={23} width={4} height={4} rx={1} fill="rgba(255,255,255,0.85)" />
    </Svg>
  )
}

// SF Symbol: checkmark.shield
function ShieldCheckIcon() {
  return (
    <Svg width={28} height={32} viewBox="0 0 28 32" fill="none">
      <Path
        d="M14 2L3 6V14C3 20.6 7.8 26.8 14 29C20.2 26.8 25 20.6 25 14V6L14 2Z"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path
        d="M9 15L12.5 18.5L19 12"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// SF Symbol: key.horizontal
function KeyIcon() {
  return (
    <Svg width={32} height={20} viewBox="0 0 32 20" fill="none">
      <Circle cx={8} cy={10} r={7} stroke="rgba(255,255,255,0.85)" strokeWidth={2} />
      <Path d="M15 10H30" stroke="rgba(255,255,255,0.85)" strokeWidth={2} strokeLinecap="round" />
      <Path d="M26 10V14" stroke="rgba(255,255,255,0.85)" strokeWidth={2} strokeLinecap="round" />
      <Path d="M30 10V13" stroke="rgba(255,255,255,0.85)" strokeWidth={2} strokeLinecap="round" />
      <Circle cx={8} cy={10} r={2.5} fill="rgba(255,255,255,0.85)" />
    </Svg>
  )
}

// SF Symbol: checkmark.circle.fill
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

// SF Symbol: doc.on.doc
function CopyIcon({ dim = false }: { dim?: boolean }) {
  const c = dim ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.55)"
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Rect x={5} y={1} width={9} height={12} rx={2} stroke={c} strokeWidth={1.4} />
      <Rect
        x={2}
        y={4}
        width={9}
        height={12}
        rx={2}
        fill={dim ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)"}
        stroke={c}
        strokeWidth={1.4}
      />
    </Svg>
  )
}

// SF Symbol: exclamationmark.triangle
function WarningIcon() {
  return (
    <Svg width={18} height={16} viewBox="0 0 18 16" fill="none">
      <Path
        d="M9 1L1 15H17L9 1Z"
        stroke="rgba(255,179,64,0.85)"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path d="M9 6V10" stroke="rgba(255,179,64,0.85)" strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={9} cy={12.5} r={0.9} fill="rgba(255,179,64,0.85)" />
    </Svg>
  )
}

// SF Symbol: lock.fill (for completion card)
function LockFillGreen() {
  return (
    <Svg width={20} height={24} viewBox="0 0 28 34" fill="none">
      <Path
        d="M7 15V10C7 6.13 10.13 3 14 3C17.87 3 21 6.13 21 10V15"
        stroke="rgba(52,199,89,0.85)"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Rect x={3} y={14} width={22} height={17} rx={4} fill="rgba(52,199,89,0.85)" />
      <Circle cx={14} cy={22.5} r={2.5} fill="rgba(0,0,0,0.45)" />
      <Rect x={12.8} y={23.5} width={2.4} height={3.5} rx={1} fill="rgba(0,0,0,0.45)" />
    </Svg>
  )
}

function parseSvgXml(qrCodeUrl: string): string {
  if (qrCodeUrl.startsWith("data:image/svg+xml;base64,")) {
    try {
      return atob(qrCodeUrl.replace("data:image/svg+xml;base64,", ""))
    } catch {
      return qrCodeUrl
    }
  }
  if (qrCodeUrl.startsWith("data:image/svg+xml,")) {
    return decodeURIComponent(qrCodeUrl.replace("data:image/svg+xml,", ""))
  }
  return qrCodeUrl
}

function formatSecret(secret: string): string {
  // Insert space every 4 chars for readability
  return secret.match(/.{1,4}/g)?.join(" ") ?? secret
}

export default function TOTPSetupScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [step, setStep] = useState<Step>(1)
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null)
  const [enrollLoading, setEnrollLoading] = useState(true)
  const [enrollError, setEnrollError] = useState<string | null>(null)
  const [showSecret, setShowSecret] = useState(false)

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""))
  const [activeIndex, setActiveIndex] = useState(0)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  const [backupCodes, setBackupCodes] = useState<string[]>([])

  const inputs = useRef<(TextInput | null)[]>([])

  // Cursor blink
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

  // Enroll on mount
  useEffect(() => {
    async function enroll() {
      try {
        const data = await api.post<EnrollData>("/api/auth/totp", {})
        setEnrollData(data)
      } catch (e: unknown) {
        setEnrollError(e instanceof Error ? e.message : "Failed to start enrollment")
      } finally {
        setEnrollLoading(false)
      }
    }
    void enroll()
  }, [])

  function handleDigit(value: string, index: number) {
    const cleaned = value.replace(/\D/g, "").slice(-1)
    const next = [...digits]
    next[index] = cleaned
    setDigits(next)
    setVerifyError(null)
    if (cleaned && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus()
      setActiveIndex(index + 1)
    }
    if (cleaned && index === CODE_LENGTH - 1) {
      const full = next.join("")
      if (full.length === CODE_LENGTH) {
        void submitVerify(full)
      }
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === "Backspace" && !digits[index] && index > 0) {
      const next = [...digits]
      next[index - 1] = ""
      setDigits(next)
      inputs.current[index - 1]?.focus()
      setActiveIndex(index - 1)
    }
  }

  async function submitVerify(code: string) {
    if (!enrollData) return
    setVerifyLoading(true)
    setVerifyError(null)
    try {
      const res = await api.post<{ success: boolean; backupCodes: string[] }>(
        "/api/auth/totp/verify",
        { factorId: enrollData.factorId, code }
      )
      setBackupCodes(res.backupCodes)
      setStep(3)
    } catch (e: unknown) {
      setVerifyError(e instanceof Error ? e.message : "Invalid code. Try again.")
      setDigits(Array(CODE_LENGTH).fill(""))
      inputs.current[0]?.focus()
      setActiveIndex(0)
    } finally {
      setVerifyLoading(false)
    }
  }

  async function handleVerify() {
    const code = digits.join("")
    if (code.length < CODE_LENGTH) {
      setVerifyError("Enter the 6-digit code from your authenticator app.")
      return
    }
    await submitVerify(code)
  }

  async function handleCopyAll() {
    if (!backupCodes.length) return
    const text = backupCodes.map((c, i) => `${String(i + 1).padStart(2, "0")}. ${c}`).join("\n")
    await Share.share({ message: text })
  }

  const codeComplete = digits.every(Boolean)
  const hasError = !!verifyError

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button — hidden on completion */}
        {step !== 3 || backupCodes.length === 0 ? (
          <Pressable
            style={styles.backBtn}
            onPress={() => (step === 1 ? router.back() : setStep((s) => (s - 1) as Step))}
            hitSlop={12}
          >
            <ChevronLeft />
            <Text style={styles.backLabel}>{step === 1 ? "Security" : "Back"}</Text>
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}

        {/* Step indicator */}
        <View style={styles.stepRow}>
          {([1, 2, 3] as Step[]).map((s) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                s === step && styles.stepDotActive,
                s < step && styles.stepDotDone,
              ]}
            />
          ))}
        </View>

        {/* ── STEP 1: QR / Enroll ── */}
        {step === 1 && (
          <>
            <View style={styles.iconCard}>
              <QRCodeIcon />
            </View>
            <Text style={styles.title}>Set Up Authenticator</Text>
            <Text style={styles.subtitle}>
              Scan the QR code with <Text style={styles.subtitleBold}>Google Authenticator</Text>
              {", Authy,\nor any compatible app."}
            </Text>

            {enrollLoading ? (
              <View style={styles.qrCard}>
                <View style={styles.qrPlaceholder}>
                  <ActivityIndicator color="rgba(255,255,255,0.3)" />
                </View>
              </View>
            ) : enrollError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{enrollError}</Text>
              </View>
            ) : enrollData ? (
              <View style={styles.qrCard}>
                {/* QR code in white frame */}
                <View style={styles.qrFrame}>
                  <SvgXml xml={parseSvgXml(enrollData.qrCodeUrl)} width={152} height={152} />
                </View>

                {/* Can't scan toggle */}
                <Pressable
                  style={styles.cantScanRow}
                  onPress={() => setShowSecret((v) => !v)}
                  hitSlop={8}
                >
                  <ChevronRight open={showSecret} />
                  <Text style={styles.cantScanLabel}>
                    {showSecret ? "Manual setup key" : "Can't scan? Enter manually"}
                  </Text>
                </Pressable>

                {showSecret && (
                  <View style={styles.secretRow}>
                    <Text style={styles.secretText}>{formatSecret(enrollData.secret)}</Text>
                    <Pressable
                      style={styles.copyBtn}
                      onPress={() => Share.share({ message: enrollData.secret })}
                      hitSlop={8}
                    >
                      <CopyIcon />
                    </Pressable>
                  </View>
                )}
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryBtn, (enrollLoading || !!enrollError) && styles.primaryBtnDim]}
              onPress={() => setStep(2)}
              disabled={enrollLoading || !!enrollError}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.primaryBtnText,
                  (enrollLoading || !!enrollError) && styles.primaryBtnTextDim,
                ]}
              >
                Continue
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── STEP 2: Verify Code ── */}
        {step === 2 && (
          <>
            <View style={styles.iconCard}>
              <ShieldCheckIcon />
            </View>
            <Text style={styles.title}>Verify Your App</Text>
            <Text style={styles.subtitle}>
              {"Enter the 6-digit code from your\n"}
              <Text style={styles.subtitleBold}>authenticator app</Text>
              {" to confirm setup."}
            </Text>

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

            {verifyError && <Text style={styles.errorText}>{verifyError}</Text>}

            <TouchableOpacity
              style={[styles.primaryBtn, (!codeComplete || verifyLoading) && styles.primaryBtnDim]}
              onPress={handleVerify}
              disabled={!codeComplete || verifyLoading}
              activeOpacity={0.85}
            >
              {verifyLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={[styles.primaryBtnText, !codeComplete && styles.primaryBtnTextDim]}>
                  Verify
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* ── STEP 3: Backup Codes ── */}
        {step === 3 && backupCodes.length === 0 && (
          /* Completion — no backup codes returned (shouldn't happen but guard) */
          <View style={styles.completionWrap}>
            <View style={styles.doneIconCard}>
              <CheckCircleFill />
            </View>
            <Text style={styles.title}>You're Protected</Text>
            <Text style={[styles.subtitle, { marginBottom: 40 }]}>
              Two-factor authentication is now enabled on your account.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && backupCodes.length > 0 && (
          <>
            <View style={styles.iconCard}>
              <KeyIcon />
            </View>
            <Text style={styles.title}>Save Backup Codes</Text>
            <Text style={[styles.subtitle, { marginBottom: 16 }]}>
              {"Each code can be used "}
              <Text style={styles.subtitleBold}>once</Text>
              {" if you lose access\nto your authenticator app."}
            </Text>

            {/* Amber warning */}
            <View style={styles.warningBanner}>
              <WarningIcon />
              <Text style={styles.warningText}>
                <Text style={styles.warningBold}>Not shown again.</Text>
                {" Store these securely — screenshot, print, or save to a password manager."}
              </Text>
            </View>

            {/* 2-column grid */}
            <View style={styles.codesGrid}>
              {backupCodes.map((code, i) => (
                <View key={i} style={styles.codeChip}>
                  <Text style={styles.codeNum}>{String(i + 1).padStart(2, "0")}</Text>
                  <Text style={styles.codeVal}>{code}</Text>
                </View>
              ))}
            </View>

            {/* Copy All */}
            <TouchableOpacity style={styles.copyAllBtn} onPress={handleCopyAll} activeOpacity={0.8}>
              <CopyIcon dim />
              <Text style={styles.copyAllLabel}>Copy All Codes</Text>
            </TouchableOpacity>

            {/* Completion card */}
            <View style={styles.doneCard}>
              <View style={styles.doneCardIcon}>
                <LockFillGreen />
              </View>
              <View style={styles.doneCardText}>
                <Text style={styles.doneCardTitle}>10 backup codes generated</Text>
                <Text style={styles.doneCardSub}>Store them securely. Each works once.</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>I've Saved These</Text>
            </TouchableOpacity>
          </>
        )}
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
  backBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 28,
    paddingVertical: 4,
    minHeight: 28,
  },
  backLabel: {
    ...type.subhead,
    color: "rgba(255,255,255,0.65)",
  },
  stepRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 32,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  stepDotActive: {
    width: 20,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  stepDotDone: {
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  iconCard: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 0,
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
  subtitleBold: {
    color: "rgba(255,255,255,0.65)",
    fontWeight: "600",
  },
  qrCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 0,
  },
  qrFrame: {
    width: 176,
    height: 176,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  qrPlaceholder: {
    width: 176,
    height: 176,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  cantScanRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cantScanLabel: {
    ...type.footnote,
    color: "rgba(255,255,255,0.4)",
  },
  secretRow: {
    marginTop: 14,
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secretText: {
    flex: 1,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 1,
    lineHeight: 20,
  },
  copyBtn: {
    width: 30,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  errorBanner: {
    width: "100%",
    backgroundColor: "rgba(255,59,48,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,59,48,0.2)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  errorBannerText: {
    ...type.footnote,
    color: colors.red,
    textAlign: "center",
  },
  codeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
    width: "100%",
    justifyContent: "center",
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
  },
  cursor: {
    width: 2,
    height: 22,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 1,
  },
  errorText: {
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
  warningBanner: {
    width: "100%",
    backgroundColor: "rgba(255,179,64,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,179,64,0.18)",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    ...type.footnote,
    color: "rgba(255,179,64,0.85)",
    lineHeight: 18,
  },
  warningBold: {
    fontWeight: "600",
  },
  codesGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  codeChip: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  codeNum: {
    fontSize: 11,
    color: "rgba(255,255,255,0.2)",
    fontWeight: "500",
    minWidth: 16,
  },
  codeVal: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.5,
  },
  copyAllBtn: {
    width: "100%",
    height: 44,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  copyAllLabel: {
    ...type.callout,
    color: "rgba(255,255,255,0.55)",
  },
  doneCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  doneCardIcon: {
    width: 44,
    height: 44,
    backgroundColor: "rgba(52,199,89,0.12)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  doneCardText: {
    flex: 1,
  },
  doneCardTitle: {
    ...type.callout,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 3,
    fontWeight: "600",
  },
  doneCardSub: {
    ...type.footnote,
    color: "rgba(255,255,255,0.35)",
    lineHeight: 18,
  },
  completionWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  doneIconCard: {
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
})
