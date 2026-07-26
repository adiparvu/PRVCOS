import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { useRef, useEffect, useState } from "react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { colors, radius, spacing } from "@/tokens"
import {
  useReportIncident,
  type IncidentSeverity,
  type IncidentType,
} from "@/hooks/useReportIncident"

// Field incident reporting — same glass bottom-sheet pattern as the other
// Create*Sheets. Submits through the durable offline queue: on a site with
// no signal the report is saved locally and replayed on reconnect.

const TYPES: { value: IncidentType; icon: string; label: string }[] = [
  { value: "near_miss", icon: "◍", label: "Near miss" },
  { value: "hazard", icon: "△", label: "Hazard" },
  { value: "accident", icon: "✚", label: "Accident" },
  { value: "property_damage", icon: "⊟", label: "Property damage" },
  { value: "environmental", icon: "❀", label: "Environmental" },
  { value: "security", icon: "◈", label: "Security" },
]

const SEVERITIES: { value: IncidentSeverity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
]

interface Props {
  visible: boolean
  onClose: () => void
  /** Called after a successful submit with whether it was queued offline. */
  onSubmitted?: (queued: boolean) => void
}

export function ReportIncidentSheet({ visible, onClose, onSubmitted }: Props) {
  const insets = useSafeAreaInsets()
  const slideAnim = useRef(new Animated.Value(500)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const [shown, setShown] = useState(false)

  const [type, setType] = useState<IncidentType>("near_miss")
  const [severity, setSeverity] = useState<IncidentSeverity>("medium")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [injuries, setInjuries] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const { mutate, isPending } = useReportIncident()

  useEffect(() => {
    if (visible) {
      setType("near_miss")
      setSeverity("medium")
      setTitle("")
      setDescription("")
      setLocation("")
      setInjuries("")
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
    if (!title.trim()) {
      setFormError("A short title is required")
      return
    }
    if (!description.trim()) {
      setFormError("Describe what happened")
      return
    }
    const injuriesNum = injuries.trim() ? parseInt(injuries, 10) : 0
    if (Number.isNaN(injuriesNum) || injuriesNum < 0) {
      setFormError("Injuries must be a number")
      return
    }
    setFormError(null)
    mutate(
      {
        title: title.trim(),
        description: description.trim(),
        type,
        severity,
        location: location.trim() || undefined,
        injuriesCount: type === "accident" ? injuriesNum : undefined,
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

  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && !isPending

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
            <Text style={s.title}>Report Incident</Text>
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
            {/* Type */}
            <Text style={s.sectionLabel}>What happened</Text>
            <View style={s.pillGrid}>
              {TYPES.map((t) => {
                const active = type === t.value
                return (
                  <TouchableOpacity
                    key={t.value}
                    style={[s.typePill, active && s.typePillActive]}
                    onPress={() => setType(t.value)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[s.typeIcon, active && s.typeIconActive]}>{t.icon}</Text>
                    <Text style={[s.typeLabel, active && s.typeLabelActive]}>{t.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Severity */}
            <Text style={s.sectionLabel}>Severity</Text>
            <View style={s.pillRow}>
              {SEVERITIES.map((sv) => {
                const active = severity === sv.value
                return (
                  <TouchableOpacity
                    key={sv.value}
                    style={[s.sevPill, active && s.sevPillActive]}
                    onPress={() => setSeverity(sv.value)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[s.sevText, active && s.sevTextActive]}>{sv.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Details */}
            <Text style={s.sectionLabel}>Details</Text>
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>◫</Text>
                <TextInput
                  style={s.input}
                  placeholder="Short title"
                  placeholderTextColor={colors.text4}
                  value={title}
                  onChangeText={setTitle}
                  autoCapitalize="sentences"
                  maxLength={300}
                />
              </View>
              <View style={s.divider} />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>≡</Text>
                <TextInput
                  style={[s.input, s.multiline]}
                  placeholder="What happened, who was involved, what was done"
                  placeholderTextColor={colors.text4}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  autoCapitalize="sentences"
                />
              </View>
              <View style={s.divider} />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>◎</Text>
                <TextInput
                  style={s.input}
                  placeholder="Location (optional)"
                  placeholderTextColor={colors.text4}
                  value={location}
                  onChangeText={setLocation}
                  maxLength={300}
                />
              </View>
              {type === "accident" && (
                <>
                  <View style={s.divider} />
                  <View style={s.inputRow}>
                    <Text style={s.inputIcon}>✚</Text>
                    <TextInput
                      style={s.input}
                      placeholder="Injuries (count)"
                      placeholderTextColor={colors.text4}
                      value={injuries}
                      onChangeText={setInjuries}
                      keyboardType="number-pad"
                    />
                  </View>
                </>
              )}
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
  multiline: { minHeight: 72, textAlignVertical: "top" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginHorizontal: spacing.base },

  pillGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  typePillActive: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.26)",
  },
  typeIcon: { fontSize: 13, color: colors.text3 },
  typeIconActive: { color: colors.text1 },
  typeLabel: { fontSize: 12, fontWeight: "600", color: colors.text3 },
  typeLabelActive: { color: colors.text1 },

  pillRow: { flexDirection: "row", gap: 8 },
  sevPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  sevPillActive: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.25)",
  },
  sevText: { fontSize: 13, fontWeight: "600", color: colors.text3 },
  sevTextActive: { color: colors.text1 },

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
