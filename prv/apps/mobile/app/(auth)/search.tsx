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
import { useState, useEffect, useRef } from "react"
import { useSearch } from "@/hooks/useSearch"
import { colors, radius, spacing } from "@/tokens"

// ─── Types ────────────────────────────────────────────────────────────────────

type Scope = "all" | "projects" | "people" | "clients" | "finance"

const SCOPES: { key: Scope; label: string }[] = [
  { key: "all", label: "All" },
  { key: "projects", label: "Projects" },
  { key: "people", label: "People" },
  { key: "clients", label: "Clients" },
  { key: "finance", label: "Finance" },
]

const ENTITY_ICON: Record<string, { icon: string; bg: string; fg: string }> = {
  project: { icon: "◎", bg: "rgba(100,210,255,0.10)", fg: "#64d2ff" },
  person: { icon: "⊙", bg: "rgba(255,255,255,0.08)", fg: "rgba(255,255,255,0.65)" },
  client: { icon: "◇", bg: "rgba(191,90,242,0.10)", fg: "#bf5af2" },
  invoice: { icon: "⊕", bg: "rgba(48,209,88,0.10)", fg: "#30d158" },
  order: { icon: "◈", bg: "rgba(255,214,10,0.10)", fg: "#ffd60a" },
}

const STATUS_BADGE: Record<string, { bg: string; fg: string }> = {
  active: { bg: "rgba(48,209,88,0.12)", fg: "#30d158" },
  in_progress: { bg: "rgba(100,210,255,0.10)", fg: "#64d2ff" },
  confirmed: { bg: "rgba(100,210,255,0.10)", fg: "#64d2ff" },
  paid: { bg: "rgba(48,209,88,0.12)", fg: "#30d158" },
  sent: { bg: "rgba(255,214,10,0.12)", fg: "#ffd60a" },
  overdue: { bg: "rgba(255,69,58,0.12)", fg: "#ff453a" },
  pending: { bg: "rgba(255,255,255,0.07)", fg: colors.text3 },
  delivered: { bg: "rgba(48,209,88,0.12)", fg: "#30d158" },
  prospect: { bg: "rgba(255,214,10,0.10)", fg: "#ffd60a" },
}

