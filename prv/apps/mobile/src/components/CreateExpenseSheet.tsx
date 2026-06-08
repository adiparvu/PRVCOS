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
import { useCreateExpense, type ExpenseCategory } from "@/hooks/useCreateFlows"

const TODAY = new Date().toISOString().slice(0, 10)

const CATEGORIES: { value: ExpenseCategory; icon: string; label: string }[] = [
  { value: "materials", icon: "◈", label: "Materials" },
  { value: "labor", icon: "◐", label: "Labor" },
  { value: "equipment", icon: "⊟", label: "Equipment" },
  { value: "transport", icon: "◎", label: "Transport" },
  { value: "rent", icon: "⊙", label: "Rent" },
  { value: "utilities", icon: "◉", label: "Utilities" },
  { value: "marketing", icon: "◇", label: "Marketing" },
  { value: "salaries", icon: "◐", label: "Salaries" },
  { value: "subscriptions", icon: "⊕", label: "Subscriptions" },
  { value: "other", icon: "◫", label: "Other" },
]

interface Props {
  visible: boolean
  onClose: () => void
}

export function CreateExpenseSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const slideAnim = useRef(new Animated.Value(500)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const [shown, setShown] = useState(false)

  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<ExpenseCategory>("materials")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState<"RON" | "EUR">("RON")
  const [date, setDate] = useState(TODAY)
  const [status, setStatus] = useState<"draft" | "submitted">("submitted")
  const [notes, setNotes] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const { mutate, isPending } = useCreateExpense()

  useEffect(() => {
    if (visible) {
      setTitle("")
      setCategory("materials")
      setAmount("")
      setCurrency("RON")
      setDate(TODAY)
      setStatus("submitted")
      setNotes("")
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
      setFormError("Title is required")
      return
    }
    const amtNum = parseFloat(amount.replace(",", "."))
    if (!amount.trim() || isNaN(amtNum) || amtNum <= 0) {
      setFormError("Enter a valid amount")
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setFormError("Date must be YYYY-MM-DD")
      return
    }
    setFormError(null)
    mutate(
      {
        title: title.trim(),
        category,
        amount: amtNum,
        currency,
        date,
        status,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => onClose(),
        onError: () => setFormError("Failed to save expense. Please try again."),
      }
    )
  }

  const canSubmit = title.trim().length > 0 && amount.trim().length > 0 && !isPending

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
            <Text style={s.title}>New Expense</Text>
            <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={s.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={s.body}
            contentContainerStyle={s.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title */}
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>◫</Text>
                <TextInput
                  style={s.input}
                  placeholder="Expense title"
                  placeholderTextColor={colors.text4}
                  value={title}
                  onChangeText={setTitle}
                  autoCapitalize="sentences"
                />
              </View>
            </View>

            {/* Category */}
            <Text style={s.sectionLabel}>Category</Text>
            <View style={s.categoryGrid}>
              {CATEGORIES.map((c) => {
                const active = category === c.value
                return (
                  <TouchableOpacity
                    key={c.value}
                    style={[s.catPill, active && s.catPillActive]}
                    onPress={() => setCategory(c.value)}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.catIcon, active && s.catIconActive]}>{c.icon}</Text>
                    <Text style={[s.catLabel, active && s.catLabelActive]}>{c.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Amount & Date */}
            <Text style={s.sectionLabel}>Details</Text>
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>◎</Text>
                <TextInput
                  style={s.input}
                  placeholder="Amount"
                  placeholderTextColor={colors.text4}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
                <View style={s.currencyRow}>
                  {(["RON", "EUR"] as const).map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[s.currencyPill, currency === c && s.currencyPillActive]}
                      onPress={() => setCurrency(c)}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.currencyText, currency === c && s.currencyTextActive]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={s.divider} />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>◴</Text>
                <TextInput
                  style={s.input}
                  placeholder="Date (YYYY-MM-DD)"
                  placeholderTextColor={colors.text4}
                  value={date}
                  onChangeText={setDate}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            {/* Submit as */}
            <Text style={s.sectionLabel}>Submit as</Text>
            <View style={s.pillRow}>
              {(["draft", "submitted"] as const).map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[s.pill, status === st && s.pillActive]}
                  onPress={() => setStatus(st)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.pillText, status === st && s.pillTextActive]}>
                    {st.charAt(0).toUpperCase() + st.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text style={s.sectionLabel}>Notes</Text>
            <View style={s.card}>
              <View style={s.cardShine} pointerEvents="none" />
              <View style={s.inputRow}>
                <Text style={s.inputIcon}>≡</Text>
                <TextInput
                  style={[s.input, s.notesInput]}
                  placeholder="Optional notes"
                  placeholderTextColor={colors.text4}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  autoCapitalize="sentences"
                />
              </View>
            </View>

            {formError && <Text style={s.errorText}>{formError}</Text>}
          </ScrollView>

          <View style={s.ctaWrap}>
            <TouchableOpacity
              style={[s.cta, !canSubmit && s.ctaDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={!canSubmit}
            >
              <Text style={s.ctaText}>{isPending ? "Saving…" : "Save Expense"}</Text>
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
  notesInput: { minHeight: 56, textAlignVertical: "top" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginHorizontal: spacing.base },

  // Category grid
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  catPill: {
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
  catPillActive: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.26)",
  },
  catIcon: { fontSize: 13, color: colors.text3 },
  catIconActive: { color: colors.text1 },
  catLabel: { fontSize: 12, fontWeight: "600", color: colors.text3 },
  catLabelActive: { color: colors.text1 },

  // Currency
  currencyRow: { flexDirection: "row", gap: 5 },
  currencyPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  currencyPillActive: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.22)",
  },
  currencyText: { fontSize: 11, fontWeight: "700", color: colors.text3 },
  currencyTextActive: { color: colors.text1 },

  // Status pills
  pillRow: { flexDirection: "row", gap: 8 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  pillActive: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.25)",
  },
  pillText: { fontSize: 13, fontWeight: "600", color: colors.text3 },
  pillTextActive: { color: colors.text1 },

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
