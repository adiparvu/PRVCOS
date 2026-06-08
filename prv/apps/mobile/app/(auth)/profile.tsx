import { useState } from "react"
import {
  Alert,
  Linking,
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
import Svg, { Circle, Path, Rect } from "react-native-svg"
import { useAuthStore } from "@/store/auth"
import { useProfile, getInitials, formatRole, formatMemberSince } from "@/hooks/useProfile"
import { colors, radius } from "@/tokens"

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

function ChevronRight() {
  return (
    <Svg width={7} height={12} viewBox="0 0 7 12" fill="none">
      <Path
        d="M1 1L6 6L1 11"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// SF Symbol: pencil
function PencilIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <Path
        d="M9.5 2L12 4.5L4.5 12H2V9.5L9.5 2Z"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <Path
        d="M8 3.5L10.5 6"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  )
}

// SF Symbol: person.fill
function PersonIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Circle cx={8} cy={6} r={3} stroke="rgba(255,255,255,0.65)" strokeWidth={1.4} />
      <Path
        d="M2 14C2 11.24 4.69 9 8 9C11.31 9 14 11.24 14 14"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  )
}

// SF Symbol: bell.fill
function BellIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M8 2C5.24 2 3 4.24 3 7V11H13V7C13 4.24 10.76 2 8 2Z"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth={1.4}
      />
      <Path d="M3 11H13" stroke="rgba(255,255,255,0.65)" strokeWidth={1.4} strokeLinecap="round" />
      <Path
        d="M6.5 13C6.5 13.83 7.17 14.5 8 14.5C8.83 14.5 9.5 13.83 9.5 13"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  )
}

// SF Symbol: globe
function GlobeIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Circle cx={8} cy={8} r={6} stroke="rgba(255,255,255,0.65)" strokeWidth={1.4} />
      <Path d="M8 2C8 2 6 5 6 8C6 11 8 14 8 14" stroke="rgba(255,255,255,0.65)" strokeWidth={1.2} />
      <Path
        d="M8 2C8 2 10 5 10 8C10 11 8 14 8 14"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth={1.2}
      />
      <Path d="M2 8H14" stroke="rgba(255,255,255,0.65)" strokeWidth={1.2} />
    </Svg>
  )
}

// SF Symbol: shield.fill (amber)
function ShieldIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M8 1L2 4V8C2 11.3 4.8 14.4 8 15C11.2 14.4 14 11.3 14 8V4L8 1Z"
        fill="rgba(251,191,36,0.12)"
        stroke="rgba(251,191,36,0.8)"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <Path
        d="M5.5 8L7.5 10L10.5 6"
        stroke="rgba(251,191,36,0.9)"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// SF Symbol: lock.fill
function LockIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M5 7V5C5 3.34 6.34 2 8 2C9.66 2 11 3.34 11 5V7"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <Rect
        x={2}
        y={7}
        width={12}
        height={8}
        rx={2.5}
        fill="rgba(255,255,255,0.06)"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth={1.4}
      />
      <Circle cx={8} cy={11} r={1.5} fill="rgba(255,255,255,0.5)" />
    </Svg>
  )
}

// SF Symbol: faceid
function FaceIDIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M1 5V3C1 1.9 1.9 1 3 1H5"
        stroke="rgba(52,211,153,0.85)"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <Path
        d="M11 1H13C14.1 1 15 1.9 15 3V5"
        stroke="rgba(52,211,153,0.85)"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <Path
        d="M15 11V13C15 14.1 14.1 15 13 15H11"
        stroke="rgba(52,211,153,0.85)"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <Path
        d="M5 15H3C1.9 15 1 14.1 1 13V11"
        stroke="rgba(52,211,153,0.85)"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <Path
        d="M5 7H5.5M10.5 7H11M5.5 10.5C6 11.33 7 12 8 12C9 12 10 11.33 10.5 10.5"
        stroke="rgba(52,211,153,0.85)"
        strokeWidth={1.3}
        strokeLinecap="round"
      />
      <Path d="M8 7V9.5" stroke="rgba(52,211,153,0.85)" strokeWidth={1.3} strokeLinecap="round" />
    </Svg>
  )
}

// SF Symbol: doc.text
function DocIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Rect
        x={1}
        y={1}
        width={14}
        height={14}
        rx={3.5}
        fill="rgba(255,255,255,0.06)"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={1.3}
      />
      <Path
        d="M4 5.5H12M4 8H12M4 10.5H8"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </Svg>
  )
}

