import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { GlassCard } from "@/components/Glass"
import { useAuthStore } from "@/store/auth"
import { useClientOverview, getInitials } from "@/hooks/useClientPortal"
import { colors, type, radius } from "@/tokens"

const SETTINGS = [
  {
    title: "Account",
    items: [
      { icon: "◯", label: "Personal Details", value: null },
      { icon: "▪", label: "Contact Information", value: null },
      { icon: "◉", label: "Notification Preferences", value: null },
    ],
  },
  {
    title: "Security",
    items: [
      { icon: "⬛", label: "Change Password", value: null },
      { icon: "◈", label: "Two-Factor Authentication", value: "Off" },
    ],
  },
  {
    title: "Support",
    items: [
      { icon: "⌕", label: "Help Center", value: null },
      { icon: "◌", label: "Contact PRV", value: null },
      { icon: "⊞", label: "Privacy Policy", value: null },
    ],
  },
]

function SettingsSection({ section }: { section: (typeof SETTINGS)[number] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{section.title}</Text>
      <GlassCard style={styles.sectionCard}>
        <View style={styles.sectionShine} pointerEvents="none" />
        {section.items.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuRow, i < section.items.length - 1 && styles.menuRowBorder]}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View style={styles.menuIconWrap}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
            </View>
            <View style={styles.menuRight}>
              {item.value && <Text style={styles.menuValue}>{item.value}</Text>}
              <Text style={styles.menuChevron}>›</Text>
            </View>
          </TouchableOpacity>
        ))}
      </GlassCard>
    </View>
  )
}

export default function ClientAccountScreen() {
  const insets = useSafeAreaInsets()
  const { logout } = useAuthStore()
  const { data, isLoading } = useClientOverview()

  const firstName = data?.client.firstName ?? ""
  const lastName = data?.client.lastName ?? ""
  const email = data?.client.email ?? ""
  const initials = firstName ? getInitials(firstName, lastName) : "—"

  return (
    <View style={styles.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 104 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Account</Text>

        {/* Profile card */}
        <GlassCard style={styles.profileCard}>
          <View style={styles.profileShine} pointerEvents="none" />
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            {isLoading ? (
              <>
                <View style={styles.skeletonName} />
                <View style={styles.skeletonEmail} />
              </>
            ) : (
              <>
                <Text style={styles.profileName}>
                  {firstName} {lastName}
                </Text>
                <Text style={styles.profileEmail}>{email}</Text>
              </>
            )}
          </View>
          <View style={styles.clientBadge}>
            <Text style={styles.clientBadgeText}>Client</Text>
          </View>
        </GlassCard>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            {
              value: isLoading ? "—" : String(data?.kpis.activeProjects ?? 0),
              label: "Projects",
            },
            {
              value: isLoading ? "—" : String(data?.kpis.pendingInvoices ?? 0),
              label: "Invoices",
            },
            {
              value: isLoading ? "—" : (data?.kpis.totalSpent ?? "€0"),
              label: "Total Spent",
            },
          ].map((s) => (
            <GlassCard key={s.label} style={styles.statCard}>
              <View style={styles.statShine} pointerEvents="none" />
              <Text style={styles.statValue} numberOfLines={1}>
                {s.value}
              </Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </GlassCard>
          ))}
        </View>

        {/* Settings sections */}
        {SETTINGS.map((section) => (
          <SettingsSection key={section.title} section={section} />
        ))}

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} activeOpacity={0.8} onPress={logout}>
          <View style={styles.signOutShine} pointerEvents="none" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>PRV Client Portal · v1.0.0</Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 16 },

  pageTitle: {
    ...type.title1,
    color: colors.text1,
    marginBottom: 16,
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    marginBottom: 12,
    position: "relative",
    overflow: "hidden",
  },
  profileShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text1,
  },
  profileName: { ...type.headline, color: colors.text1, marginBottom: 2 },
  profileEmail: { ...type.footnote, color: colors.text3 },
  clientBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clientBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.text2,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  skeletonName: {
    width: 120,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.glass2,
    marginBottom: 7,
  },
  skeletonEmail: {
    width: 160,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.glass1,
  },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    position: "relative",
    overflow: "hidden",
  },
  statShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  statValue: { ...type.title3, color: colors.text1, marginBottom: 3 },
  statLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  section: { marginBottom: 16 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sectionCard: { overflow: "hidden", position: "relative" },
  sectionShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
    zIndex: 1,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuIconWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIcon: { fontSize: 13, color: colors.text2 },
  menuLabel: { ...type.callout, color: colors.text1 },
  menuRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  menuValue: { fontSize: 11, fontWeight: "600", color: colors.text3 },
  menuChevron: { fontSize: 20, color: colors.text4, lineHeight: 22 },

  signOutBtn: {
    marginTop: 4,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: radius.card,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  signOutShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  signOutText: {
    ...type.callout,
    color: colors.red,
    fontWeight: "600",
  },

  version: {
    ...type.caption2,
    color: colors.text4,
    textAlign: "center",
    marginBottom: 4,
  },
})
