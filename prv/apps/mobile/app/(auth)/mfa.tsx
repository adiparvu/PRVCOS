import { useRef, useState } from "react"
import {
  ActivityIndicator,
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
import { PRVMark } from "@/components/PRVMark"
import { useAuthStore } from "@/store/auth"
import { colors, radius, spacing, type } from "@/tokens"

const CODE_LENGTH = 6

export default function MFAScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { token: mfaToken } = useLocalSearchParams<{ token: string }>()
  const { login, isLoading } = useAuthStore()

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""))
  const [error, setError] = useState<string | null>(null)
  const inputs = useRef<(TextInput | null)[]>([])

  function handleDigit(value: string, index: number) {
    const cleaned = value.replace(/\D/g, "").slice(-1)
    const next = [...digits]
    next[index] = cleaned
    setDigits(next)
    if (cleaned && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus()
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  async function handleVerify() {
    const code = digits.join("")
    if (code.length < CODE_LENGTH) {
      setError("Enter the 6-digit code from your authenticator app.")
      return
    }
    setError(null)
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/mfa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mfaToken, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Verification failed")
      await login({
        token: data.token,
        userId: data.userId,
        role: data.role,
        companyId: data.companyId,
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Verification failed. Please try again.")
      setDigits(Array(CODE_LENGTH).fill(""))
      inputs.current[0]?.focus()
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[styles.inner, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
      >
        <View style={styles.markWrap}>
          <PRVMark size={40} color="rgba(255,255,255,0.92)" />
        </View>

        <Text style={styles.title}>Two-Factor Auth</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code from{"\n"}your authenticator app</Text>

        <View style={styles.codeRow}>
          {digits.map((digit, i) => (
            <TextInput
              key={i}
              ref={(el) => {
                inputs.current[i] = el
              }}
              style={[styles.cell, digit ? styles.cellFilled : null]}
              value={digit}
              onChangeText={(v) => handleDigit(v, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="number-pad"
              keyboardAppearance="dark"
              maxLength={1}
              selectTextOnFocus
              autoFocus={i === 0}
            />
          ))}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleVerify}
          activeOpacity={0.85}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.primaryBtnText}>Verify</Text>
          )}
        </TouchableOpacity>

        <Pressable onPress={() => router.back()} style={styles.backWrap}>
          <Text style={styles.back}>← Back to login</Text>
        </Pressable>
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
  markWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
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
  codeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  cell: {
    width: 48,
    height: 56,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    textAlign: "center",
    ...type.title2,
    color: colors.text1,
  },
  cellFilled: {
    borderColor: "rgba(255,255,255,0.32)",
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  error: {
    ...type.footnote,
    color: colors.red,
    textAlign: "center",
    marginBottom: 12,
  },
  primaryBtn: {
    width: "100%",
    height: 50,
    backgroundColor: "#ffffff",
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryBtnText: {
    ...type.headline,
    color: "#000000",
  },
  backWrap: {
    marginTop: 24,
  },
  back: {
    ...type.footnote,
    color: colors.text3,
  },
})
