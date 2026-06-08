import { useState, useEffect } from "react"
import {
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
import { BlurView } from "expo-blur"
import Svg, { Path } from "react-native-svg"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useProfile } from "@/hooks/useProfile"
import { api } from "@/lib/api"
import { colors, radius, type as t } from "@/tokens"

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

const LOCALES = [
  { value: "en", label: "English" },
  { value: "ro", label: "Română" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
]

const TIMEZONES = [
  { value: "Europe/Bucharest", label: "Europe/Bucharest (EET)" },
  { value: "Europe/London", label: "Europe/London (GMT)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET)" },
  { value: "UTC", label: "UTC" },
]

interface FieldProps {
  label: string
  value: string
  placeholder?: string
  onChangeText: (v: string) => void
  autoFocus?: boolean
  keyboardType?: "default" | "phone-pad" | "email-address"
  last?: boolean
}

function Field({
  label,
  value,
  placeholder,
  onChangeText,
  autoFocus,
  keyboardType,
  last,
}: FieldProps) {
  const [focused, setFocused] = useState(false)
  return (
    <View style={[f.fieldWrap, !last && f.fieldBorder]}>
      <Text style={f.fieldLabel}>{label}</Text>
      <TextInput
        style={f.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? ""}
        placeholderTextColor="rgba(255,255,255,0.22)"
        autoFocus={autoFocus}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize="words"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        selectionColor={colors.green}
      />
      {focused && <View style={f.focusLine} />}
    </View>
  )
}

interface PickerFieldProps {
  label: string
  options: { value: string; label: string }[]
  selected: string
  onSelect: (v: string) => void
  last?: boolean
}

function PickerField({ label, options, selected, onSelect, last }: PickerFieldProps) {
  const selectedLabel = options.find((o) => o.value === selected)?.label ?? selected
  function open() {
    Alert.alert(label, undefined, [
      ...options.map((o) => ({
        text: o.label,
        onPress: () => onSelect(o.value),
        style: o.value === selected ? ("destructive" as const) : ("default" as const),
      })),
      { text: "Cancel", style: "cancel" as const },
    ])
  }
  return (
    <TouchableOpacity
      style={[f.fieldWrap, !last && f.fieldBorder]}
      onPress={open}
      activeOpacity={0.7}
    >
      <Text style={f.fieldLabel}>{label}</Text>
      <View style={f.pickerRow}>
        <Text style={f.pickerValue}>{selectedLabel}</Text>
        <Svg width={7} height={12} viewBox="0 0 7 12" fill="none">
          <Path
            d="M1 1L6 6L1 11"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </TouchableOpacity>
  )
}

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data } = useProfile()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [locale, setLocale] = useState("en")
  const [timezone, setTimezone] = useState("Europe/Bucharest")

  useEffect(() => {
    if (data) {
      setFirstName(data.firstName)
      setLastName(data.lastName)
      setPhone(data.phone ?? "")
      setJobTitle(data.jobTitle ?? "")
      setLocale(data.locale)
      setTimezone(data.timezone)
    }
  }, [data])

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.patch<{ success: boolean }>("/api/mobile/profile/patch", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
        jobTitle: jobTitle.trim() || null,
        locale,
        timezone,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] })
      router.back()
    },
    onError: (err) => {
      Alert.alert("Error", err.message ?? "Failed to save profile")
    },
  })

  const isDirty = data
    ? firstName !== data.firstName ||
      lastName !== data.lastName ||
      (phone || null) !== data.phone ||
      (jobTitle || null) !== data.jobTitle ||
      locale !== data.locale ||
      timezone !== data.timezone
    : false

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft />
          <Text style={s.backLabel}>Profile</Text>
        </TouchableOpacity>
        <Text style={s.title}>Edit Profile</Text>
        <TouchableOpacity
          style={[s.saveBtn, (!isDirty || isPending) && s.saveBtnDisabled]}
          onPress={() => mutate()}
          disabled={!isDirty || isPending}
          activeOpacity={0.7}
        >
          <Text style={[s.saveLabel, (!isDirty || isPending) && s.saveLabelDisabled]}>
            {isPending ? "Saving…" : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Name */}
        <Text style={s.sectionTitle}>Personal Info</Text>
        <BlurView intensity={16} tint="dark" style={s.card}>
          <View style={f.fieldRow}>
            <View style={{ flex: 1 }}>
              <Field label="First name" value={firstName} onChangeText={setFirstName} autoFocus />
            </View>
            <View style={[{ flex: 1 }, f.fieldRowRight]}>
              <Field label="Last name" value={lastName} onChangeText={setLastName} />
            </View>
          </View>
          <Field
            label="Phone number"
            value={phone}
            placeholder="+40 700 000 000"
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Field
            label="Job title"
            value={jobTitle}
            placeholder="e.g. Company Owner"
            onChangeText={setJobTitle}
            last
          />
        </BlurView>

        {/* Preferences */}
        <Text style={s.sectionTitle}>Preferences</Text>
        <BlurView intensity={16} tint="dark" style={s.card}>
          <PickerField label="Language" options={LOCALES} selected={locale} onSelect={setLocale} />
          <PickerField
            label="Timezone"
            options={TIMEZONES}
            selected={timezone}
            onSelect={setTimezone}
            last
          />
        </BlurView>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ── Field styles ──────────────────────────────────────────────────────────────

const f = StyleSheet.create({
  fieldWrap: { paddingHorizontal: 14, paddingVertical: 11 },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 0.04,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  input: {
    ...t.body,
    color: "rgba(255,255,255,0.88)",
    padding: 0,
    margin: 0,
  },
  focusLine: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 0,
    height: 1,
    backgroundColor: "rgba(52,211,153,0.5)",
  },
  fieldRow: { flexDirection: "row" },
  fieldRowRight: { borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.06)" },
  pickerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickerValue: { ...t.body, color: "rgba(255,255,255,0.88)" },
})

// ── Screen styles ─────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 72 },
  backLabel: { ...t.body, color: "rgba(255,255,255,0.6)" },
  title: { flex: 1, ...t.headline, color: colors.text1, textAlign: "center" },
  saveBtn: { minWidth: 72, alignItems: "flex-end" },
  saveBtnDisabled: { opacity: 0.35 },
  saveLabel: { ...t.headline, color: colors.green },
  saveLabelDisabled: { color: "rgba(255,255,255,0.35)" },

  scroll: { paddingHorizontal: 20, paddingTop: 24 },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 0.08,
    textTransform: "uppercase",
    marginBottom: 8,
    paddingLeft: 4,
  },
  card: {
    borderRadius: radius.card,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
    marginBottom: 24,
  },
})
