import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { GlassCard } from "@/components/Glass"
import { usePublicShop } from "@/hooks/usePublicShop"
import { colors, type, radius, spacing } from "@/tokens"

function formatPrice(value: number): string {
  return `\u20ac${value.toLocaleString("ro-RO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { data, isLoading } = usePublicShop()
  const [query, setQuery] = useState("")
  // Recent terms are session-scoped and only ever contain what the user
  // actually typed — no seeded suggestions pretending to be history.
  const [recent, setRecent] = useState<string[]>([])

  const hasQuery = query.trim().length > 0
  const products = data?.products ?? []

  const results = useMemo(() => {
    if (!hasQuery) return []
    const q = query.trim().toLowerCase()
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    )
  }, [products, query, hasQuery])

  function remember(term: string) {
    const t = term.trim()
    if (!t) return
    setRecent((prev) => [t, ...prev.filter((x) => x !== t)].slice(0, 8))
  }

  return (
    <View style={styles.root}>
      {/* Floating search bar */}
      <View style={[styles.searchBarWrap, { top: insets.top + 12 }]}>
        <View style={styles.searchBar}>
          <View style={styles.searchShine} pointerEvents="none" />
          <Text style={styles.searchIcon}>\u2315</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products, categories\u2026"
            placeholderTextColor={colors.text3}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => remember(query)}
          />
          {hasQuery && (
            <TouchableOpacity onPress={() => setQuery("")} activeOpacity={0.7}>
              <Text style={styles.clearIcon}>\u2715</Text>
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
            {recent.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Recent</Text>
                <GlassCard style={styles.recentCard}>
                  <View style={styles.recentShine} pointerEvents="none" />
                  {recent.map((term, i) => (
                    <TouchableOpacity
                      key={term}
                      style={[styles.recentRow, i < recent.length - 1 && styles.recentRowBorder]}
                      activeOpacity={0.7}
                      onPress={() => setQuery(term)}
                    >
                      <Text style={styles.recentIcon}>\u21ba</Text>
                      <Text style={styles.recentText}>{term}</Text>
                      <TouchableOpacity
                        activeOpacity={0.6}
                        onPress={() => setRecent((prev) => prev.filter((x) => x !== term))}
                        accessibilityLabel={`Remove ${term}`}
                      >
                        <Text style={styles.recentRemove}>\u2715</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </GlassCard>
              </>
            )}

            {/* Browse by category — real categories from the catalogue. */}
            {data && data.categories.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, recent.length > 0 && { marginTop: 20 }]}>
                  Browse by category
                </Text>
                <View style={styles.trendingGrid}>
                  {data.categories.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={styles.trendingChip}
                      activeOpacity={0.75}
                      onPress={() => {
                        setQuery(c)
                        remember(c)
                      }}
                    >
                      <Text style={styles.trendingChipLabel}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {isLoading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.text3} />
              </View>
            )}
          </>
        ) : results.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>
              {results.length} {results.length === 1 ? "result" : "results"} for "{query.trim()}"
            </Text>
            {results.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={styles.resultRow}
                activeOpacity={0.8}
                onPress={() => {
                  remember(query)
                  router.push({ pathname: "/(public)/product", params: { id: r.id } })
                }}
              >
                <View style={styles.resultShine} pointerEvents="none" />
                <View style={styles.resultThumb} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultCategory}>{r.category}</Text>
                  <Text style={styles.resultName}>{r.name}</Text>
                  <Text style={styles.resultPrice}>{formatPrice(r.price)}</Text>
                </View>
                <Text style={styles.resultArrow}>\u203a</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <GlassCard style={styles.noResultCard}>
            <Text style={styles.noResultTitle}>No results for "{query.trim()}"</Text>
            <Text style={styles.noResultSub}>
              Try a different term, or ask us for a quote and we will source it.
            </Text>
            <TouchableOpacity
              style={styles.noResultBtn}
              activeOpacity={0.8}
              onPress={() =>
                router.push({ pathname: "/(public)/quote", params: { service: query.trim() } })
              }
            >
              <Text style={styles.noResultBtnText}>Request a quote</Text>
            </TouchableOpacity>
          </GlassCard>
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

  loadingBox: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  noResultCard: {
    padding: spacing.lg,
    alignItems: "center",
  },
  noResultTitle: {
    ...type.headline,
    color: colors.text1,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  noResultSub: {
    ...type.footnote,
    color: colors.text3,
    textAlign: "center",
  },
  noResultBtn: {
    marginTop: spacing.base,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noResultBtnText: {
    ...type.footnote,
    color: colors.text1,
    fontWeight: "600",
  },
})
