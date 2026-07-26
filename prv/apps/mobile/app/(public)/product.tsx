import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams, useRouter } from "expo-router"
import { GlassCard } from "@/components/Glass"
import { usePublicShop } from "@/hooks/usePublicShop"
import { usePublicReviews, type PublicReview } from "@/hooks/usePublicReviews"
import { useCartStore, cartCount } from "@/store/cart"
import { useFavoritesStore } from "@/store/favorites"
import { colors, radius, spacing, type } from "@/tokens"

function formatPrice(value: number): string {
  return `€${value.toLocaleString("ro-RO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function Stars({ rating, size }: { rating: number; size: number }) {
  return (
    <Text
      style={{ fontSize: size, letterSpacing: 1.5 }}
      accessibilityLabel={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ color: i <= rating ? colors.text1 : colors.text4 }}>
          {"★"}
        </Text>
      ))}
    </Text>
  )
}

function ReviewBlock({ review }: { review: PublicReview }) {
  const date = new Date(review.createdAt).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  const byline = [review.author, date, review.isVerifiedPurchase ? "✓ Verified Purchase" : null]
    .filter(Boolean)
    .join(" · ")
  return (
    <View style={styles.review}>
      {review.title ? <Text style={styles.reviewTitle}>{review.title}</Text> : null}
      <Stars rating={review.rating} size={10} />
      {review.body ? <Text style={styles.reviewBody}>{review.body}</Text> : null}
      <Text style={styles.reviewBy}>{byline}</Text>
    </View>
  )
}

// Ratings & Reviews in the Apple Store manner (preview approved 2026-07):
// one quiet glass panel — summary line, hairline-divided review blocks,
// "See all N reviews ›" at the base. Hidden entirely when there are none.
function ReviewsSection({ productId }: { productId: string }) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = usePublicReviews(productId)
  const summary = data?.pages[0]?.summary
  if (!summary || summary.totalCount === 0) return null

  const reviews = data?.pages.flatMap((p) => p.reviews) ?? []
  const remaining = summary.totalCount - reviews.length

  return (
    <View style={styles.reviewsSect}>
      <Text style={styles.reviewsTitle}>Ratings & Reviews</Text>
      <GlassCard style={styles.reviewsPanel}>
        <View style={styles.summary}>
          <View style={styles.summaryLine}>
            {summary.avgRating != null && (
              <Text style={styles.summaryScore}>{summary.avgRating.toFixed(1)}</Text>
            )}
            <Stars rating={Math.round(summary.avgRating ?? 0)} size={12} />
          </View>
          <Text style={styles.summaryBased}>
            Based on {summary.totalCount} {summary.totalCount === 1 ? "review" : "reviews"}
          </Text>
        </View>
        {reviews.map((r) => (
          <View key={r.id}>
            <View style={styles.hairline} />
            <ReviewBlock review={r} />
          </View>
        ))}
        {hasNextPage && remaining > 0 && (
          <>
            <View style={styles.hairline} />
            <TouchableOpacity
              style={styles.seeAll}
              activeOpacity={0.7}
              disabled={isFetchingNextPage}
              onPress={() => void fetchNextPage()}
              accessibilityRole="button"
              accessibilityLabel={`See all ${summary.totalCount} reviews`}
            >
              <Text style={styles.seeAllText}>
                {isFetchingNextPage ? "Loading…" : `See all ${summary.totalCount} reviews`}
              </Text>
              <Text style={styles.seeAllChevron}>{"›"}</Text>
            </TouchableOpacity>
          </>
        )}
      </GlassCard>
    </View>
  )
}

export default function ProductScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data, isLoading } = usePublicShop()

  const lines = useCartStore((s) => s.lines)
  const addToCart = useCartStore((s) => s.add)
  const favoriteIds = useFavoritesStore((s) => s.ids)
  const toggleFavorite = useFavoritesStore((s) => s.toggle)

  // The catalogue is a single cached query, so the detail view reads from it
  // rather than adding a per-product endpoint that does not exist publicly.
  const product = data?.products.find((p) => p.id === id)
  const isFavorite = product ? favoriteIds.includes(product.id) : false
  const count = cartCount(lines)

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backIcon}>{"‹"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push("/(public)/cart")}
          activeOpacity={0.7}
          accessibilityLabel="Open cart"
        >
          <Text style={styles.backIcon}>{"⊡"}</Text>
          {count > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.text3} />
        </View>
      ) : !product ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Product unavailable</Text>
          <Text style={styles.emptySub}>It may have been removed from the catalogue.</Text>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ padding: spacing.base, paddingBottom: insets.bottom + 140 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              {product.imageUrl ? (
                <Image
                  source={{ uri: product.imageUrl }}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.heroGlyph}>{"◈"}</Text>
              )}
            </View>

            <View style={styles.headRow}>
              <Text style={styles.category}>{product.category}</Text>
              <TouchableOpacity
                onPress={() => void toggleFavorite(product.id)}
                activeOpacity={0.7}
                accessibilityLabel={isFavorite ? "Remove from favourites" : "Add to favourites"}
              >
                <Text style={styles.favIcon}>{isFavorite ? "♥" : "♡"}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.name}>{product.name}</Text>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>

            {product.reviews > 0 && (
              <Text style={styles.rating}>
                {product.rating.toFixed(1)} {"★"} · {product.reviews}{" "}
                {product.reviews === 1 ? "review" : "reviews"}
              </Text>
            )}

            {product.outOfStock && (
              <GlassCard style={styles.notice}>
                <Text style={styles.noticeText}>
                  Currently out of stock. Request a quote and we will source it for you.
                </Text>
              </GlassCard>
            )}

            <ReviewsSection productId={product.id} />
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.base }]}>
            <TouchableOpacity
              style={[styles.primaryBtn, product.outOfStock && styles.primaryBtnDisabled]}
              activeOpacity={0.85}
              disabled={product.outOfStock}
              onPress={async () => {
                await addToCart(product)
                router.push("/(public)/cart")
              }}
            >
              <Text style={styles.primaryBtnText}>
                {product.outOfStock ? "Out of stock" : "Add to cart"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 18, color: colors.text1 },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { ...type.caption2, color: "#fff", fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyTitle: { ...type.headline, color: colors.text1, marginBottom: spacing.xs },
  emptySub: { ...type.footnote, color: colors.text3, textAlign: "center" },
  hero: {
    height: 260,
    borderRadius: radius.card,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  heroGlyph: { fontSize: 44, color: colors.text4 },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  category: {
    ...type.caption1,
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  favIcon: { fontSize: 22, color: colors.text2 },
  name: { ...type.title2, color: colors.text1, marginTop: spacing.xs },
  price: { ...type.title3, color: colors.text1, marginTop: spacing.sm },
  rating: { ...type.footnote, color: colors.text3, marginTop: spacing.xs },
  notice: { padding: spacing.base, marginTop: spacing.lg },
  noticeText: { ...type.footnote, color: colors.text2 },
  reviewsSect: { marginTop: spacing.xl },
  reviewsTitle: { ...type.title3, color: colors.text1, letterSpacing: -0.4 },
  reviewsPanel: { marginTop: spacing.md, paddingVertical: 0, paddingHorizontal: 0 },
  summary: { paddingHorizontal: spacing.base, paddingVertical: spacing.base },
  summaryLine: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  summaryScore: { ...type.title2, color: colors.text1 },
  summaryBased: { ...type.caption1, color: colors.text3, marginTop: 4 },
  hairline: { height: 1, backgroundColor: colors.borderSubtle, marginHorizontal: spacing.base },
  review: { paddingHorizontal: spacing.base, paddingVertical: spacing.base },
  reviewTitle: { ...type.subhead, fontWeight: "600", color: colors.text1, marginBottom: 5 },
  reviewBody: { ...type.footnote, color: colors.text2, lineHeight: 19, marginTop: 8 },
  reviewBy: { ...type.caption1, color: colors.text3, marginTop: 9 },
  seeAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
  },
  seeAllText: { ...type.footnote, fontWeight: "600", color: colors.text1 },
  seeAllChevron: { fontSize: 16, color: colors.text3 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  primaryBtn: {
    backgroundColor: "#ffffff",
    borderRadius: radius.base,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.3 },
  primaryBtnText: { ...type.headline, color: "#000000" },
})
