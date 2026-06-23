import { ScrollView, StyleSheet, Text, TouchableOpacity, View, RefreshControl } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { BlurView } from "expo-blur"
import { GlassCard } from "@/components/Glass"
import { colors, spacing, type, radius } from "@/tokens"

const SERVICES = [
  { icon: "⬛", label: "Interior\nRenovations" },
  { icon: "◻", label: "Bathrooms" },
  { icon: "▪", label: "Kitchens" },
  { icon: "◈", label: "Flooring" },
  { icon: "◉", label: "Painting" },
  { icon: "⚡", label: "Electrical" },
  { icon: "◌", label: "Plumbing" },
  { icon: "⊞", label: "Commercial\nSpaces" },
]

const STATS = [
  { value: "1,200+", label: "Projects Done" },
  { value: "98%", label: "Satisfaction" },
  { value: "12yr", label: "Experience" },
]

const REVIEWS = [
  {
    id: "r1",
    name: "Alexandra M.",
    initials: "AM",
    rating: 5,
    text: "Exceptional quality. The team transformed our bathroom beyond expectations. Clean, professional, on time.",
    project: "Bathroom Renovation",
  },
  {
    id: "r2",
    name: "Daniel P.",
    initials: "DP",
    rating: 5,
    text: "Our kitchen remodel was completed in 3 weeks. Outstanding attention to detail and communication throughout.",
    project: "Kitchen Remodel",
  },
  {
    id: "r3",
    name: "Maria C.",
    initials: "MC",
    rating: 5,
    text: "Incredible flooring work. They matched our existing parquet perfectly. Will use PRV again.",
    project: "Flooring",
  },
]

function Stars({ count }: { count: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Text key={i} style={{ fontSize: 10, color: colors.amber }}>
          ★
        </Text>
      ))}
    </View>
  )
}

