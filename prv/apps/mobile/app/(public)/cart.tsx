import { useState } from "react"
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { GlassCard } from "@/components/Glass"
import { useCartStore, cartSubtotal, type CartLine } from "@/store/cart"
import { colors, radius, spacing, type } from "@/tokens"

// Mirrors the server: it applies 19% VAT on top of the line subtotal.
const VAT_RATE = 0.19

function money(value: number): string {
  return `€${value.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function Line({
  line,
  onDec,
  onInc,
  onRemove,
}: {
  line: CartLine
  onDec: () => void
  onInc: () => void
  onRemove: () => void
}) {
  return (
    <GlassCard style={styles.line}>
      <View style={{ flex: 1 }}>
        <Text style={styles.lineName} numberOfLines={2}>
          {line.name}
        </Text>
        <Text style={styles.linePrice}>{money(line.price)} each</Text>
      </View>
      <View style={styles.qtyRow}>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={onDec}
          activeOpacity={0.7}
          accessibilityLabel="Decrease quantity"
        >
          <Text style={styles.qtyBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.qtyValue}>{line.quantity}</Text>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={onInc}
          activeOpacity={0.7}
          accessibilityLabel="Increase quantity"
        >
          <Text style={styles.qtyBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        onPress={onRemove}
        activeOpacity={0.7}
        accessibilityLabel={`Remove ${line.name}`}
      >
        <Text style={styles.removeIcon}>×</Text>
      </TouchableOpacity>
    </GlassCard>
  )
}

export default function CartScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const lines = useCartStore((s) => s.lines)
  const setQuantity = useCartStore((s) => s.setQuantity)
  const remove = useCartStore((s) => s.remove)
  const clear = useCartStore((s) => s.clear)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subtotal = cartSubtotal(lines)
  const vat = subtotal * VAT_RATE
  const total = subtotal + vat
  const canSubmit = lines.length > 0 && name.trim().length > 0 && email.trim().length > 0

  async function placeOrder() {
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/public/shop/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          customer: {
            name: name.trim(),
            email: email.trim(),
            ...(phone.trim() ? { phone: phone.trim() } : {}),
            ...(address.trim() ? { address: address.trim() } : {}),
          },
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        orderNumber?: string
        error?: string
      }
      if (!res.ok) throw new Error(data.error ?? "Could not place the order.")

      await clear()
      Alert.alert(
        "Order placed",
        `Your order ${data.orderNumber ?? ""} has been received. We will contact you to confirm details and payment.`.trim(),
        [{ text: "OK", onPress: () => router.replace("/(public)/shop") }]
      )
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not place the order.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backIcon}>{"‹"}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Cart</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.base, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {lines.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySub}>Browse the catalogue and add what you need.</Text>
            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.8}
              onPress={() => router.replace("/(public)/shop")}
            >
              <Text style={styles.secondaryBtnText}>Go to shop</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : (
          <>
            {lines.map((l) => (
              <Line
                key={l.productId}
                line={l}
                onDec={() => void setQuantity(l.productId, l.quantity - 1)}
                onInc={() => void setQuantity(l.productId, l.quantity + 1)}
                onRemove={() => void remove(l.productId)}
              />
            ))}

            <GlassCard style={styles.totals}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{money(subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>VAT (19%)</Text>
                <Text style={styles.totalValue}>{money(vat)}</Text>
              </View>
              <View style={[styles.totalRow, styles.totalRowLast]}>
                <Text style={styles.grandLabel}>Total</Text>
                <Text style={styles.grandValue}>{money(total)}</Text>
              </View>
            </GlassCard>

            <Text style={styles.sectionLabel}>Your details</Text>
            <GlassCard style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor={colors.text4}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.text4}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                placeholder="Phone (optional)"
                placeholderTextColor={colors.text4}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <TextInput
                style={[styles.input, styles.inputLast]}
                placeholder="Delivery address (optional)"
                placeholderTextColor={colors.text4}
                value={address}
                onChangeText={setAddress}
              />
            </GlassCard>

            {error && <Text style={styles.error}>{error}</Text>}

            <Text style={styles.disclaimer}>
              No payment is taken in the app. We confirm availability and pricing, then arrange
              payment and delivery with you directly.
            </Text>

            <TouchableOpacity
              style={[styles.primaryBtn, (!canSubmit || submitting) && styles.primaryBtnDisabled]}
              activeOpacity={0.85}
              disabled={!canSubmit || submitting}
              onPress={() => void placeOrder()}
            >
              {submitting ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryBtnText}>Place order</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.glass1,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 18, color: colors.text1 },
  title: { ...type.headline, color: colors.text1 },
  emptyCard: { padding: spacing.xl, alignItems: "center" },
  emptyTitle: { ...type.headline, color: colors.text1, marginBottom: spacing.xs },
  emptySub: { ...type.footnote, color: colors.text3, textAlign: "center" },
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  lineName: { ...type.subhead, color: colors.text1 },
  linePrice: { ...type.caption1, color: colors.text3, marginTop: 2 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.glass2,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: { fontSize: 16, color: colors.text1 },
  qtyValue: { ...type.subhead, color: colors.text1, minWidth: 18, textAlign: "center" },
  removeIcon: { fontSize: 20, color: colors.text3, paddingHorizontal: 4 },
  totals: { padding: spacing.base, marginTop: spacing.sm, marginBottom: spacing.lg },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  totalRowLast: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    marginTop: 6,
    paddingTop: 10,
  },
  totalLabel: { ...type.subhead, color: colors.text3 },
  totalValue: { ...type.subhead, color: colors.text2 },
  grandLabel: { ...type.headline, color: colors.text1 },
  grandValue: { ...type.headline, color: colors.text1 },
  sectionLabel: {
    ...type.caption1,
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  form: { padding: spacing.sm },
  input: {
    ...type.subhead,
    color: colors.text1,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  inputLast: { borderBottomWidth: 0 },
  error: { ...type.footnote, color: colors.red, marginTop: spacing.md },
  disclaimer: { ...type.caption1, color: colors.text3, marginTop: spacing.base, lineHeight: 17 },
  primaryBtn: {
    backgroundColor: "#ffffff",
    borderRadius: radius.base,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  primaryBtnDisabled: { opacity: 0.3 },
  primaryBtnText: { ...type.headline, color: "#000000" },
  secondaryBtn: {
    marginTop: spacing.base,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: { ...type.footnote, color: colors.text1, fontWeight: "600" },
})
