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
import { useRouter } from "expo-router"
import { GlassCard } from "@/components/Glass"
import { usePublicShop, type PublicProduct } from "@/hooks/usePublicShop"
import { useFavoritesStore } from "@/store/favorites"
import { useCartStore } from "@/store/cart"
import { colors, type, radius } from "@/tokens"

function formatPrice(value: number): string {
  return `\u20ac${value.toLocaleString("ro-RO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function FavoriteCard({
  item,
  onOpen,
  onRemove,
  onAdd,
}: {
  item: PublicProduct
  onOpen: () => void
  onRemove: () => void
  onAdd: () => void
}) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={onOpen}>
      <View style={styles.cardShine} pointerEvents="none" />
      <View style={styles.cardThumb}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : null}
        {item.outOfStock && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Out of stock</Text>
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardCategory}>{item.category}</Text>
          <Text style={styles.cardName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.removeBtn}
            activeOpacity={0.75}
            onPress={onRemove}
            accessibilityLabel={`Remove ${item.name} from favourites`}
          >
            <Text style={styles.removeBtnIcon}>\u2665</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, item.outOfStock && styles.addBtnDisabled]}
            activeOpacity={0.8}
            disabled={item.outOfStock}
            onPress={onAdd}
            accessibilityLabel={`Add ${item.name} to cart`}
          >
            <Text style={styles.addBtnIcon}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { data, isLoading } = usePublicShop()

  const ids = useFavoritesStore((s) => s.ids)
  const toggle = useFavoritesStore((s) => s.toggle)
  const clearFavorites = useFavoritesStore((s) => s.clear)
  const addToCart = useCartStore((s) => s.add)

  // Favourites hold product ids; the catalogue query supplies the detail, so an
  // item that leaves the catalogue simply stops appearing.
  const items = (data?.products ?? []).filter((p) => ids.includes(p.id))
  const isEmpty = items.length === 0

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
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Favorites</Text>
          {!isEmpty && (
            <TouchableOpacity activeOpacity={0.6} onPress={() => void clearFavorites()}>
              <Text style={styles.clearAll}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>

        {isLoading && ids.length > 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.text3} />
          </View>
        ) : isEmpty ? (
          <View style={styles.emptyWrap}>
            <GlassCard style={styles.emptyCard}>
              <View style={styles.emptyShine} pointerEvents="none" />
              <Text style={styles.emptyIcon}>\u2661</Text>
              <Text style={styles.emptyTitle}>No favorites yet</Text>
              <Text style={styles.emptySub}>
                Tap the heart on any product to save it here for quick access.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                activeOpacity={0.8}
                onPress={() => router.push("/(public)/shop")}
              >
                <Text style={styles.emptyBtnText}>Browse Shop \u2192</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>
              {items.length} saved {items.length === 1 ? "item" : "items"}
            </Text>
            <View style={styles.list}>
              {items.map((item) => (
                <FavoriteCard
                  key={item.id}
                  item={item}
                  onOpen={() =>
                    router.push({ pathname: "/(public)/product", params: { id: item.id } })
                  }
                  onRemove={() => void toggle(item.id)}
                  onAdd={() => void addToCart(item)}
                />
              ))}
            </View>

            <GlassCard style={styles.shareCard}>
              <View style={styles.shareShine} pointerEvents="none" />
              <View style={{ flex: 1 }}>
                <Text style={styles.shareTitle}>Get a quote</Text>
                <Text style={styles.shareSub}>Ask us to price these items for your project</Text>
              </View>
              <TouchableOpacity
                style={styles.shareBtn}
                activeOpacity={0.8}
                accessibilityLabel="Request a quote for saved items"
                onPress={() =>
                  router.push({
                    pathname: "/(public)/quote",
                    params: { service: items.map((i) => i.name).join(", ") },
                  })
                }
              >
                <Text style={styles.shareBtnIcon}>\u2197</Text>
              </TouchableOpacity>
            </GlassCard>
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
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  pageTitle: {
    ...type.title1,
    color: colors.text1,
  },
  clearAll: {
    ...type.footnote,
    color: colors.text3,
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  list: {
    gap: 10,
    marginBottom: 16,
  },

  card: {
    borderRadius: radius.card,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: "hidden",
    position: "relative",
  },
  cardShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
    zIndex: 1,
  },
  cardThumb: {
    height: 120,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.text1,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  cardInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  cardCategory: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  cardName: {
    ...type.subhead,
    color: colors.text1,
    fontWeight: "600",
    lineHeight: 19,
    marginBottom: 5,
  },
  cardPrice: {
    ...type.subhead,
    color: colors.text2,
    fontWeight: "700",
  },
  cardActions: {
    gap: 8,
    alignItems: "center",
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtnIcon: {
    fontSize: 15,
    color: colors.text2,
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnIcon: {
    fontSize: 18,
    color: colors.bg,
    fontWeight: "700",
    lineHeight: 20,
  },

  shareCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    position: "relative",
    overflow: "hidden",
  },
  shareShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  shareTitle: {
    ...type.headline,
    color: colors.text1,
    marginBottom: 3,
  },
  shareSub: {
    ...type.caption2,
    color: colors.text3,
    lineHeight: 15,
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  shareBtnIcon: {
    fontSize: 17,
    color: colors.text2,
  },

  emptyWrap: {
    paddingTop: 40,
  },
  emptyCard: {
    alignItems: "center",
    padding: 32,
    gap: 10,
    position: "relative",
    overflow: "hidden",
  },
  emptyShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  emptyIcon: {
    fontSize: 48,
    color: colors.text4,
    marginBottom: 8,
  },
  emptyTitle: {
    ...type.title3,
    color: colors.text1,
    textAlign: "center",
  },
  emptySub: {
    ...type.footnote,
    color: colors.text3,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 220,
  },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyBtnText: {
    ...type.footnote,
    color: colors.text1,
    fontWeight: "600",
  },

  addBtnDisabled: {
    opacity: 0.35,
  },
  loadingBox: {
    paddingVertical: 32,
    alignItems: "center",
  },
})
