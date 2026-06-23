import { ScrollView, StyleSheet, Text, TouchableOpacity, View, RefreshControl } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { GlassCard } from "@/components/Glass"
import { colors, spacing, type, radius } from "@/tokens"

const CATEGORIES = [
  { id: "c1", icon: "⬛", label: "Tiles & Stone" },
  { id: "c2", icon: "◈", label: "Flooring" },
  { id: "c3", icon: "◻", label: "Fixtures" },
  { id: "c4", icon: "▪", label: "Hardware" },
  { id: "c5", icon: "◉", label: "Paint" },
  { id: "c6", icon: "⊞", label: "Tools" },
]

const FEATURED = [
  {
    id: "p1",
    name: "Premium Marble Tile 60×60",
    price: "€42/m²",
    category: "Tiles & Stone",
    badge: "Bestseller",
  },
  {
    id: "p2",
    name: "Oak Engineered Flooring",
    price: "€38/m²",
    category: "Flooring",
    badge: "New",
  },
  { id: "p3", name: "Matte Black Mixer Tap", price: "€189", category: "Fixtures", badge: null },
  { id: "p4", name: "Epoxy Tile Adhesive 25kg", price: "€24", category: "Hardware", badge: "Sale" },
]

function CategoryChip({ icon, label }: { icon: string; label: string }) {
  return (
    <TouchableOpacity style={styles.catChip} activeOpacity={0.75}>
      <Text style={styles.catIcon}>{icon}</Text>
      <Text style={styles.catLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

function ProductCard({ product }: { product: (typeof FEATURED)[number] }) {
  return (
    <TouchableOpacity style={styles.productCard} activeOpacity={0.8}>
      <View style={styles.productShine} pointerEvents="none" />
      <View style={styles.productImage}>
        {product.badge && (
          <View style={styles.productBadge}>
            <Text style={styles.productBadgeText}>{product.badge}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.favoriteBtn} activeOpacity={0.8}>
          <Text style={styles.favoriteBtnIcon}>♡</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productCategory}>{product.category}</Text>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.productBottom}>
          <Text style={styles.productPrice}>{product.price}</Text>
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.8}>
            <Text style={styles.addBtnIcon}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default function ShopScreen() {
  const insets = useSafeAreaInsets()

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Shop</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerBtn} activeOpacity={0.8}>
              <Text style={styles.headerBtnIcon}>⌕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cartBtn} activeOpacity={0.8}>
              <Text style={styles.cartBtnIcon}>⊡</Text>
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>3</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Promo banner */}
        <GlassCard style={styles.promoBanner}>
          <View style={styles.promoShine} pointerEvents="none" />
          <View style={{ flex: 1 }}>
            <Text style={styles.promoTag}>Limited offer</Text>
            <Text style={styles.promoTitle}>15% off all tiles</Text>
            <Text style={styles.promoSub}>Use code TILES15 · Valid until 30 Jun</Text>
          </View>
          <Text style={styles.promoGlyph}>◈</Text>
        </GlassCard>

        {/* Categories */}
        <Text style={styles.sectionLabel}>Categories</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.catScroll}
          contentContainerStyle={styles.catScrollContent}
        >
          {CATEGORIES.map((c) => (
            <CategoryChip key={c.id} icon={c.icon} label={c.label} />
          ))}
        </ScrollView>

        {/* Featured products */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Featured Products</Text>
          <TouchableOpacity activeOpacity={0.6}>
            <Text style={styles.seeAll}>See all →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.productsGrid}>
          {FEATURED.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </View>

        {/* Browse more */}
        <GlassCard style={styles.browseCard}>
          <View style={styles.browseShine} pointerEvents="none" />
          <Text style={styles.browseTitle}>500+ Products Available</Text>
          <Text style={styles.browseSub}>Browse the full catalogue for your renovation needs</Text>
          <TouchableOpacity style={styles.browseBtn} activeOpacity={0.8}>
            <Text style={styles.browseBtnText}>Browse All →</Text>
          </TouchableOpacity>
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
})
