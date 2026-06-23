import { useState } from "react"
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { GlassCard } from "@/components/Glass"
import { SkeletonRow } from "@/components/Skeleton"
import { useAuthStore } from "@/store/auth"
import { colors, radius, spacing, type as t } from "@/tokens"

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolStatus = "Available" | "In Use" | "Maintenance" | "Missing"

interface ToolMeta {
  total: number
  inUse: number
  inService: number
  missing: number
}

interface Tool {
  id: string
  name: string
  model: string | null
  category: string
  status: ToolStatus
  assignedTo: string | null
  site: string | null
  utilisationPct: number | null
}

interface ToolsData {
  meta: ToolMeta
  tools: Tool[]
}

// ─── Data hook ────────────────────────────────────────────────────────────────

function useToolsMobile() {
  const { session } = useAuthStore()
  return useQuery<ToolsData>({
    queryKey: ["mobile-tools"],
    queryFn: async () => {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/mobile/tools`, {
        headers: { Authorization: `Bearer ${session?.token}` },
      })
      return res.json()
    },
    staleTime: 60_000,
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_GLYPH: Record<string, string> = {
  power: "◈",
  hand: "◎",
  measuring: "⊞",
  safety: "▪",
  cutting: "◉",
  lifting: "⊡",
  default: "◈",
}

function categoryGlyph(cat: string): string {
  const key = cat.toLowerCase()
  for (const k of Object.keys(CATEGORY_GLYPH)) {
    if (key.includes(k)) return CATEGORY_GLYPH[k]!
  }
  return CATEGORY_GLYPH.default!
}

function statusColor(status: ToolStatus): string {
  switch (status) {
    case "Available":
      return colors.green
    case "In Use":
      return colors.amber
    case "Maintenance":
      return colors.text3
    case "Missing":
      return colors.red
  }
}

function statusBg(status: ToolStatus): string {
  switch (status) {
    case "Available":
      return "rgba(48,209,88,0.12)"
    case "In Use":
      return "rgba(255,159,10,0.12)"
    case "Maintenance":
      return colors.glass1
    case "Missing":
      return "rgba(255,69,58,0.12)"
  }
}

type FilterChip = "All" | ToolStatus

const FILTERS: FilterChip[] = ["All", "Available", "In Use", "Maintenance", "Missing"]

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

function FilterChips({
  active,
  onChange,
}: {
  active: FilterChip
  onChange: (f: FilterChip) => void
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.filterRow}
      style={s.filterScroll}
    >
      {FILTERS.map((f) => (
        <TouchableOpacity
          key={f}
          style={[s.filterChip, active === f && s.filterChipActive]}
          onPress={() => onChange(f)}
          activeOpacity={0.75}
        >
          <Text style={[s.filterChipText, active === f && s.filterChipTextActive]}>{f}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

function ToolCard({ item }: { item: Tool }) {
  const glyph = categoryGlyph(item.category)
  const sc = statusColor(item.status)
  const sb = statusBg(item.status)
  const sub = item.assignedTo ?? item.site ?? "—"

  return (
    <GlassCard style={s.toolCard}>
      <View style={s.cardShine} pointerEvents="none" />
      <View style={s.toolRow}>
        {/* Left icon */}
        <View style={s.toolCircle}>
          <Text style={s.toolGlyph}>{glyph}</Text>
        </View>

        {/* Center info */}
        <View style={s.toolInfo}>
          <Text style={s.toolName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.model ? (
            <Text style={s.toolModel} numberOfLines={1}>
              {item.model}
            </Text>
          ) : null}
          <Text style={s.toolSub} numberOfLines={1}>
            {sub}
          </Text>
        </View>

        {/* Right side */}
        <View style={s.toolRight}>
          <View style={[s.statusPill, { backgroundColor: sb }]}>
            <Text style={[s.statusPillText, { color: sc }]}>{item.status}</Text>
          </View>
          {item.utilisationPct !== null && item.utilisationPct > 0 ? (
            <Text style={s.utilisationText}>{item.utilisationPct}% util</Text>
          ) : null}
        </View>
      </View>
    </GlassCard>
  )
}

function SkeletonState() {
  return (
    <View style={s.skeletonWrap}>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ToolsMobileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [filter, setFilter] = useState<FilterChip>("All")
  const { data, isLoading, refetch, isRefetching } = useToolsMobile()

  const filtered =
    filter === "All"
      ? (data?.tools ?? [])
      : (data?.tools ?? []).filter((tool) => tool.status === filter)

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Tools</Text>
        <TouchableOpacity style={s.searchBtn} activeOpacity={0.75}>
          <Text style={s.searchBtnText}>⌕</Text>
        </TouchableOpacity>
      </View>

      {/* Meta strip */}
      {data?.meta ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.metaStrip}
          style={s.metaScroll}
        >
          <MetaChip label="Total" value={data.meta.total} />
          <MetaChip label="In Use" value={data.meta.inUse} valueColor={colors.amber} />
          <MetaChip label="In Service" value={data.meta.inService} />
          <MetaChip label="Missing" value={data.meta.missing} valueColor={colors.red} />
        </ScrollView>
      ) : null}

      {/* Filter chips */}
      <FilterChips active={filter} onChange={setFilter} />

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
          {filtered.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyText}>No tools found</Text>
            </View>
          ) : (
            filtered.map((tool) => <ToolCard key={tool.id} item={tool} />)
          )}
        </ScrollView>
      )}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  backBtn: {
    paddingVertical: 6,
    paddingRight: 8,
  },
  backText: {
    ...t.subhead,
    color: colors.text2,
  },
  headerTitle: {
    flex: 1,
    ...t.headline,
    color: colors.text1,
    textAlign: "center",
  },
  searchBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnText: {
    fontSize: 18,
    color: colors.text1,
  },

  // Meta strip
  metaScroll: {
    marginHorizontal: -spacing.lg,
  },
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
  metaChipValue: {
    ...t.footnote,
    fontWeight: "700",
    color: colors.text1,
    marginBottom: 2,
  },
  metaChipLabel: {
    ...t.caption2,
    color: colors.text3,
  },

  // Filter chips
  filterScroll: {
    marginHorizontal: -spacing.lg,
    marginBottom: spacing.sm,
  },
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
  filterChipText: {
    ...t.footnote,
    fontWeight: "600",
    color: colors.text3,
  },
  filterChipTextActive: {
    color: colors.text1,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    gap: spacing.xs,
  },

  // Tool card
  toolCard: {
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
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  toolCircle: {
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
  toolGlyph: {
    fontSize: 16,
    color: colors.text2,
  },
  toolInfo: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  toolName: {
    ...t.footnote,
    fontWeight: "700",
    color: colors.text1,
  },
  toolModel: {
    ...t.caption2,
    color: colors.text2,
  },
  toolSub: {
    ...t.caption2,
    color: colors.text3,
  },
  toolRight: {
    alignItems: "flex-end",
    gap: 5,
    flexShrink: 0,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusPillText: {
    ...t.caption2,
    fontWeight: "600",
  },
  utilisationText: {
    ...t.caption2,
    color: colors.text3,
  },

  // Empty
  emptyState: {
    padding: spacing.xl,
    alignItems: "center",
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
  },
  emptyText: {
    ...t.subhead,
    color: colors.text3,
  },

  // Skeleton
  skeletonWrap: {
    gap: spacing.sm,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    overflow: "hidden",
  },
})
