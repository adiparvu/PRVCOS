import { useState } from "react"
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { GlassCard } from "@/components/Glass"
import { SkeletonRow } from "@/components/Skeleton"
import { useAuthStore } from "@/store/auth"
import { api } from "@/lib/api"
import { colors, radius, spacing, type as t } from "@/tokens"

// ─── Types ────────────────────────────────────────────────────────────────────

type ArticleType = "sop" | "policy" | "guide" | "faq"
type ArticleCategory = "operations" | "hr" | "finance" | "procurement" | "fleet" | "projects"

interface KnowledgeMeta {
  total: number
  sopCount: number
  recentlyUpdated: number
}

interface Article {
  id: string
  title: string
  type: ArticleType
  typeLabel: string
  category: ArticleCategory
  categoryLabel: string
  author: string
  updatedDate: string
  readMinutes: number
  views: number
  version: string | null
  isPinned: boolean
  readProgress: number
}

interface KnowledgeData {
  meta: KnowledgeMeta
  articles: Article[]
}

// ─── Data hook ────────────────────────────────────────────────────────────────

function useKnowledge(typeFilter?: ArticleType, categoryFilter?: ArticleCategory) {
  const sp = new URLSearchParams()
  if (typeFilter) sp.set("type", typeFilter)
  if (categoryFilter) sp.set("category", categoryFilter)
  const qs = sp.toString()

  return useQuery<KnowledgeData>({
    queryKey: ["mobile-knowledge", typeFilter, categoryFilter],
    queryFn: () => api.get<KnowledgeData>(`/api/mobile/knowledge${qs ? `?${qs}` : ""}`),
    staleTime: 60_000,
  })
}

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

function ArticleCard({ item }: { item: Article }) {
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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function KnowledgeMobileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [typeFilter, setTypeFilter] = useState<FilterKey>("all")
  const { data, isLoading, refetch, isRefetching } = useKnowledge(
    typeFilter === "all" ? undefined : typeFilter
  )

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

      {/* Meta strip */}
      {data?.meta ? (
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

      {/* List */}
      {isLoading ? (
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
          {(data?.articles ?? []).length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyText}>No articles found</Text>
            </View>
          ) : (
            (data?.articles ?? []).map((article) => <ArticleCard key={article.id} item={article} />)
          )}
        </ScrollView>
      )}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

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
