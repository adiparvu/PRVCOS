import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useState } from "react"
import { GlassCard } from "@/components/Glass"
import { colors, type, radius, spacing } from "@/tokens"

const RECENT = ["marble tiles", "oak flooring", "mixer tap", "tile adhesive", "paint roller"]

const TRENDING = [
  { id: "t1", icon: "⬛", label: "Marble Tiles" },
  { id: "t2", icon: "◈", label: "Engineered Wood" },
  { id: "t3", icon: "◻", label: "Mixer Taps" },
  { id: "t4", icon: "▪", label: "Grout & Adhesive" },
  { id: "t5", icon: "◉", label: "Wall Paint" },
  { id: "t6", icon: "⊞", label: "Power Tools" },
]

const RESULTS = [
  { id: "r1", name: "Premium Marble Tile 60×60", price: "€42/m²", category: "Tiles & Stone" },
  { id: "r2", name: "Matte Marble Tile 30×60", price: "€31/m²", category: "Tiles & Stone" },
  { id: "r3", name: "Marble Mosaic Insert", price: "€18/pc", category: "Tiles & Stone" },
]

export default function SearchScreen() {
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState("")

  const hasQuery = query.trim().length > 0
  const results = hasQuery
    ? RESULTS.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
    : []

  return (
    <View style={styles.root}>
      {/* Floating search bar */}
      <View style={[styles.searchBarWrap, { top: insets.top + 12 }]}>
        <View style={styles.searchBar}>
          <View style={styles.searchShine} pointerEvents="none" />
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products, categories…"
            placeholderTextColor={colors.text3}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
          {hasQuery && (
            <TouchableOpacity onPress={() => setQuery("")} activeOpacity={0.7}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 104 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!hasQuery ? (
          <>
            {/* Recent searches */}
            <Text style={styles.sectionLabel}>Recent</Text>
            <GlassCard style={styles.recentCard}>
              <View style={styles.recentShine} pointerEvents="none" />
              {RECENT.map((term, i) => (
                <TouchableOpacity
                  key={term}
                  style={[styles.recentRow, i < RECENT.length - 1 && styles.recentRowBorder]}
                  activeOpacity={0.7}
                  onPress={() => setQuery(term)}
                >
                  <Text style={styles.recentIcon}>↺</Text>
                  <Text style={styles.recentText}>{term}</Text>
                  <TouchableOpacity activeOpacity={0.6}>
                    <Text style={styles.recentRemove}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </GlassCard>

            {/* Trending */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Trending</Text>
            <View style={styles.trendingGrid}>
              {TRENDING.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.trendingChip}
                  activeOpacity={0.75}
                  onPress={() => setQuery(item.label)}
                >
                  <Text style={styles.trendingChipIcon}>{item.icon}</Text>
                  <Text style={styles.trendingChipLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : results.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>
              {results.length} Results for "{query}"
            </Text>
            {results.map((r) => (
              <TouchableOpacity key={r.id} style={styles.resultRow} activeOpacity={0.8}>
                <View style={styles.resultShine} pointerEvents="none" />
                <View style={styles.resultThumb} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultCategory}>{r.category}</Text>
                  <Text style={styles.resultName}>{r.name}</Text>
                  <Text style={styles.resultPrice}>{r.price}</Text>
                </View>
                <Text style={styles.resultArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⌕</Text>
            <Text style={styles.emptyTitle}>No results for "{query}"</Text>
            <Text style={styles.emptySub}>Try different keywords or browse categories</Text>
          </View>
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
  searchBarWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
    overflow: "hidden",
  },
  searchShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  searchIcon: {
    fontSize: 17,
    color: colors.text3,
  },
  searchInput: {
    flex: 1,
    ...type.body,
    color: colors.text1,
    padding: 0,
  },
  clearIcon: {
    fontSize: 13,
    color: colors.text3,
    paddingHorizontal: 4,
  },

  content: {
    paddingHorizontal: 16,
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  recentCard: {
    overflow: "hidden",
    position: "relative",
  },
  recentShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  recentRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  recentIcon: {
    fontSize: 14,
    color: colors.text3,
  },
  recentText: {
    flex: 1,
    ...type.callout,
    color: colors.text2,
  },
  recentRemove: {
    fontSize: 11,
    color: colors.text4,
  },

  trendingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  trendingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trendingChipIcon: {
    fontSize: 13,
    color: colors.text2,
  },
  trendingChipLabel: {
    ...type.footnote,
    color: colors.text2,
    fontWeight: "500",
  },

  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    marginBottom: 8,
    borderRadius: radius.card,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    position: "relative",
    overflow: "hidden",
  },
  resultShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  resultThumb: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  resultCategory: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  resultName: {
    ...type.footnote,
    color: colors.text1,
    fontWeight: "600",
    marginBottom: 3,
  },
  resultPrice: {
    ...type.footnote,
    color: colors.text2,
    fontWeight: "500",
  },
  resultArrow: {
    fontSize: 20,
    color: colors.text4,
  },

  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyIcon: {
    fontSize: 40,
    color: colors.text4,
    marginBottom: 8,
  },
  emptyTitle: {
    ...type.headline,
    color: colors.text2,
    textAlign: "center",
  },
  emptySub: {
    ...type.footnote,
    color: colors.text3,
    textAlign: "center",
  },
})