function ServiceCard({ icon, label }: { icon: string; label: string }) {
  return (
    <TouchableOpacity style={styles.serviceCard} activeOpacity={0.75}>
      <View style={styles.serviceShine} pointerEvents="none" />
      <Text style={styles.serviceIcon}>{icon}</Text>
      <Text style={styles.serviceLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

function ReviewCard({ review }: { review: (typeof REVIEWS)[number] }) {
  return (
    <GlassCard style={styles.reviewCard}>
      <View style={styles.reviewTop}>
        <View style={styles.reviewAvatar}>
          <Text style={styles.reviewInitials}>{review.initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewName}>{review.name}</Text>
          <Stars count={review.rating} />
        </View>
        <View style={styles.reviewProjectChip}>
          <Text style={styles.reviewProjectText}>{review.project}</Text>
        </View>
      </View>
      <Text style={styles.reviewText}>{review.text}</Text>
    </GlassCard>
  )
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <View style={styles.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 104 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => {}} tintColor={colors.text3} />
        }
      >
        {/* Nav bar */}
        <View style={styles.navBar}>
          <Text style={styles.navLogo}>PRV</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              style={styles.navBtn}
              activeOpacity={0.8}
              onPress={() => router.push("/(auth)/login")}
            >
              <Text style={styles.navBtnText}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <View style={styles.heroBadgeDot} />
            <Text style={styles.heroBadgeText}>Premium Renovations</Text>
          </View>
          <Text style={styles.heroTitle}>{"Transform\nYour Space"}</Text>
          <Text style={styles.heroSub}>
            Expert renovation services for homes and commercial spaces. Quality craftsmanship, on
            time, every time.
          </Text>
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.heroCTA} activeOpacity={0.85}>
              <View style={styles.heroCTAShine} pointerEvents="none" />
              <Text style={styles.heroCTAText}>Get a Free Quote</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroSecondary} activeOpacity={0.75}>
              <Text style={styles.heroSecondaryText}>View Projects →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats strip */}
        <View style={styles.statsRow}>
          {STATS.map((stat, i) => (
            <View
              key={stat.label}
              style={[styles.statItem, i < STATS.length - 1 && styles.statBorder]}
            >
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Services */}
        <Text style={styles.sectionLabel}>Our Services</Text>
        <View style={styles.servicesGrid}>
          {SERVICES.map((s) => (
            <ServiceCard key={s.label} icon={s.icon} label={s.label} />
          ))}
        </View>

        {/* Before / After */}
        <Text style={styles.sectionLabel}>Before & After</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.baScroll}>
          {[1, 2, 3].map((i) => (
            <GlassCard key={i} style={styles.baCard}>
              <View style={styles.baImages}>
                <View style={styles.baImageSlot}>
                  <Text style={styles.baImageLabel}>Before</Text>
                </View>
                <View style={styles.baDivider} />
                <View style={styles.baImageSlot}>
                  <Text style={styles.baImageLabel}>After</Text>
                </View>
              </View>
              <Text style={styles.baTitle}>
                {i === 1 ? "Modern Kitchen" : i === 2 ? "Luxury Bathroom" : "Open Living Room"}
              </Text>
              <Text style={styles.baSub}>
                {i === 1
                  ? "Complete remodel · 4 weeks"
                  : i === 2
                    ? "Full renovation · 2 weeks"
                    : "Open plan conversion · 3 weeks"}
              </Text>
            </GlassCard>
          ))}
        </ScrollView>

        {/* Reviews */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Client Reviews</Text>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingScore}>4.9</Text>
            <Text style={styles.ratingStars}>★★★★★</Text>
          </View>
        </View>
        {REVIEWS.map((r) => (
          <ReviewCard key={r.id} review={r} />
        ))}

        {/* Contact / Quote */}
        <Text style={styles.sectionLabel}>Get in Touch</Text>
        <GlassCard style={styles.contactCard}>
          <View style={styles.contactShine} pointerEvents="none" />
          <Text style={styles.contactTitle}>Ready to transform your space?</Text>
          <Text style={styles.contactSub}>
            Request a free consultation and get a detailed quote within 24 hours.
          </Text>
          <TouchableOpacity style={styles.contactBtn} activeOpacity={0.8}>
            <View style={styles.contactBtnShine} pointerEvents="none" />
            <Text style={styles.contactBtnText}>Request Free Quote</Text>
          </TouchableOpacity>
          <View style={styles.contactDivider} />
          <View style={styles.contactInfo}>
            <View style={styles.contactRow}>
              <Text style={styles.contactIcon}>✆</Text>
              <Text style={styles.contactText}>+40 123 456 789</Text>
            </View>
            <View style={styles.contactRow}>
              <Text style={styles.contactIcon}>@</Text>
              <Text style={styles.contactText}>contact@prvrenovations.ro</Text>
            </View>
          </View>
        </GlassCard>
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

  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  navLogo: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text1,
    letterSpacing: -0.5,
  },
  navBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navBtnText: {
    ...type.footnote,
    color: colors.text2,
    fontWeight: "600",
  },

  hero: {
    marginBottom: 20,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  heroBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  heroBadgeText: {
    ...type.caption2,
    color: colors.text2,
    fontWeight: "600",
  },
  heroTitle: {
    ...type.largeTitle,
    color: colors.text1,
    lineHeight: 40,
    marginBottom: 12,
  },
  heroSub: {
    ...type.body,
    color: colors.text3,
    lineHeight: 24,
    marginBottom: 20,
  },
  heroActions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  heroCTA: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.95)",
    overflow: "hidden",
    position: "relative",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  heroCTAShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,1)",
  },
  heroCTAText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
    letterSpacing: -0.2,
  },
  heroSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heroSecondaryText: {
    ...type.subhead,
    color: colors.text2,
    fontWeight: "600",
  },

  statsRow: {
    flexDirection: "row",
    marginBottom: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statBorder: {
    borderRightWidth: 1,
    borderRightColor: colors.borderSubtle,
  },
  statValue: {
    ...type.title2,
    color: colors.text1,
  },
  statLabel: {
    ...type.caption2,
    color: colors.text3,
    marginTop: 2,
    fontWeight: "500",
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 4,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratingScore: {
    ...type.caption1,
    color: colors.text1,
    fontWeight: "700",
  },
  ratingStars: {
    fontSize: 9,
    color: colors.amber,
  },

  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  serviceCard: {
    width: "23%",
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    overflow: "hidden",
    position: "relative",
  },
  serviceShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  serviceIcon: {
    fontSize: 18,
    color: colors.text2,
  },
  serviceLabel: {
    fontSize: 8,
    fontWeight: "600",
    color: colors.text3,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    lineHeight: 11,
  },

  baScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  baCard: {
    width: 260,
    marginRight: 10,
    padding: 0,
    overflow: "hidden",
  },
  baImages: {
    flexDirection: "row",
    height: 120,
  },
  baImageSlot: {
    flex: 1,
    backgroundColor: colors.glass1,
    alignItems: "center",
    justifyContent: "center",
  },
  baDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  baImageLabel: {
    ...type.caption2,
    color: colors.text3,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  baTitle: {
    ...type.footnote,
    color: colors.text1,
    fontWeight: "600",
    padding: 10,
    paddingBottom: 4,
  },
  baSub: {
    ...type.caption2,
    color: colors.text3,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },

  reviewCard: {
    padding: 13,
    marginBottom: 8,
    gap: 10,
  },
  reviewTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reviewAvatar: {
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
  reviewInitials: {
    ...type.caption2,
    color: colors.text2,
    fontWeight: "700",
  },
  reviewName: {
    ...type.footnote,
    color: colors.text1,
    fontWeight: "600",
    marginBottom: 3,
  },
  reviewProjectChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  reviewProjectText: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  reviewText: {
    ...type.caption1,
    color: colors.text2,
    lineHeight: 17,
  },

  contactCard: {
    padding: 16,
    gap: 0,
    marginBottom: spacing.base,
    position: "relative",
    overflow: "hidden",
  },
  contactShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  contactTitle: {
    ...type.headline,
    color: colors.text1,
    marginBottom: 6,
  },
  contactSub: {
    ...type.footnote,
    color: colors.text3,
    lineHeight: 18,
    marginBottom: 14,
  },
  contactBtn: {
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  contactBtnShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,1)",
  },
  contactBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
    letterSpacing: -0.2,
  },
  contactDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: 14,
  },
  contactInfo: {
    gap: 8,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  contactIcon: {
    fontSize: 13,
    color: colors.text3,
    width: 16,
    textAlign: "center",
  },
  contactText: {
    ...type.footnote,
    color: colors.text2,
  },
})
