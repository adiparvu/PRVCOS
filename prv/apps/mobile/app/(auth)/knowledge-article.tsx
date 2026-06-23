import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useQuery } from "@tanstack/react-query"
import { useAuthStore } from "@/store/auth"
import { GlassCard } from "@/components/Glass"
import { colors, radius, type as t } from "@/tokens"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArticleDetail {
  id: string
  title: string
  type: string
  typeLabel: string
  category: string
  categoryLabel: string
  author: string
  updatedDate: string
  readMinutes: number
  views: number
  version: string | null
  isPinned: boolean
  readProgress: number
  content: string | null
  relatedArticles: Array<{
    id: string
    title: string
    typeLabel: string
    categoryLabel: string
    readMinutes: number
  }>
}

const TYPE_COLORS: Record<string, string> = {
  sop: colors.amber,
  policy: colors.red,
  guide: colors.green,
  faq: colors.text2,
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useArticleDetail(id: string) {
  const { session } = useAuthStore()
  return useQuery<ArticleDetail>({
    queryKey: ["knowledge-article", id],
    queryFn: async () => {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/mobile/knowledge/${id}`, {
        headers: { Authorization: `Bearer ${session?.token}` },
      })
      if (!res.ok) throw new Error("Failed to load article")
      return res.json() as Promise<ArticleDetail>
    },
    enabled: !!id,
    staleTime: 300_000,
    retry: 2,
  })
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function KnowledgeArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { data, isLoading, isError, refetch } = useArticleDetail(id ?? "")

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backArrow}>‹</Text>
          <Text style={s.backLabel}>Knowledge</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={colors.text3} />
        </View>
      ) : isError || !data ? (
        <View style={s.errorWrap}>
          <GlassCard style={s.errorCard}>
            <Text style={s.errorText}>Failed to load article.</Text>
            <TouchableOpacity style={s.retryBtn} onPress={() => void refetch()} activeOpacity={0.8}>
              <Text style={s.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Meta pills */}
          <View style={s.metaRow}>
            <View style={[s.typePill, { borderColor: TYPE_COLORS[data.type] ?? colors.border }]}>
              <Text style={[s.typePillText, { color: TYPE_COLORS[data.type] ?? colors.text3 }]}>
                {data.typeLabel}
              </Text>
            </View>
            <View style={s.categoryPill}>
              <Text style={s.categoryPillText}>{data.categoryLabel}</Text>
            </View>
            {data.isPinned ? (
              <View style={s.pinnedPill}>
                <Text style={s.pinnedText}>◈ Pinned</Text>
              </View>
            ) : null}
          </View>

          {/* Title */}
          <Text style={s.title}>{data.title}</Text>

          {/* Author / Meta */}
          <View style={s.authorRow}>
            <Text style={s.authorText}>By {data.author}</Text>
            <Text style={s.dotSep}>·</Text>
            <Text style={s.authorText}>{data.updatedDate}</Text>
            <Text style={s.dotSep}>·</Text>
            <Text style={s.authorText}>{data.readMinutes} min read</Text>
          </View>

          {/* Progress bar */}
          {data.readProgress > 0 ? (
            <View style={s.progressWrap}>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${data.readProgress}%` }]} />
              </View>
              <Text style={s.progressLabel}>{data.readProgress}% read</Text>
            </View>
          ) : null}

          {/* Content */}
          <GlassCard style={s.contentCard}>
            <Text style={s.bodyText}>{data.content ?? "No content available."}</Text>
          </GlassCard>

          {/* Version */}
          {data.version ? <Text style={s.versionText}>Version {data.version}</Text> : null}

          {/* Related articles */}
          {data.relatedArticles.length > 0 ? (
            <View style={s.relatedSection}>
              <Text style={s.relatedTitle}>Related Articles</Text>
              {data.relatedArticles.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={s.relatedCard}
                  activeOpacity={0.75}
                  onPress={() =>
                    router.push({ pathname: "/(auth)/knowledge-article", params: { id: a.id } })
                  }
                >
                  <View style={s.relatedShine} pointerEvents="none" />
                  <View style={{ flex: 1 }}>
                    <Text style={s.relatedLabel} numberOfLines={2}>
                      {a.title}
                    </Text>
                    <Text style={s.relatedMeta}>
                      {a.typeLabel} · {a.categoryLabel} · {a.readMinutes} min
                    </Text>
                  </View>
                  <Text style={s.relatedChevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  backArrow: { fontSize: 24, color: colors.text2, lineHeight: 26, marginTop: -2 },
  backLabel: { ...t.callout, color: colors.text2 },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  errorWrap: { flex: 1, padding: 16, justifyContent: "center" },
  errorCard: { alignItems: "center", gap: 12, padding: 20 },
  errorText: { ...t.callout, color: colors.text3 },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryBtnText: { ...t.callout, color: colors.text1 },

  content: { padding: 16, gap: 0 },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: colors.glass1,
  },
  typePillText: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass1,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pinnedPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass2,
  },
  pinnedText: { fontSize: 11, fontWeight: "600", color: colors.text2 },

  title: { ...t.title2, color: colors.text1, marginBottom: 12, lineHeight: 30 },

  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 16,
  },
  authorText: { ...t.footnote, color: colors.text3 },
  dotSep: { ...t.footnote, color: colors.text4 },

  progressWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.glass2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: colors.green,
  },
  progressLabel: { ...t.caption2, color: colors.text3 },

  contentCard: { marginBottom: 12 },
  bodyText: { ...t.body, color: colors.text2, lineHeight: 26 },

  versionText: { ...t.caption2, color: colors.text4, marginBottom: 20, textAlign: "right" },

  relatedSection: { marginTop: 8 },
  relatedTitle: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  relatedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.glass1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    position: "relative",
    overflow: "hidden",
  },
  relatedShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  relatedLabel: { ...t.subhead, color: colors.text1, marginBottom: 3 },
  relatedMeta: { ...t.caption2, color: colors.text4 },
  relatedChevron: { fontSize: 20, color: colors.text4, lineHeight: 22 },
})
