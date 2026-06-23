import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { GlassCard } from "@/components/Glass"
import { colors, type, radius, spacing } from "@/tokens"

const MENU_SECTIONS = [
  {
    title: "My Orders",
    items: [
      { icon: "◎", label: "Active Orders", value: "2 in progress" },
      { icon: "⊡", label: "Order History", value: null },
      { icon: "↩", label: "Returns & Refunds", value: null },
    ],
  },
  {
    title: "My Projects",
    items: [
      { icon: "⟁", label: "Renovation Quotes", value: "1 pending" },
      { icon: "◈", label: "Active Projects", value: "1 active" },
      { icon: "◻", label: "Completed Projects", value: null },
    ],
  },
  {
    title: "Settings",
    items: [
      { icon: "◯", label: "Profile & Details", value: null },
      { icon: "▪", label: "Addresses", value: null },
      { icon: "⊞", label: "Payment Methods", value: null },
      { icon: "◉", label: "Notifications", value: null },
    ],
  },
  {
    title: "Support",
    items: [
      { icon: "⌕", label: "Help Center", value: null },
      { icon: "◌", label: "Contact Us", value: null },
      { icon: "⬛", label: "Privacy Policy", value: null },
    ],
  },
]

function MenuSection({ section }: { section: (typeof MENU_SECTIONS)[number] }) {
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
            <View style={styles.menuRowLeft}>
              <View style={styles.menuIcon}>
                <Text style={styles.menuIconText}>{item.icon}</Text>
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
            </View>
            <View style={styles.menuRowRight}>
              {item.value && <Text style={styles.menuValue}>{item.value}</Text>}
              <Text style={styles.menuChevron}>›</Text>
            </View>
          </TouchableOpacity>
        ))}
      </GlassCard>
    </View>
  )
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const isGuest = true // public app — not authenticated

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
        {/* Header */}
        <Text style={styles.pageTitle}>Account</Text>

        {isGuest ? (
          /* Guest CTA */
          <GlassCard style={styles.guestCard}>
            <View style={styles.guestShine} pointerEvents="none" />
            <View style={styles.guestAvatar}>
              <Text style={styles.guestAvatarIcon}>◯</Text>
            </View>
            <Text style={styles.guestTitle}>Welcome to PRV</Text>
            <Text style={styles.guestSub}>
              Sign in to track orders, manage renovation projects, and access your personal
              dashboard.
            </Text>
            <TouchableOpacity
              style={styles.signInBtn}
              activeOpacity={0.85}
              onPress={() => router.push("/(auth)/login")}
            >
              <Text style={styles.signInBtnText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.registerBtn}
              activeOpacity={0.75}
              onPress={() => router.push("/(auth)/login")}
            >
              <Text style={styles.registerBtnText}>Create Account →</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : (
          /* Authenticated profile card */
          <GlassCard style={styles.profileCard}>
            <View style={styles.profileShine} pointerEvents="none" />
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarInitials}>AM</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>Alexandra M.</Text>
              <Text style={styles.profileEmail}>a.m@example.com</Text>
            </View>
            <TouchableOpacity style={styles.editBtn} activeOpacity={0.8}>
              <Text style={styles.editBtnIcon}>✎</Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        {/* Stats row (always visible as teaser for guests) */}
        <View style={styles.statsRow}>
          {[
            { value: isGuest ? "—" : "2", label: "Orders" },
            { value: isGuest ? "—" : "1", label: "Projects" },
            { value: isGuest ? "—" : "3", label: "Saved" },
          ].map((s) => (
            <GlassCard key={s.label} style={styles.statCard}>
              <View style={styles.statShine} pointerEvents="none" />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </GlassCard>
          ))}
        </View>

        {/* Menu sections */}
        {MENU_SECTIONS.map((section) => (
          <MenuSection key={section.title} section={section} />
        ))}

        {/* App version */}
        <Text style={styles.version}>PRV · v1.0.0</Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 16,
    gap: 0,
  },

  pageTitle: {
    ...type.title1,
    color: colors.text1,
    marginBottom: 16,
  },

  /* Guest card */
  guestCard: {
    alignItems: "center",
    padding: 28,
    gap: 10,
    marginBottom: 16,
    position: "relative",
    overflow: "hidden",
  },
  guestShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  guestAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  guestAvatarIcon: {
    fontSize: 28,
    color: colors.text3,
  },
  guestTitle: {
    ...type.title3,
    color: colors.text1,
    textAlign: "center",
  },
  guestSub: {
    ...type.footnote,
    color: colors.text3,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 240,
  },
  signInBtn: {
    marginTop: 6,
    width: "100%",
    paddingVertical: 13,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
  },
  signInBtnText: {
    ...type.headline,
    color: colors.bg,
    fontWeight: "700",
  },
  registerBtn: {
    paddingVertical: 8,
  },
  registerBtnText: {
    ...type.footnote,
    color: colors.text3,
    fontWeight: "500",
  },

  /* Authenticated profile card */
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    marginBottom: 16,
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
  profileAvatar: {
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
  profileAvatarInitials: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text1,
  },
  profileName: {
    ...type.headline,
    color: colors.text1,
    marginBottom: 2,
  },
  profileEmail: {
    ...type.footnote,
    color: colors.text3,
  },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  editBtnIcon: {
    fontSize: 15,
    color: colors.text2,
  },

  /* Stats */
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
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
  statValue: {
    ...type.title2,
    color: colors.text1,
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* Menu */
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sectionCard: {
    overflow: "hidden",
    position: "relative",
  },
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
  menuRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIconText: {
    fontSize: 13,
    color: colors.text2,
  },
  menuLabel: {
    ...type.callout,
    color: colors.text1,
  },
  menuRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuValue: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text3,
    letterSpacing: 0.2,
  },
  menuChevron: {
    fontSize: 20,
    color: colors.text4,
    lineHeight: 22,
  },

  version: {
    ...type.caption2,
    color: colors.text4,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 4,
  },
})
