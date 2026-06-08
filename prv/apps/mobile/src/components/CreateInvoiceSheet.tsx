import {
  Animated,
  Modal,
  Platform,
  KeyboardAvoidingView,
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
import { useCreateInvoice, calcTotals, fmtLineTotal, type LineItem } from "@/hooks/useCreateFlows"

type Currency = "RON" | "EUR"
type Step = 1 | 2

const TODAY = new Date().toISOString().slice(0, 10)
const PLUS_14 = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
const DEFAULT_ITEM: () => LineItem = () => ({ name: "", qty: 1, unitPrice: 0, vatRate: 19 })

interface Props {
  visible: boolean
  onClose: () => void
}

export function CreateInvoiceSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const slideAnim = useRef(new Animated.Value(500)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const [shown, setShown] = useState(false)

  const [step, setStep] = useState<Step>(1)

  // Step 1 fields
  const [clientName, setClientName] = useState("")
  const [issueDate, setIssueDate] = useState(TODAY)
  const [dueDate, setDueDate] = useState(PLUS_14)
  const [currency, setCurrency] = useState<Currency>("RON")
  const [reference, setReference] = useState("")

  // Step 2 fields
  const [items, setItems] = useState<LineItem[]>([DEFAULT_ITEM()])

  const [formError, setFormError] = useState<string | null>(null)
  const { mutate, isPending } = useCreateInvoice()

  useEffect(() => {
    if (visible) {
      setStep(1)
      setClientName("")
      setIssueDate(TODAY)
      setDueDate(PLUS_14)
      setCurrency("RON")
      setReference("")
      setItems([DEFAULT_ITEM()])
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

  const updateItem = (idx: number, patch: Partial<LineItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))

  const addItem = () => setItems((prev) => [...prev, DEFAULT_ITEM()])

  const hasValidItems = items.some(
    (it) => it.name.trim().length > 0 && it.qty > 0 && it.unitPrice > 0
  )
  const totals = calcTotals(items)

  const goToStep2 = () => {
    if (!issueDate.trim() || !dueDate.trim()) {
      setFormError("Issue date and due date are required")
      return
    }
    setFormError(null)
    setStep(2)
  }

  const handleSubmit = () => {
    if (!hasValidItems) {
      setFormError("Add at least one item with name and price")
      return
    }
    setFormError(null)
    mutate(
      {
        issueDate: issueDate.trim(),
        dueDate: dueDate.trim(),
        currency,
        reference: reference.trim() || undefined,
        items: items.filter((it) => it.name.trim().length > 0),
      },
      {
        onSuccess: () => onClose(),
        onError: () => setFormError("Failed to create invoice. Please try again."),
      }
    )
  }

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
            <View style={s.headerLeft}>
              {step === 2 && (
                <TouchableOpacity style={s.backBtn} onPress={() => setStep(1)} activeOpacity={0.7}>
                  <Text style={s.backIcon}>‹</Text>
                </TouchableOpacity>
              )}
              <Text style={s.title}>{step === 1 ? "New Invoice" : "Line Items"}</Text>
            </View>
            <View style={s.headerRight}>
              <View style={s.stepRow}>
                <View style={[s.stepDot, step === 1 && s.stepDotActive]} />
                <View style={[s.stepDot, step === 2 && s.stepDotActive]} />
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <Text style={s.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={s.body}
            contentContainerStyle={s.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {step === 1 ? (
              <Step1
                clientName={clientName}
                setClientName={setClientName}
                issueDate={issueDate}
                setIssueDate={setIssueDate}
                dueDate={dueDate}
                setDueDate={setDueDate}
                currency={currency}
                setCurrency={setCurrency}
                reference={reference}
                setReference={setReference}
              />
            ) : (
              <Step2
                items={items}
                currency={currency}
                totals={totals}
                onUpdateItem={updateItem}
                onRemoveItem={removeItem}
                onAddItem={addItem}
              />
            )}

            {formError && <Text style={s.errorText}>{formError}</Text>}
          </ScrollView>

          <View style={s.ctaWrap}>
            {step === 1 ? (
              <TouchableOpacity style={s.cta} onPress={goToStep2} activeOpacity={0.85}>
                <Text style={s.ctaText}>Continue → Line Items</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.cta, (!hasValidItems || isPending) && s.ctaDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.85}
                disabled={!hasValidItems || isPending}
              >
                <Text style={s.ctaText}>{isPending ? "Creating…" : "Create Invoice"}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function Step1({
  clientName,
  setClientName,
  issueDate,
  setIssueDate,
  dueDate,
  setDueDate,
  currency,
  setCurrency,
  reference,
  setReference,
}: {
  clientName: string
  setClientName: (v: string) => void
  issueDate: string
  setIssueDate: (v: string) => void
  dueDate: string
  setDueDate: (v: string) => void
  currency: Currency
  setCurrency: (v: Currency) => void
  reference: string
  setReference: (v: string) => void
}) {
  return (
    <>
      <Text style={s.sectionLabel}>Client</Text>
      <View style={s.card}>
        <View style={s.cardShine} pointerEvents="none" />
        <View style={s.inputRow}>
          <Text style={s.inputIcon}>◇</Text>
          <TextInput
            style={s.input}
            placeholder="Client name"
            placeholderTextColor={colors.text4}
            value={clientName}
            onChangeText={setClientName}
            autoCapitalize="words"
          />
        </View>
      </View>

      <Text style={s.sectionLabel}>Details</Text>
      <View style={s.card}>
        <View style={s.cardShine} pointerEvents="none" />
        <View style={s.inputRow}>
          <Text style={s.inputIcon}>◎</Text>
          <TextInput
            style={s.input}
            placeholder="Issue date (YYYY-MM-DD)"
            placeholderTextColor={colors.text4}
            value={issueDate}
            onChangeText={setIssueDate}
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View style={s.divider} />
        <View style={s.inputRow}>
          <Text style={s.inputIcon}>◉</Text>
          <TextInput
            style={s.input}
            placeholder="Due date (YYYY-MM-DD)"
            placeholderTextColor={colors.text4}
            value={dueDate}
            onChangeText={setDueDate}
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View style={s.divider} />
        <View style={s.currencyRow}>
          <Text style={s.inputIcon}>⊗</Text>
          <Text style={s.currencyLabel}>Currency</Text>
          <View style={s.pills}>
            {(["RON", "EUR"] as Currency[]).map((c) => (
              <TouchableOpacity
                key={c}
                style={[s.pill, currency === c && s.pillActive]}
                onPress={() => setCurrency(c)}
                activeOpacity={0.75}
              >
                <Text style={[s.pillText, currency === c && s.pillTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={s.divider} />
        <View style={s.inputRow}>
          <Text style={s.inputIcon}>⊞</Text>
          <TextInput
            style={s.input}
            placeholder="Reference / PO number (optional)"
            placeholderTextColor={colors.text4}
            value={reference}
            onChangeText={setReference}
            autoCapitalize="characters"
          />
        </View>
      </View>
    </>
  )
}

function Step2({
  items,
  currency,
  totals,
  onUpdateItem,
  onRemoveItem,
  onAddItem,
}: {
  items: LineItem[]
  currency: string
  totals: { subtotal: number; vatAmount: number; total: number }
  onUpdateItem: (idx: number, patch: Partial<LineItem>) => void
  onRemoveItem: (idx: number) => void
  onAddItem: () => void
}) {
  return (
    <>
      <View style={s.card}>
        <View style={s.cardShine} pointerEvents="none" />
        {items.map((item, idx) => (
          <View key={idx}>
            {idx > 0 && <View style={s.divider} />}
            <InvItemEditor
              item={item}
              index={idx}
              currency={currency}
              onChange={(patch) => onUpdateItem(idx, patch)}
              onRemove={items.length > 1 ? () => onRemoveItem(idx) : undefined}
            />
          </View>
        ))}
        <View style={s.divider} />
        <TouchableOpacity style={s.addItemBtn} onPress={onAddItem} activeOpacity={0.7}>
          <Text style={s.addItemIcon}>+</Text>
          <Text style={s.addItemText}>Add line item</Text>
        </TouchableOpacity>
      </View>

      <View style={s.totalsCard}>
        <View style={s.totalsCardShine} pointerEvents="none" />
        <TRow label="Subtotal" value={`${currency} ${totals.subtotal.toFixed(2)}`} />
        <TRow label="VAT (19%)" value={`${currency} ${totals.vatAmount.toFixed(2)}`} />
        <View style={s.totalsBorder} />
        <TRow label="Total" value={`${currency} ${totals.total.toFixed(2)}`} bold />
      </View>
    </>
  )
}

function InvItemEditor({
  item,
  index,
  currency,
  onChange,
  onRemove,
}: {
  item: LineItem
  index: number
  currency: string
  onChange: (patch: Partial<LineItem>) => void
  onRemove?: () => void
}) {
  return (
    <View style={ie.wrap}>
      <View style={ie.topRow}>
        <Text style={ie.num}>{index + 1}</Text>
        <TextInput
          style={[ie.nameInput, { flex: 1 }]}
          placeholder="Description"
          placeholderTextColor={colors.text4}
          value={item.name}
          onChangeText={(v) => onChange({ name: v })}
          autoCapitalize="sentences"
        />
        {onRemove && (
          <TouchableOpacity onPress={onRemove} style={ie.removeBtn} activeOpacity={0.7}>
            <Text style={ie.removeText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={ie.bottomRow}>
        <TextInput
          style={ie.numInput}
          placeholder="Qty"
          placeholderTextColor={colors.text4}
          value={item.qty > 0 ? String(item.qty) : ""}
          onChangeText={(v) => onChange({ qty: parseFloat(v) || 0 })}
          keyboardType="decimal-pad"
        />
        <Text style={ie.mult}>×</Text>
        <TextInput
          style={ie.numInput}
          placeholder="Price"
          placeholderTextColor={colors.text4}
          value={item.unitPrice > 0 ? String(item.unitPrice) : ""}
          onChangeText={(v) => onChange({ unitPrice: parseFloat(v) || 0 })}
          keyboardType="decimal-pad"
        />
        <TextInput
          style={ie.vatInput}
          placeholder="VAT%"
          placeholderTextColor={colors.text4}
          value={item.vatRate > 0 ? String(item.vatRate) : ""}
          onChangeText={(v) => onChange({ vatRate: parseFloat(v) || 0 })}
          keyboardType="decimal-pad"
        />
        <Text style={ie.total}>
          {currency} {fmtLineTotal(item)}
        </Text>
      </View>
    </View>
  )
}

function TRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={tr.row}>
      <Text style={[tr.label, bold && tr.labelBold]}>{label}</Text>
      <Text style={[tr.value, bold && tr.valueBold]}>{value}</Text>
    </View>
  )
}

const ie = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.base, paddingVertical: 10, gap: 6 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  num: { fontSize: 12, color: colors.text3, width: 16, textAlign: "center" },
  nameInput: { fontSize: 13, color: colors.text1, padding: 0 },
  removeBtn: { padding: 4 },
  removeText: { fontSize: 11, color: colors.text3 },
  bottomRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 24 },
  numInput: {
    width: 52,
    fontSize: 12,
    color: colors.text2,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    padding: 0,
    textAlign: "center",
  },
  vatInput: {
    width: 44,
    fontSize: 12,
    color: colors.text2,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    padding: 0,
    textAlign: "center",
  },
  mult: { fontSize: 11, color: colors.text3 },
  total: { flex: 1, fontSize: 12, color: colors.text2, textAlign: "right", fontWeight: "600" },
})

const tr = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 9,
  },
  label: { fontSize: 13, color: colors.text3 },
  value: { fontSize: 13, color: colors.text2 },
  labelBold: { color: colors.text2, fontWeight: "600" },
  valueBold: { fontSize: 15, color: colors.text1, fontWeight: "700" },
})

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
    maxHeight: "92%",
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
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 20, color: colors.text2, marginTop: -1 },
  title: { fontSize: 17, fontWeight: "700", color: colors.text1, letterSpacing: -0.3 },
  stepRow: { flexDirection: "row", gap: 5 },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  stepDotActive: { backgroundColor: "rgba(255,255,255,0.75)" },
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
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginHorizontal: spacing.base },

  currencyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: 10,
    gap: 10,
  },
  currencyLabel: { fontSize: 14, color: colors.text2, flex: 1 },
  pills: { flexDirection: "row", gap: 6 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  pillActive: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.25)",
  },
  pillText: { fontSize: 12, fontWeight: "600", color: colors.text3 },
  pillTextActive: { color: colors.text1 },

  addItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
  },
  addItemIcon: { fontSize: 16, color: colors.text3, width: 20, textAlign: "center" },
  addItemText: { fontSize: 13, color: colors.text3 },

  totalsCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
  },
  totalsCardShine: {
    position: "absolute",
    top: 0,
    left: 14,
    right: 14,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  totalsBorder: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginHorizontal: spacing.base,
  },

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