const BROWSE_CATS = [
  { icon: "◎", label: "Projects", fg: "#64d2ff", scope: "projects" as Scope },
  { icon: "⊙", label: "People", fg: "rgba(255,255,255,0.60)", scope: "people" as Scope },
  { icon: "◇", label: "Clients", fg: "#bf5af2", scope: "clients" as Scope },
  { icon: "⊕", label: "Finance", fg: "#30d158", scope: "finance" as Scope },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) {
    return <Text style={s.resultTitle}>{text}</Text>
  }
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const parts = text.split(new RegExp(`(${escaped})`, "gi"))
  const ql = query.toLowerCase()
  return (
    <Text style={s.resultTitle}>
      {parts.map((part, i) =>
        part.toLowerCase() === ql ? (
          <Text key={i} style={s.resultTitleHl}>
            {part}
          </Text>
        ) : (
          part
        )
      )}
    </Text>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHead({ icon, title, count }: { icon: string; title: string; count: number }) {
  return (
    <View style={s.sectionHead}>
      <Text style={s.sectionIcon}>{icon}</Text>
      <Text style={s.sectionTitle}>{title}</Text>
      <Text style={s.sectionCount}>
        {count} result{count !== 1 ? "s" : ""}
      </Text>
    </View>
  )
}

function ResultRow({
  type,
  title,
  subtitle,
  meta,
  status,
  query,
  onPress,
}: {
  type: keyof typeof ENTITY_ICON
  title: string
  subtitle?: string | null
  meta?: string | null
  status?: string
  query: string
  onPress: () => void
}) {
  const ico = ENTITY_ICON[type]!
  const badge = status ? (STATUS_BADGE[status] ?? null) : null

  return (
    <TouchableOpacity style={s.resultRow} activeOpacity={0.7} onPress={onPress}>
      <View style={[s.resultIcon, { backgroundColor: ico.bg }]}>
        <Text style={[s.resultIconText, { color: ico.fg }]}>{ico.icon}</Text>
      </View>
      <View style={s.resultInfo}>
        <Highlight text={title} query={query} />
        {subtitle ? (
          <Text style={s.resultSub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={s.resultRight}>
        {meta ? <Text style={s.resultMeta}>{meta}</Text> : null}
        {badge ? (
          <View style={[s.resultBadge, { backgroundColor: badge.bg }]}>
            <Text style={[s.resultBadgeText, { color: badge.fg }]}>
              {status!.charAt(0).toUpperCase() + status!.slice(1).replace(/_/g, " ")}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const inputRef = useRef<TextInput>(null)

  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [scope, setScope] = useState<Scope>("all")
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const { data, isFetching } = useSearch(debouncedQuery, scope)

  const addRecent = (term: string) => {
    setRecentSearches((prev) => [term, ...prev.filter((s) => s !== term)].slice(0, 5))
  }

  const navigate = (pathname: string, id: string, term: string) => {
    addRecent(term)
    router.push({ pathname: pathname as any, params: { id } })
  }

  const isEmpty = query.length < 2
  const hasResults =
    data &&
    (data.results.projects.length > 0 ||
      data.results.people.length > 0 ||
      data.results.clients.length > 0 ||
      data.results.invoices.length > 0 ||
      data.results.orders.length > 0)
  const noResults = !isEmpty && !isFetching && data && !hasResults

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Search bar */}
      <View style={s.barWrap}>
        <View style={s.pill}>
          <View style={s.pillShine} pointerEvents="none" />
          <Text style={s.pillIcon}>⌕</Text>
          <TextInput
            ref={inputRef}
            style={s.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search projects, people, clients…"
            placeholderTextColor={colors.text3}
            autoFocus
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        <TouchableOpacity style={s.cancelBtn} activeOpacity={0.7} onPress={() => router.back()}>
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Scope chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scopeStrip}
      >
        {SCOPES.map((sc) => (
          <TouchableOpacity
            key={sc.key}
            style={[s.chip, scope === sc.key && s.chipActive]}
            activeOpacity={0.7}
            onPress={() => setScope(sc.key)}
          >
            <Text style={[s.chipText, scope === sc.key && s.chipTextActive]}>{sc.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        {/* Loading */}
        {isFetching && !isEmpty ? (
          <View style={s.loadingRow}>
            <ActivityIndicator color={colors.text3} size="small" />
          </View>
        ) : null}

        {/* Empty state */}
        {isEmpty ? (
          <>
            {recentSearches.length > 0 ? (
              <>
                <View style={s.sectionHead}>
                  <Text style={s.sectionIcon}>◴</Text>
                  <Text style={s.sectionTitle}>Recent</Text>
                  <TouchableOpacity onPress={() => setRecentSearches([])}>
                    <Text style={s.clearBtn}>Clear</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.card}>
                  <View style={s.cardShine} pointerEvents="none" />
                  {recentSearches.map((term, i) => (
                    <TouchableOpacity
                      key={term}
                      style={[s.recentRow, i === recentSearches.length - 1 && s.rowLast]}
                      activeOpacity={0.7}
                      onPress={() => setQuery(term)}
                    >
                      <View style={s.recentIcon}>
                        <Text style={s.recentIconText}>◴</Text>
                      </View>
                      <Text style={s.recentText}>{term}</Text>
                      <Text style={s.recentArrow}>›</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}

            <View style={s.sectionHead}>
              <Text style={s.sectionIcon}>◎</Text>
              <Text style={s.sectionTitle}>Browse</Text>
            </View>
            <View style={s.browseGrid}>
              {BROWSE_CATS.map((cat) => (
                <TouchableOpacity
                  key={cat.label}
                  style={s.browseTile}
                  activeOpacity={0.75}
                  onPress={() => setScope(cat.scope)}
                >
                  <View style={s.browseTileShine} pointerEvents="none" />
                  <Text style={[s.browseTileIcon, { color: cat.fg }]}>{cat.icon}</Text>
                  <Text style={s.browseTileLabel}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}

        {/* No results */}
        {noResults ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyIcon}>⌕</Text>
            <Text style={s.emptyTitle}>No results for "{debouncedQuery}"</Text>
            <Text style={s.emptySub}>Try a different search term or scope</Text>
          </View>
        ) : null}

        {/* Results */}
        {data && !isFetching ? (
          <>
            {/* Clients */}
            {(scope === "all" || scope === "clients") && data.results.clients.length > 0 ? (
              <>
                <SectionHead icon="◇" title="Clients" count={data.results.clients.length} />
                <View style={s.card}>
                  <View style={s.cardShine} pointerEvents="none" />
                  {data.results.clients.map((item, i) => (
                    <View
                      key={item.id}
                      style={i === data.results.clients.length - 1 ? s.rowLast : null}
                    >
                      <ResultRow
                        type="client"
                        title={item.title}
                        subtitle={item.subtitle}
                        status={item.status}
                        query={debouncedQuery}
                        onPress={() => navigate("/(auth)/client-detail", item.id, item.title)}
                      />
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {/* Projects */}
            {(scope === "all" || scope === "projects") && data.results.projects.length > 0 ? (
              <>
                <SectionHead icon="◎" title="Projects" count={data.results.projects.length} />
                <View style={s.card}>
                  <View style={s.cardShine} pointerEvents="none" />
                  {data.results.projects.map((item, i) => (
                    <View
                      key={item.id}
                      style={i === data.results.projects.length - 1 ? s.rowLast : null}
                    >
                      <ResultRow
                        type="project"
                        title={item.title}
                        subtitle={item.subtitle}
                        meta={item.meta}
                        status={item.status}
                        query={debouncedQuery}
                        onPress={() => navigate("/(auth)/project-detail", item.id, item.title)}
                      />
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {/* People */}
            {(scope === "all" || scope === "people") && data.results.people.length > 0 ? (
              <>
                <SectionHead icon="⊙" title="People" count={data.results.people.length} />
                <View style={s.card}>
                  <View style={s.cardShine} pointerEvents="none" />
                  {data.results.people.map((item, i) => (
                    <View
                      key={item.id}
                      style={i === data.results.people.length - 1 ? s.rowLast : null}
                    >
                      <ResultRow
                        type="person"
                        title={item.title}
                        subtitle={item.subtitle}
                        query={debouncedQuery}
                        onPress={() => navigate("/(auth)/employee-detail", item.id, item.title)}
                      />
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {/* Invoices */}
            {(scope === "all" || scope === "finance") && data.results.invoices.length > 0 ? (
              <>
                <SectionHead icon="⊕" title="Invoices" count={data.results.invoices.length} />
                <View style={s.card}>
                  <View style={s.cardShine} pointerEvents="none" />
                  {data.results.invoices.map((item, i) => (
                    <View
                      key={item.id}
                      style={i === data.results.invoices.length - 1 ? s.rowLast : null}
                    >
                      <ResultRow
                        type="invoice"
                        title={item.title}
                        meta={item.total}
                        status={item.status}
                        query={debouncedQuery}
                        onPress={() => navigate("/(auth)/invoice-detail", item.id, item.title)}
                      />
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {/* Orders */}
            {(scope === "all" || scope === "finance") && data.results.orders.length > 0 ? (
              <>
                <SectionHead icon="◈" title="Orders" count={data.results.orders.length} />
                <View style={s.card}>
                  <View style={s.cardShine} pointerEvents="none" />
                  {data.results.orders.map((item, i) => (
                    <View
                      key={item.id}
                      style={i === data.results.orders.length - 1 ? s.rowLast : null}
                    >
                      <ResultRow
                        type="order"
                        title={item.title}
                        meta={item.total}
                        status={item.status}
                        query={debouncedQuery}
                        onPress={() => navigate("/(auth)/order-detail", item.id, item.title)}
                      />
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // Bar
  barWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: 10,
    gap: 10,
  },
  pill: {
    flex: 1,
    height: 44,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 9,
    overflow: "hidden",
  },
  pillShine: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  pillIcon: { fontSize: 15, color: colors.text3 },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text1,
    letterSpacing: -0.1,
    paddingVertical: 0,
  },
  cancelBtn: { paddingHorizontal: 4, paddingVertical: 8 },
  cancelText: { fontSize: 15, fontWeight: "500", color: colors.text3 },

  // Scope
  scopeStrip: { paddingHorizontal: spacing.base, paddingBottom: 10, gap: 7 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  chipActive: { backgroundColor: "rgba(255,255,255,0.90)", borderColor: "transparent" },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.text3 },
  chipTextActive: { color: "#000" },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.base, gap: 6 },

  // Loading
  loadingRow: { alignItems: "center", paddingVertical: 24 },

  // Section head
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    paddingBottom: 6,
  },
  sectionIcon: { fontSize: 12, color: colors.text3 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.07,
  },
  sectionCount: { fontSize: 11, color: colors.text3, marginLeft: "auto" as any },
  clearBtn: { fontSize: 12, color: colors.text3, marginLeft: "auto" as any },

  // Glass card
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    overflow: "hidden",
  },
  cardShine: {
    position: "absolute",
    top: 0,
    left: 14,
    right: 14,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  rowLast: { borderBottomWidth: 0 },

  // Result row
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: 11,
  },
  resultIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  resultIconText: { fontSize: 14 },
  resultInfo: { flex: 1, minWidth: 0 },
  resultTitle: { fontSize: 13, fontWeight: "600", color: colors.text1 },
  resultTitleHl: { color: "#fff", fontWeight: "700" },
  resultSub: { fontSize: 11, color: colors.text3, marginTop: 2 },
  resultRight: { alignItems: "flex-end", gap: 4, flexShrink: 0 },
  resultMeta: { fontSize: 11, color: colors.text3 },
  resultBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.sm },
  resultBadgeText: { fontSize: 10, fontWeight: "700" },

  // Recent
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: 10,
  },
  recentIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    alignItems: "center",
    justifyContent: "center",
  },
  recentIconText: { fontSize: 13, color: colors.text3 },
  recentText: { flex: 1, fontSize: 13, color: colors.text2, fontWeight: "500" },
  recentArrow: { fontSize: 16, color: "rgba(255,255,255,0.20)" },

  // Browse grid
  browseGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  browseTile: {
    width: "47.5%" as any,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  browseTileShine: {
    position: "absolute",
    top: 0,
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  browseTileIcon: { fontSize: 18 },
  browseTileLabel: { fontSize: 13, fontWeight: "600", color: colors.text2 },

  // Empty
  emptyWrap: { alignItems: "center", paddingTop: 48, gap: 8 },
  emptyIcon: { fontSize: 30, color: colors.text3 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: colors.text3 },
  emptySub: { fontSize: 13, color: "rgba(255,255,255,0.20)", textAlign: "center" },
})