// SF Symbol: info.circle
function InfoIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Circle cx={8} cy={8} r={6.5} stroke="rgba(255,255,255,0.5)" strokeWidth={1.3} />
      <Path d="M8 7.5V11" stroke="rgba(255,255,255,0.5)" strokeWidth={1.4} strokeLinecap="round" />
      <Circle cx={8} cy={5.5} r={0.9} fill="rgba(255,255,255,0.5)" />
    </Svg>
  )
}

// SF Symbol: rectangle.portrait.and.arrow.right (sign out)
function SignOutIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path
        d="M6 9H15M15 9L12 6M15 9L12 12"
        stroke="rgba(255,59,48,0.9)"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10 4H4C2.9 4 2 4.9 2 6V12C2 13.1 2.9 14 4 14H10"
        stroke="rgba(255,59,48,0.7)"
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </Svg>
  )
}

// ── Settings row ──────────────────────────────────────────────────────────────

interface RowProps {
  icon: React.ReactNode
  iconVariant?: "white" | "amber" | "green" | "red"
  title: string
  subtitle?: string
  badge?: string
  badgeVariant?: "red" | "amber"
  chevron?: boolean
  rightElement?: React.ReactNode
  onPress?: () => void
  last?: boolean
}

function SettingsRow({
  icon,
  iconVariant = "white",
  title,
  subtitle,
  badge,
  badgeVariant = "red",
  chevron = true,
  rightElement,
  onPress,
  last,
}: RowProps) {
  const iconBg = {
    white: { bg: "rgba(255,255,255,0.10)", border: "rgba(255,255,255,0.12)" },
    amber: { bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.20)" },
    green: { bg: "rgba(52,211,153,0.10)", border: "rgba(52,211,153,0.18)" },
    red: { bg: "rgba(255,69,58,0.10)", border: "rgba(255,69,58,0.18)" },
  }[iconVariant]

  return (
    <TouchableOpacity
      style={[s.row, !last && s.rowBorder]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[s.rowIconWrap, { backgroundColor: iconBg.bg, borderColor: iconBg.border }]}>
        {icon}
      </View>
      <View style={s.rowBody}>
        <Text style={s.rowTitle}>{title}</Text>
        {subtitle ? <Text style={s.rowSub}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={[s.badge, badgeVariant === "amber" ? s.badgeAmber : s.badgeRed]}>
          <Text style={[s.badgeText, badgeVariant === "amber" ? s.badgeTextAmber : s.badgeTextRed]}>
            {badge}
          </Text>
        </View>
      ) : null}
      {rightElement ?? (chevron ? <ChevronRight /> : null)}
    </TouchableOpacity>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const logout = useAuthStore((s) => s.logout)
  const { data, isLoading } = useProfile()

  const initials = data ? getInitials(data.firstName, data.lastName) : "…"
  const fullName = data ? `${data.firstName} ${data.lastName}` : ""
  const role = data ? formatRole(data.role) : ""
  const memberSince = data ? formatMemberSince(data.memberSince) : ""

  function handleSignOut() {
    Alert.alert("Sign Out", "You will be signed out of this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout()
          router.replace("/(auth)/login")
        },
      },
    ])
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Back */}
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
        <ChevronLeft />
        <Text style={s.backLabel}>Command</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar card */}
        <BlurView intensity={24} tint="dark" style={s.avatarCard}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarInitials}>{initials}</Text>
          </View>
          <View style={s.avatarInfo}>
            {isLoading ? (
              <>
                <View style={[s.shimmer, { width: 140, height: 18, marginBottom: 8 }]} />
                <View style={[s.shimmer, { width: 180, height: 13 }]} />
              </>
            ) : (
              <>
                <Text style={s.avatarName}>{fullName}</Text>
                <Text style={s.avatarEmail}>{data?.email}</Text>
                <View style={s.roleBadge}>
                  <Text style={s.roleBadgeText}>{role}</Text>
                </View>
              </>
            )}
          </View>
          <TouchableOpacity style={s.editBtn} activeOpacity={0.7}>
            <PencilIcon />
          </TouchableOpacity>
        </BlurView>

        {/* Company strip */}
        {data && (
          <View style={s.companyStrip}>
            <View style={s.companyDot} />
            <Text style={s.companyName}>{data.company.name}</Text>
            <Text style={s.companySince}>Since {memberSince}</Text>
          </View>
        )}

        {/* Account section */}
        <Text style={s.sectionTitle}>Account</Text>
        <BlurView intensity={16} tint="dark" style={s.card}>
          <SettingsRow
            icon={<PersonIcon />}
            title="Edit Profile"
            subtitle="Name, phone, avatar"
            onPress={() => {
              /* future screen */
            }}
          />
          <SettingsRow
            icon={<BellIcon />}
            title="Notifications"
            subtitle="Alerts, reports, mentions"
            onPress={() => {
              /* future screen */
            }}
          />
          <SettingsRow
            icon={<GlobeIcon />}
            title="Language"
            subtitle={data?.locale ?? "Loading…"}
            onPress={() => {
              /* future screen */
            }}
            last
          />
        </BlurView>

        {/* Security section */}
        <Text style={s.sectionTitle}>Security</Text>
        <BlurView intensity={16} tint="dark" style={s.card}>
          <SettingsRow
            icon={<ShieldIcon />}
            iconVariant="amber"
            title="Security Settings"
            subtitle={data ? `MFA ${data.mfaEnabled ? "enabled" : "disabled"}` : "Loading…"}
            onPress={() => router.push("/(auth)/security-settings")}
          />
          <SettingsRow
            icon={<LockIcon />}
            title="Change Password"
            subtitle="Update your account password"
            onPress={() => router.push("/(auth)/password-reset")}
          />
          <SettingsRow
            icon={<FaceIDIcon />}
            iconVariant="green"
            title="Face ID"
            subtitle="Unlock & re-authenticate"
            chevron={false}
            rightElement={
              <Switch
                value={true}
                onValueChange={() => {}}
                trackColor={{ false: "rgba(255,255,255,0.12)", true: "rgba(52,211,153,0.45)" }}
                thumbColor={colors.green}
                ios_backgroundColor="rgba(255,255,255,0.12)"
              />
            }
            last
          />
        </BlurView>

        {/* About section */}
        <Text style={s.sectionTitle}>About</Text>
        <BlurView intensity={16} tint="dark" style={s.card}>
          <SettingsRow
            icon={<DocIcon />}
            title="Privacy Policy"
            onPress={() => Linking.openURL("https://prvrenovations.ro/privacy")}
          />
          <SettingsRow
            icon={<DocIcon />}
            title="Terms of Service"
            onPress={() => Linking.openURL("https://prvrenovations.ro/terms")}
          />
          <SettingsRow
            icon={<InfoIcon />}
            title="App Version"
            subtitle="1.0.0 (build 42)"
            chevron={false}
            last
          />
        </BlurView>

        {/* Sign out */}
        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <SignOutIcon />
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={s.versionFooter}>PRV · v1.0.0 · © 2026</Text>
      </ScrollView>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
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
  scroll: { paddingHorizontal: 20, paddingTop: 16 },

  // Avatar card
  avatarCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: radius.panel,
    padding: 18,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    letterSpacing: -0.4,
  },
  avatarInfo: { flex: 1 },
  avatarName: {
    fontSize: 18,
    fontWeight: "600",
    color: "rgba(255,255,255,0.92)",
    letterSpacing: -0.4,
    marginBottom: 3,
  },
  avatarEmail: { fontSize: 13, color: "rgba(255,255,255,0.4)", letterSpacing: -0.1 },
  roleBadge: {
    alignSelf: "flex-start",
    marginTop: 7,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.04,
    textTransform: "uppercase",
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },

  // Company strip
  companyStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 24,
  },
  companyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(52,211,153,0.7)" },
  companyName: { flex: 1, fontSize: 14, fontWeight: "500", color: "rgba(255,255,255,0.65)" },
  companySince: { fontSize: 12, color: "rgba(255,255,255,0.3)" },

  // Section
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

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  rowBody: { flex: 1 },
  rowTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255,255,255,0.88)",
    letterSpacing: -0.2,
  },
  rowSub: { fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 },
  badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1 },
  badgeRed: { backgroundColor: "rgba(255,59,48,0.12)", borderColor: "rgba(255,59,48,0.22)" },
  badgeAmber: { backgroundColor: "rgba(251,191,36,0.12)", borderColor: "rgba(251,191,36,0.22)" },
  badgeText: { fontSize: 11, fontWeight: "600" },
  badgeTextRed: { color: "rgba(255,59,48,0.9)" },
  badgeTextAmber: { color: "rgba(251,191,36,0.9)" },

  // Sign out
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,59,48,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,59,48,0.18)",
    borderRadius: radius.base,
    paddingVertical: 17,
    marginBottom: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255,59,48,0.9)",
    letterSpacing: -0.2,
  },
  versionFooter: {
    fontSize: 12,
    color: "rgba(255,255,255,0.18)",
    textAlign: "center",
    marginTop: 4,
  },

  // Loading shimmer
  shimmer: { borderRadius: 6, backgroundColor: "rgba(255,255,255,0.08)" },
})
