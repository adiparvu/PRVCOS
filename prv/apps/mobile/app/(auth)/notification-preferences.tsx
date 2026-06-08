import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { BlurView } from "expo-blur"
import Svg, { Path, Circle } from "react-native-svg"
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/useNotificationPreferences"
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

function BellIcon({ tint }: { tint: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M8 2C5.24 2 3 4.24 3 7V11H13V7C13 4.24 10.76 2 8 2Z"
        stroke={tint}
        strokeWidth={1.4}
      />
      <Path d="M3 11H13" stroke={tint} strokeWidth={1.4} strokeLinecap="round" />
      <Path
        d="M6.5 13C6.5 13.83 7.17 14.5 8 14.5C8.83 14.5 9.5 13.83 9.5 13"
        stroke={tint}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  )
}

function MailIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M2 4C2 3.45 2.45 3 3 3H13C13.55 3 14 3.45 14 4V12C14 12.55 13.55 13 13 13H3C2.45 13 2 12.55 2 12V4Z"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth={1.4}
      />
      <Path
        d="M2 4L8 8.5L14 4"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  )
}

function PhoneIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M4 2H7L8.5 5.5L6.5 6.5C7.4 8.4 7.6 8.6 9.5 9.5L10.5 7.5L14 9V12C14 13.1 13.1 14 12 14C6.48 14 2 9.52 2 4C2 2.9 2.9 2 4 2Z"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function MonitorIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M1 3.5C1 2.67 1.67 2 2.5 2H13.5C14.33 2 15 2.67 15 3.5V9.5C15 10.33 14.33 11 13.5 11H2.5C1.67 11 1 10.33 1 9.5V3.5Z"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth={1.4}
      />
      <Path
        d="M5.5 14H10.5"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <Path d="M8 11V14" stroke="rgba(255,255,255,0.65)" strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  )
}

interface ToggleRowProps {
  icon: React.ReactNode
  iconBg: string
  iconBorder: string
  title: string
  subtitle: string
  value: boolean
  onToggle: (v: boolean) => void
  last?: boolean
}

function ToggleRow({
  icon,
  iconBg,
  iconBorder,
  title,
  subtitle,
  value,
  onToggle,
  last,
}: ToggleRowProps) {
  return (
    <View style={[r.row, !last && r.rowBorder]}>
      <View style={[r.iconWrap, { backgroundColor: iconBg, borderColor: iconBorder }]}>{icon}</View>
      <View style={r.body}>
        <Text style={r.title}>{title}</Text>
        <Text style={r.sub}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "rgba(255,255,255,0.12)", true: "rgba(52,211,153,0.45)" }}
        thumbColor={value ? colors.green : "rgba(255,255,255,0.5)"}
        ios_backgroundColor="rgba(255,255,255,0.12)"
      />
    </View>
  )
}

export default function NotificationPreferencesScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { data, isLoading } = useNotificationPreferences()
  const { mutate } = useUpdateNotificationPreferences()

  function toggle(key: "inApp" | "push" | "email" | "sms", value: boolean) {
    mutate({ [key]: value })
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft />
          <Text style={s.backLabel}>Profile</Text>
        </TouchableOpacity>
        <Text style={s.title}>Notifications</Text>
        <View style={{ minWidth: 72 }} />
      </View>

      {isLoading ? (
        <View style={s.loader}>
          <ActivityIndicator color="rgba(255,255,255,0.4)" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.sectionTitle}>Channels</Text>
          <BlurView intensity={16} tint="dark" style={s.card}>
            <ToggleRow
              icon={<MonitorIcon />}
              iconBg="rgba(255,255,255,0.10)"
              iconBorder="rgba(255,255,255,0.12)"
              title="In-App"
              subtitle="Banners and notification centre"
              value={data?.inApp ?? true}
              onToggle={(v) => toggle("inApp", v)}
            />
            <ToggleRow
              icon={<BellIcon tint="rgba(52,211,153,0.85)" />}
              iconBg="rgba(52,211,153,0.10)"
              iconBorder="rgba(52,211,153,0.18)"
              title="Push Notifications"
              subtitle="Alerts sent to this device"
              value={data?.push ?? true}
              onToggle={(v) => toggle("push", v)}
            />
            <ToggleRow
              icon={<MailIcon />}
              iconBg="rgba(10,132,255,0.10)"
              iconBorder="rgba(10,132,255,0.18)"
              title="Email"
              subtitle="Digests and important alerts"
              value={data?.email ?? true}
              onToggle={(v) => toggle("email", v)}
            />
            <ToggleRow
              icon={<PhoneIcon />}
              iconBg="rgba(255,159,10,0.10)"
              iconBorder="rgba(255,159,10,0.18)"
              title="SMS"
              subtitle="Critical alerts only"
              value={data?.sms ?? false}
              onToggle={(v) => toggle("sms", v)}
              last
            />
          </BlurView>

          <Text style={s.hint}>
            Push and In-App notifications require device permission. Manage in iOS Settings if
            notifications aren't arriving.
          </Text>
        </ScrollView>
      )}
    </View>
  )
}

// ── Row styles ────────────────────────────────────────────────────────────────

const r = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  body: { flex: 1 },
  title: { ...t.subhead, color: "rgba(255,255,255,0.88)" },
  sub: { ...t.caption1, color: "rgba(255,255,255,0.35)", marginTop: 2 },
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

  loader: { flex: 1, alignItems: "center", justifyContent: "center" },

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
    marginBottom: 16,
  },
  hint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.25)",
    lineHeight: 17,
    paddingHorizontal: 4,
  },
})
