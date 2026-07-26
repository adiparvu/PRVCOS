import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { GlassCard } from "@/components/Glass"
import { usePublicShop, type PublicProduct } from "@/hooks/usePublicShop"
import { useCartStore, cartCount } from "@/store/cart"
import { useFavoritesStore } from "@/store/favorites"
import { colors, spacing, type, radius } from "@/tokens"

const ALL = "All"

function formatPrice(value: number): string {
  return `\u20ac${value.toLocaleString("ro-RO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function CategoryChip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.catChip, active && styles.catChipActive]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <Text style={[styles.catLabel, active && styles.catLabelActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

function ProductCard({
  product,
  isFavorite,
  onOpen,
  onToggleFavorite,
  onAdd,
}: {
  product: PublicProduct
  isFavorite: boolean
  onOpen: () => void
  onToggleFavorite: () => void
  onAdd: () => void
}) {
  return (
    <TouchableOpacity style={styles.productCard} activeOpacity={0.8} onPress={onOpen}>
      <View style={styles.productShine} pointerEvents="none" />
      <View style={styles.productImage}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.productImageFill}
            resizeMode="cover"
          />
        ) : null}
        {product.outOfStock && (
          <View style={styles.productBadge}>
            <Text style={styles.productBadgeText}>Out of stock</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.favoriteBtn}
          activeOpacity={0.8}
          onPress={onToggleFavorite}
          accessibilityLabel={isFavorite ? "Remove from favourites" : "Add to favourites"}
        >
          <Text style={styles.favoriteBtnIcon}>{isFavorite ? "\u2665" : "\u2661"}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productCategory}>{product.category}</Text>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.productBottom}>
          <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
          <TouchableOpacity
            style={[styles.addBtn, product.outOfStock && styles.addBtnDisabled]}
            activeOpacity={0.8}
            disabled={product.outOfStock}
            onPress={onAdd}
            accessibilityLabel={`Add ${product.name} to cart`}
          >
            <Text style={styles.addBtnIcon}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default function ShopScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { data, isLoading, isError, refetch, isRefetching } = usePublicShop()
  const [category, setCategory] = useState<string>(ALL)

  const lines = useCartStore((s) => s.lines)
  const addToCart = useCartStore((s) => s.add)
  const favoriteIds = useFavoritesStore((s) => s.ids)
  const toggleFavorite = useFavoritesStore((s) => s.toggle)

  const count = cartCount(lines)
  const products = data?.products ?? []

  const visible = useMemo(
    () => (category === ALL ? products : products.filter((p) => p.category === category)),
    [products, category]
  )

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
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.text3}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Shop</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerBtn}
              activeOpacity={0.8}
              onPress={() => router.push("/(public)/search")}
              accessibilityLabel="Search products"
            >
              <Text style={styles.headerBtnIcon}>\u2315</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cartBtn}
              activeOpacity={0.8}
              onPress={() => router.push("/(public)/cart")}
              accessibilityLabel="Open cart"
            >
              <Text style={styles.cartBtnIcon}>\u22a1</Text>
              {count > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{count > 99 ? "99+" : count}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {isLoading && (
          <View style={styles.stateBox}>
            <ActivityIndicator color={colors.text3} />
          </View>
        )}

        {isError && !isLoading && (
          <GlassCard style={styles.stateCard}>
            <Text style={styles.stateTitle}>Could not load the catalogue</Text>
            <Text style={styles.stateSub}>Check your connection and try again.</Text>
            <TouchableOpacity
              style={styles.stateBtn}
              activeOpacity={0.8}
              onPress={() => void refetch()}
            >
              <Text style={styles.stateBtnText}>Retry</Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        {!isLoading && !isError && (
          <>
            {/* Categories — derived from the catalogue; there is no public
                categories endpoint, and the API filter keys on slug while the
                response carries names, so filtering happens here. */}
            {data && data.categories.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Categories</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.catScroll}
                  contentContainerStyle={styles.catScrollContent}
                >
                  {[ALL, ...data.categories].map((c) => (
                    <CategoryChip
                      key={c}
                      label={c}
                      active={c === category}
                      onPress={() => setCategory(c)}
                    />
                  ))}
                </ScrollView>
              </>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>
                {category === ALL ? "All products" : category}
              </Text>
              {category !== ALL && (
                <TouchableOpacity activeOpacity={0.6} onPress={() => setCategory(ALL)}>
                  <Text style={styles.seeAll}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {visible.length > 0 ? (
              <View style={styles.productsGrid}>
                {visible.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    isFavorite={favoriteIds.includes(p.id)}
                    onOpen={() =>
                      router.push({ pathname: "/(public)/product", params: { id: p.id } })
                    }
                    onToggleFavorite={() => void toggleFavorite(p.id)}
                    onAdd={() => void addToCart(p)}
                  />
                ))}
              </View>
            ) : (
              <GlassCard style={styles.stateCard}>
                <Text style={styles.stateTitle}>
                  {data?.misconfigured ? "Catalogue unavailable" : "Nothing here yet"}
                </Text>
                <Text style={styles.stateSub}>
                  {data?.misconfigured
                    ? "The storefront is not configured yet. Please try again later."
                    : category === ALL
                      ? "New products are added regularly \u2014 check back soon."
                      : `No products in ${category} right now.`}
                </Text>
              </GlassCard>
            )}

            {products.length > 0 && (
              <GlassCard style={styles.browseCard}>
                <View style={styles.browseShine} pointerEvents="none" />
                <Text style={styles.browseTitle}>
                  {products.length} {products.length === 1 ? "product" : "products"} available
                </Text>
                <Text style={styles.browseSub}>
                  Tell us what you need and we will quote your renovation.
                </Text>
                <TouchableOpacity
                  style={styles.browseBtn}
                  activeOpacity={0.8}
                  onPress={() => router.push("/(public)/quote")}
                >
                  <Text style={styles.browseBtnText}>Request a quote \u2192</Text>
                </TouchableOpacity>
              </GlassCard>
            )}
          </>
        )}
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

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  pageTitle: {
    ...type.title1,
    color: colors.text1,
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBtnIcon: {
    fontSize: 17,
    color: colors.text2,
  },
  cartBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cartBtnIcon: {
    fontSize: 17,
    color: colors.text2,
  },
  cartBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.text1,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.bg,
  },

  promoBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 20,
    position: "relative",
    overflow: "hidden",
  },
  promoShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  promoTag: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.amber,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  promoTitle: {
    ...type.headline,
    color: colors.text1,
    marginBottom: 3,
  },
  promoSub: {
    ...type.caption2,
    color: colors.text3,
  },
  promoGlyph: {
    fontSize: 32,
    color: colors.text4,
    marginLeft: 8,
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 4,
  },
  seeAll: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.text3,
  },

  catScroll: {
    marginHorizontal: -16,
    marginBottom: 20,
  },
  catScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catIcon: {
    fontSize: 13,
    color: colors.text2,
  },
  catLabel: {
    ...type.footnote,
    color: colors.text2,
    fontWeight: "500",
  },

  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  productCard: {
    width: "47.5%",
    borderRadius: radius.card,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: "hidden",
    position: "relative",
  },
  productShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
    zIndex: 1,
  },
  productImage: {
    height: 110,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    position: "relative",
  },
  productBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.text1,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  favoriteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteBtnIcon: {
    fontSize: 13,
    color: colors.text3,
  },
  productInfo: {
    padding: 10,
    gap: 3,
  },
  productCategory: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  productName: {
    ...type.footnote,
    color: colors.text1,
    fontWeight: "600",
    lineHeight: 17,
  },
  productBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  productPrice: {
    ...type.subhead,
    color: colors.text1,
    fontWeight: "700",
  },
  addBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnIcon: {
    fontSize: 16,
    color: colors.bg,
    fontWeight: "700",
    lineHeight: 18,
  },

  browseCard: {
    padding: 16,
    marginBottom: spacing.base,
    position: "relative",
    overflow: "hidden",
  },
  browseShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  browseTitle: {
    ...type.headline,
    color: colors.text1,
    marginBottom: 5,
  },
  browseSub: {
    ...type.footnote,
    color: colors.text3,
    lineHeight: 18,
    marginBottom: 14,
  },
  browseBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  browseBtnText: {
    ...type.footnote,
    color: colors.text1,
    fontWeight: "600",
  },

  productImageFill: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },
  catChipActive: {
    backgroundColor: colors.glass3,
    borderColor: colors.border,
  },
  catLabelActive: {
    color: colors.text1,
  },
  addBtnDisabled: {
    opacity: 0.35,
  },
  stateBox: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  stateCard: {
    padding: spacing.lg,
    marginBottom: spacing.base,
    alignItems: "center",
  },
  stateTitle: {
    ...type.headline,
    color: colors.text1,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  stateSub: {
    ...type.footnote,
    color: colors.text3,
    textAlign: "center",
  },
  stateBtn: {
    marginTop: spacing.base,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stateBtnText: {
    ...type.footnote,
    color: colors.text1,
    fontWeight: "600",
  },
})
