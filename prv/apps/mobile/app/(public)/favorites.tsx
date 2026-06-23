import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { GlassCard } from "@/components/Glass"
import { colors, type, radius } from "@/tokens"

const FAVORITES = [
  {
    id: "f1",
    name: "Premium Marble Tile 60×60",
    price: "€42/m²",
    category: "Tiles & Stone",
    badge: "Bestseller",
  },
  { id: "f2", name: "Oak Engineered Flooring", price: "€38/m²", category: "Flooring", badge: null },
  { id: "f3", name: "Matte Black Mixer Tap", price: "€189", category: "Fixtures", badge: null },
]

function FavoriteCard({ item }: { item: (typeof FAVORITES)[number] }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8}>
      <View style={styles.cardShine} pointerEvents="none" />
      <View style={styles.cardThumb}>
        {item.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardCategory}>{item.category}</Text>
          <Text style={styles.cardName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.cardPrice}>{item.price}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.removeBtn} activeOpacity={0.75}>
            <Text style={styles.removeBtnIcon}>♡</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.8}>
            <Text style={styles.addBtnIcon}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets()
  const isEmpty = FAVORITES.length === 0

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
            <TouchableOpacity activeOpacity={0.6}>
              <Text style={styles.clearAll}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>

        {isEmpty ? (
          /* Empty state */
          <View style={styles.emptyWrap}>
            <GlassCard style={styles.emptyCard}>
              <View style={styles.emptyShine} pointerEvents="none" />
              <Text style={styles.emptyIcon}>♡</Text>
              <Text style={styles.emptyTitle}>No favorites yet</Text>
              <Text style={styles.emptySub}>
                Tap the heart on any product to save it here for quick access.
              </Text>
              <TouchableOpacity style={styles.emptyBtn} activeOpacity={0.8}>
                <Text style={styles.emptyBtnText}>Browse Shop →</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>{FAVORITES.length} Saved Items</Text>
            <View style={styles.list}>
              {FAVORITES.map((item) => (
                <FavoriteCard key={item.id} item={item} />
              ))}
            </View>

            {/* Share wishlist */}
            <GlassCard style={styles.shareCard}>
              <View style={styles.shareShine} pointerEvents="none" />
              <View style={{ flex: 1 }}>
                <Text style={styles.shareTitle}>Share Wishlist</Text>
                <Text style={styles.shareSub}>Send your saved items to someone or get a quote</Text>
              </View>
              <TouchableOpacity style={styles.shareBtn} activeOpacity={0.8}>
                <Text style={styles.shareBtnIcon}>↗</Text>
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
})
