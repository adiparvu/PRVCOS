import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { useRef, useEffect, useState } from "react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { colors, radius, spacing } from "@/tokens"
import { useLogSiteUpdate } from "@/hooks/useSiteReports"

// Daily site update from the field (preview approved 2026-07) — same glass
// bottom-sheet pattern as the other Create*Sheets, submitted through the
// durable offline queue.

interface Props {
  projectId: string
  visible: boolean
  onClose: () => void
  /** Called after a successful submit with whether it was queued offline. */
  onSubmitted?: (queued: boolean) => void
}

function Stepper({
  label,
  value,
  display,
  onChange,
  min,
  max,
}: {
  label: string
  value: number
  display: string
  onChange: (next: number) => void
  min: number
  max: number
}) {
  return (
    <View style={s.stepper}>
      <View style={s.stepperShine} pointerEvents="none" />
      <Text style={s.stepperLabel}>{label}</Text>
      <Text style={s.stepperValue}>{display}</Text>
      <View style={s.stepperBtns}>
        <TouchableOpacity
          style={s.stepBtn}
          onPress={() => onChange(Math.max(min, value - 1))}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
        >
          <Text style={s.stepBtnText}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.stepBtn}
          onPress={() => onChange(Math.min(max, value + 1))}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
        >
          <Text style={s.stepBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export function LogSiteUpdateSheet({ projectId, visible, onClose, onSubmitted }: Props) {
  const insets = useSafeAreaInsets()
  const slideAnim = useRef(new Animated.Value(500)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const [shown, setShown] = useState(false)

  const [workPerformed, setWorkPerformed] = useState("")
  const [issues, setIssues] = useState("")
  const [workers, setWorkers] = useState(0)
  const [delta, setDelta] = useState(0)
  const [weather, setWeather] = useState("")
  const [clientVisible, setClientVisible] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const { mutate, isPending } = useLogSiteUpdate(projectId)

  useEffect(() => {
    if (visible) {
      setWorkPerformed("")
      setIssues("")
      setWorkers(0)
      setDelta(0)
      setWeather("")
      setClientVisible(false)
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
    if (!workPerformed.trim()) {
      setFormError("Describe the work performed today")
      return
    }
    setFormError(null)
    mutate(
      {
        workPerformed: workPerformed.trim(),
        issuesEncountered: issues.trim() || undefined,
        workersOnSite: workers,
        completionDelta: delta,
        weatherConditions: weather.trim() || undefined,
        clientVisible,
      },
      {
        onSuccess: (result) => {
          onClose()
          onSubmitted?.(result.queued)
        },
        onError: () => setFormError("Could not submit the report. Please try again."),
      }
    )
  }

  const canSubmit = workPerformed.trim().length > 0 && !isPending

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
            <Text style={s.title}>Log Site Update</Text>
            <TouchableOpacity
              style={s.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityLabel="Close"
            >
              <Text style={s.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={s.body}
            contentContainerStyle={s.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={s.sectionLabel}>Work performed*</Text>
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>≡</Text>
                <TextInput
                  style={[s.input, s.multiline]}
                  placeholder="What was done on site today"
                  placeholderTextColor={colors.text4}
                  value={workPerformed}
                  onChangeText={setWorkPerformed}
                  multiline
                  numberOfLines={3}
                  autoCapitalize="sentences"
                />
              </View>
            </View>

            <Text style={s.sectionLabel}>Issues encountered</Text>
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>△</Text>
                <TextInput
                  style={[s.input, s.multiline]}
                  placeholder="Optional — delays, blockers, missing materials"
                  placeholderTextColor={colors.text4}
                  value={issues}
                  onChangeText={setIssues}
                  multiline
                  numberOfLines={2}
                  autoCapitalize="sentences"
                />
              </View>
            </View>

            <Text style={s.sectionLabel}>Site conditions</Text>
            <View style={s.stepperRow}>
              <Stepper
                label="Workers on site"
                value={workers}
                display={String(workers)}
                onChange={setWorkers}
                min={0}
                max={500}
              />
              <Stepper
                label="Progress delta"
                value={delta}
                display={`${delta > 0 ? "+" : ""}${delta}%`}
                onChange={setDelta}
                min={-100}
                max={100}
              />
            </View>
            <View style={[s.card, { marginTop: 8 }]}>
              <View style={s.cardShine} pointerEvents="none" />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>◌</Text>
                <TextInput
                  style={s.input}
                  placeholder="Weather (optional)"
                  placeholderTextColor={colors.text4}
                  value={weather}
                  onChangeText={setWeather}
                  maxLength={100}
                />
              </View>
            </View>

            <View style={[s.card, { marginTop: 12 }]}>
              <View style={s.cardShine} pointerEvents="none" />
              <View style={s.toggleRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={s.toggleTitle}>Visible to client</Text>
                  <Text style={s.toggleDesc}>
                    The report (and its photos) will appear in the client portal
                  </Text>
                </View>
                <Switch
                  value={clientVisible}
                  onValueChange={setClientVisible}
                  trackColor={{ false: "rgba(255,255,255,0.12)", true: "rgba(255,255,255,0.85)" }}
                  thumbColor="#000"
                  accessibilityLabel="Visible to client"
                />
              </View>
            </View>

            <Text style={s.offlineNote}>
              No signal? The report is saved on this phone and sent automatically when you are back
              online.
            </Text>

            {formError && <Text style={s.errorText}>{formError}</Text>}
          </ScrollView>

          <View style={s.ctaWrap}>
            <TouchableOpacity
              style={[s.cta, !canSubmit && s.ctaDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={!canSubmit}
              accessibilityRole="button"
            >
              <Text style={s.ctaText}>{isPending ? "Submitting…" : "Submit Report"}</Text>
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
    maxHeight: "90%",
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
  multiline: { minHeight: 64, textAlignVertical: "top" },

  stepperRow: { flexDirection: "row", gap: 8 },
  stepper: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    borderRadius: 18,
    padding: 12,
    overflow: "hidden",
    position: "relative",
  },
  stepperShine: {
    position: "absolute",
    top: 0,
    left: 14,
    right: 14,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  stepperLabel: { fontSize: 11, color: colors.text3 },
  stepperValue: { fontSize: 17, fontWeight: "700", color: colors.text1, marginTop: 4 },
  stepperBtns: { flexDirection: "row", gap: 6, marginTop: 8 },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: { fontSize: 15, color: colors.text2 },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
  },
  toggleTitle: { fontSize: 14, color: colors.text1 },
  toggleDesc: { fontSize: 11, color: colors.text3, marginTop: 2, lineHeight: 15 },

  offlineNote: { fontSize: 11, color: colors.text3, lineHeight: 15, marginTop: 2, marginLeft: 2 },
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
