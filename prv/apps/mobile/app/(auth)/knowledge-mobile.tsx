import { useState } from "react"
import {
  RefreshControl,
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
import { SkeletonRow } from "@/components/Skeleton"
import {
  useKnowledge,
  useSemanticKnowledgeSearch,
  type ArticleType,
  type KnowledgeArticle,
  type SemanticSearchResult,
} from "@/hooks/useKnowledge"
import { colors, radius, spacing, type as t } from "@/tokens"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<ArticleType, string> = {
  sop: colors.amber,
  policy: colors.red,
  guide: colors.green,
  faq: colors.text2,
}

const TYPE_BG: Record<ArticleType, string> = {
  sop: "rgba(255,159,10,0.12)",
  policy: "rgba(255,69,58,0.12)",
  guide: "rgba(48,209,88,0.12)",
  faq: colors.glass1,
}

const TYPE_GLYPH: Record<ArticleType, string> = {
  sop: "⊞",
  policy: "◉",
  guide: "◎",
  faq: "◈",
}

type FilterKey = "all" | ArticleType

const TYPE_FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sop", label: "SOP" },
  { key: "policy", label: "Policy" },
  { key: "guide", label: "Guide" },
  { key: "faq", label: "FAQ" },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetaChip({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string | number
  valueColor?: string
}) {
  return (
    <View style={s.metaChip}>
      <View style={s.metaChipShine} pointerEvents="none" />
      <Text style={[s.metaChipValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      <Text style={s.metaChipLabel}>{label}</Text>
    </View>
  )
}

function ArticleCard({ item }: { item: KnowledgeArticle }) {
  const router = useRouter()
  const glyph = TYPE_GLYPH[item.type]
  const typeColor = TYPE_COLOR[item.type]
  const typeBg = TYPE_BG[item.type]

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() =>
        router.push({ pathname: "/(auth)/knowledge-article", params: { id: item.id } })
      }
    >
      <GlassCard style={s.articleCard}>
        <View style={s.cardShine} pointerEvents="none" />
        <View style={s.articleRow}>
          <View style={[s.typeCircle, { backgroundColor: typeBg }]}>
            <Text style={[s.typeGlyph, { color: typeColor }]}>{glyph}</Text>
          </View>

          <View style={s.articleInfo}>
            <View style={s.articleTopRow}>
              {item.isPinned ? <Text style={s.pinDot}>● </Text> : null}
              <Text style={s.articleTitle} numberOfLines={2}>
                {item.title}
              </Text>
            </View>
            <Text style={s.articleMeta} numberOfLines={1}>
              {item.categoryLabel} · {item.author} · {item.updatedDate}
            </Text>
            {item.readProgress > 0 ? (
              <View style={s.progressWrap}>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${item.readProgress}%` }]} />
                </View>
                <Text style={s.progressLabel}>{item.readProgress}%</Text>
              </View>
            ) : null}
          </View>

          <View style={s.articleRight}>
            <View style={[s.typePill, { backgroundColor: typeBg }]}>
              <Text style={[s.typePillText, { color: typeColor }]}>{item.typeLabel}</Text>
            </View>
            <Text style={s.readTime}>{item.readMinutes} min</Text>
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  )
}

function SkeletonState() {
  return (
    <View style={s.skeletonWrap}>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </View>
  )
}

// ─── Semantic search (port of the approved web design) ───────────────────────

type SemanticMode = "idle" | "loading" | "results" | "empty" | "not_configured" | "error"

function SemanticResultCard({ result }: { result: SemanticSearchResult }) {
  const router = useRouter()
  const pct = Math.round(result.similarity * 100)
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() =>
        router.push({ pathname: "/(auth)/knowledge-article", params: { id: result.articleId } })
      }
      accessibilityRole="button"
      accessibilityLabel={`${result.articleTitle ?? "Articol"}, relevanță ${pct} la sută`}
      style={s.semCard}
    >
      <View style={s.semCardShine} pointerEvents="none" />
      <View style={s.semHead}>
        <Text style={s.semTitle} numberOfLines={2}>
          {result.articleTitle ?? "Articol"}
        </Text>
        <View style={s.semSim}>
          <View style={s.semBar}>
            <View style={[s.semBarFill, { width: `${pct}%` }]} />
          </View>
          <Text style={s.semPct}>{pct}%</Text>
        </View>
      </View>
      <Text style={s.semExcerpt} numberOfLines={4}>
        …{result.excerpt}…
      </Text>
      <View style={s.semFoot}>
        <Text style={s.semMeta}>fragmentul {result.chunkIndex + 1}</Text>
        <Text style={s.semOpen}>Deschide articolul →</Text>
      </View>
    </TouchableOpacity>
  )
}

function SemanticStatePanel({
  glyph,
  title,
  description,
}: {
  glyph: string
  title: string
  description: string
}) {
  return (
    <View style={s.semState} accessibilityRole="text">
      <View style={s.semCardShine} pointerEvents="none" />
      <Text style={s.semStateGlyph}>{glyph}</Text>
      <Text style={s.semStateTitle}>{title}</Text>
      <Text style={s.semStateDesc}>{description}</Text>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function KnowledgeMobileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [typeFilter, setTypeFilter] = useState<FilterKey>("all")
  const [query, setQuery] = useState("")
  const [semMode, setSemMode] = useState<SemanticMode>("idle")
  const [semResults, setSemResults] = useState<SemanticSearchResult[]>([])
  const { data, isLoading, refetch, isRefetching } = useKnowledge(
    typeFilter === "all" ? undefined : { type: typeFilter }
  )
  const { mutate: runSemantic } = useSemanticKnowledgeSearch()

  // One field, two modes (approved design): typing filters titles locally,
  // submit asks the knowledge base semantically and replaces the list.
  const semanticActive = semMode !== "idle"
  const allArticles = data?.articles ?? []
  const visibleArticles = query.trim()
    ? allArticles.filter((a) => a.title.toLowerCase().includes(query.trim().toLowerCase()))
    : allArticles

  function clearSemantic() {
    setSemMode("idle")
    setSemResults([])
  }

  function submitSemantic() {
    const q = query.trim()
    if (q.length < 2) return
    setSemMode("loading")
    runSemantic(q, {
      onSuccess: (body) => {
        if (body.reason === "not_configured") setSemMode("not_configured")
        else if (body.results.length === 0) setSemMode("empty")
        else {
          setSemResults(body.results)
          setSemMode("results")
        }
      },
      onError: () => setSemMode("error"),
    })
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Knowledge Base</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Semantic search — pill bar, two modes */}
      <View style={s.searchWrap}>
        <View style={s.searchBar}>
          <View style={s.semCardShine} pointerEvents="none" />
          <Text style={s.searchGlyph}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={(text) => {
              setQuery(text)
              if (text === "") clearSemantic()
            }}
            onSubmitEditing={submitSemantic}
            returnKeyType="search"
            placeholder="Caută sau întreabă baza de cunoștințe…"
            placeholderTextColor={colors.text3}
            accessibilityLabel="Caută în titluri sau întreabă baza de cunoștințe; tasta de căutare pornește căutarea semantică"
            style={s.searchInput}
          />
          {semanticActive ? (
            <TouchableOpacity
              onPress={() => {
                setQuery("")
                clearSemantic()
              }}
              accessibilityRole="button"
              accessibilityLabel="Închide căutarea semantică"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={s.searchClear}>✕</Text>
            </TouchableOpacity>
          ) : query.trim().length >= 2 ? (
            <Text style={s.searchHint}>caută ↵</Text>
          ) : null}
        </View>
      </View>

      {/* Meta strip */}
      {data?.meta && !semanticActive ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.metaStrip}
          style={s.metaScroll}
        >
          <MetaChip label="Articles" value={data.meta.total} />
          <MetaChip label="SOPs" value={data.meta.sopCount} valueColor={colors.amber} />
          <MetaChip label="Updated" value={data.meta.recentlyUpdated} valueColor={colors.green} />
        </ScrollView>
      ) : null}

      {/* Type filter */}
      {semanticActive ? null : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
          style={s.filterScroll}
        >
          {TYPE_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[s.filterChip, typeFilter === f.key && s.filterChipActive]}
              onPress={() => setTypeFilter(f.key)}
              activeOpacity={0.75}
            >
              <Text style={[s.filterChipText, typeFilter === f.key && s.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Semantic results / states replace the list while active */}
      {semanticActive ? (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {semMode === "loading" ? (
            <SkeletonState />
          ) : semMode === "results" ? (
            <>
              <Text style={s.semCount}>
                {semResults.length}{" "}
                {semResults.length === 1 ? "potrivire semantică" : "potriviri semantice"} · după
                înțelesul textului
              </Text>
              {semResults.map((r) => (
                <SemanticResultCard key={`${r.articleId}-${r.chunkIndex}`} result={r} />
              ))}
            </>
          ) : semMode === "empty" ? (
            <SemanticStatePanel
              glyph="◌"
              title="Nimic suficient de apropiat"
              description="Niciun articol nu se apropie de sensul întrebării. Încearcă o formulare diferită."
            />
          ) : semMode === "not_configured" ? (
            <SemanticStatePanel
              glyph="◇"
              title="Căutarea semantică nu e activată"
              description="Filtrarea după titlu funcționează în continuare. Căutarea în înțelesul conținutului se activează la provizionarea serviciului de embeddings."
            />
          ) : (
            <SemanticStatePanel
              glyph="◍"
              title="Căutarea nu a reușit"
              description="A apărut o problemă temporară. Încearcă din nou — filtrarea după titlu rămâne disponibilă."
            />
          )}
        </ScrollView>
      ) : isLoading ? (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <SkeletonState />
        </ScrollView>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor="rgba(255,255,255,0.4)"
            />
          }
        >
          {visibleArticles.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyText}>
                {query.trim() ? "Niciun titlu nu se potrivește" : "No articles found"}
              </Text>
            </View>
          ) : (
            visibleArticles.map((article) => <ArticleCard key={article.id} item={article} />)
          )}
        </ScrollView>
      )}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  // Semantic search (approved design — monochrome, glass, pill)
  searchWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.base,
    paddingVertical: 10,
    overflow: "hidden",
  },
  searchGlyph: { fontSize: 15, color: colors.text3 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text1, padding: 0 },
  searchHint: { fontSize: 11, color: colors.text3 },
  searchClear: { fontSize: 15, color: colors.text2, paddingHorizontal: 2 },

  semCount: { fontSize: 12, color: colors.text3, marginBottom: spacing.md },
  semCard: {
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.base,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  semCardShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  semHead: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  semTitle: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text1 },
  semSim: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0, marginTop: 3 },
  semBar: {
    width: 44,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  semBarFill: { height: "100%", backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 2 },
  semPct: { fontSize: 11, color: colors.text3, fontVariant: ["tabular-nums"] },
  semExcerpt: { fontSize: 13, lineHeight: 19, color: colors.text2, marginTop: spacing.sm },
  semFoot: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
  },
  semMeta: { fontSize: 11, color: colors.text3 },
  semOpen: { fontSize: 13, fontWeight: "600", color: colors.text1 },

  semState: {
    alignItems: "center",
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    overflow: "hidden",
  },
  semStateGlyph: { fontSize: 22, color: colors.text3 },
  semStateTitle: { fontSize: 15, fontWeight: "600", color: colors.text1, marginTop: spacing.sm },
  semStateDesc: {
    fontSize: 13,
    color: colors.text2,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  backBtn: { paddingVertical: 6, paddingRight: 8 },
  backText: { ...t.subhead, color: colors.text2 },
  headerTitle: {
    flex: 1,
    ...t.headline,
    color: colors.text1,
    textAlign: "center",
  },

  metaScroll: { marginHorizontal: -spacing.lg },
  metaStrip: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  metaChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: "center",
    minWidth: 72,
    overflow: "hidden",
    position: "relative",
  },
  metaChipShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  metaChipValue: { ...t.footnote, fontWeight: "700", color: colors.text1, marginBottom: 2 },
  metaChipLabel: { ...t.caption2, color: colors.text3 },

  filterScroll: { marginHorizontal: -spacing.lg, marginBottom: spacing.sm },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.glass2,
    borderColor: "rgba(255,255,255,0.22)",
  },
  filterChipText: { ...t.footnote, fontWeight: "600", color: colors.text3 },
  filterChipTextActive: { color: colors.text1 },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    gap: spacing.xs,
  },

  articleCard: {
    padding: spacing.md,
    marginBottom: 8,
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
  },
  articleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  typeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  typeGlyph: { fontSize: 16 },
  articleInfo: { flex: 1, gap: 4, minWidth: 0 },
  articleTopRow: { flexDirection: "row", alignItems: "flex-start" },
  pinDot: { ...t.caption2, color: colors.amber, marginTop: 1 },
  articleTitle: { flex: 1, ...t.footnote, fontWeight: "700", color: colors.text1, lineHeight: 18 },
  articleMeta: { ...t.caption2, color: colors.text3 },
  progressWrap: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  progressTrack: {
    flex: 1,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 1,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "rgba(255,255,255,0.6)", borderRadius: 1 },
  progressLabel: { ...t.caption2, color: colors.text3, minWidth: 28, textAlign: "right" },

  articleRight: { alignItems: "flex-end", gap: 6, flexShrink: 0 },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  typePillText: { ...t.caption2, fontWeight: "600" },
  readTime: { ...t.caption2, color: colors.text3 },

  emptyState: {
    padding: spacing.xl,
    alignItems: "center",
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
  },
  emptyText: { ...t.subhead, color: colors.text3 },

  skeletonWrap: {
    gap: spacing.sm,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    overflow: "hidden",
  },
})
