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

type SupplierStatus = "Active" | "Inactive" | "Pending"

interface SupplierMeta {
  total: number
  active: number
  pendingReview: number
}

interface SupplierScorecard {
  quality: number
  delivery: number
  price: number
  communication: number
}

interface Supplier {
  id: string
  name: string
  category: string
  city: string | null
  country: string | null
  status: SupplierStatus
  score: number | null
  scorecard: SupplierScorecard | null
}

interface SuppliersData {
  meta: SupplierMeta
  suppliers: Supplier[]
}

// ─── Data hook ────────────────────────────────────────────────────────────────

function useSuppliersMobile() {
  const { session } = useAuthStore()
  return useQuery<SuppliersData>({
    queryKey: ["mobile-suppliers"],
    queryFn: async () => {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/suppliers?limit=30`, {
        headers: { Authorization: `Bearer ${session?.token}` },
      })
      return res.json()
    },
    staleTime: 60_000,
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(status: SupplierStatus): string {
  switch (status) {
    case "Active":
      return colors.green
    case "Pending":
      return colors.amber
    case "Inactive":
      return colors.text3
  }
}

function statusBg(status: SupplierStatus): string {
  switch (status) {
    case "Active":
      return "rgba(48,209,88,0.12)"
    case "Pending":
      return "rgba(255,159,10,0.12)"
    case "Inactive":
      return colors.glass1
  }
}

type FilterChip = "All" | SupplierStatus

const FILTERS: FilterChip[] = ["All", "Active", "Inactive", "Pending"]

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

function ScorecardBar({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.scorecardRow}>
      <Text style={s.scorecardLabel}>{label}</Text>
      <View style={s.scorecardTrack}>
        <View style={[s.scorecardFill, { width: `${Math.min(value, 100)}%` }]} />
      </View>
      <Text style={s.scorecardPct}>{value}%</Text>
    </View>
  )
}

function SupplierCard({ item }: { item: Supplier }) {
  const [expanded, setExpanded] = useState(false)
  const initial = item.name.charAt(0).toUpperCase()
  const sc = statusColor(item.status)
  const sb = statusBg(item.status)
  const location = [item.city, item.country].filter(Boolean).join(", ") || "—"

  return (
    <GlassCard style={s.supplierCard}>
      <View style={s.cardShine} pointerEvents="none" />
      <TouchableOpacity
        style={s.supplierRow}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
      >
        {/* Left avatar */}
        <View style={s.supplierCircle}>
          <Text style={s.supplierInitial}>{initial}</Text>
        </View>

        {/* Center info */}
        <View style={s.supplierInfo}>
          <Text style={s.supplierName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={s.supplierCategory} numberOfLines={1}>
            {item.category}
          </Text>
          <Text style={s.supplierLocation} numberOfLines={1}>
            {location}
          </Text>
        </View>

        {/* Right side */}
        <View style={s.supplierRight}>
          <View style={[s.statusPill, { backgroundColor: sb }]}>
            <Text style={[s.statusPillText, { color: sc }]}>{item.status}</Text>
          </View>
          {item.score !== null && item.score > 0 ? (
            <View style={s.scoreChip}>
              <Text style={s.scoreChipText}>★ {item.score.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Expandable scorecard */}
      {expanded && item.scorecard ? (
        <View style={s.scorecard}>
          <View style={s.scorecardDivider} />
          <ScorecardBar label="Quality" value={item.scorecard.quality} />
          <ScorecardBar label="Delivery" value={item.scorecard.delivery} />
          <ScorecardBar label="Price" value={item.scorecard.price} />
          <ScorecardBar label="Communication" value={item.scorecard.communication} />
        </View>
      ) : null}
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

export default function SuppliersMobileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [filter, setFilter] = useState<FilterChip>("All")
  const { data, isLoading, refetch, isRefetching } = useSuppliersMobile()

  const filtered =
    filter === "All"
      ? (data?.suppliers ?? [])
      : (data?.suppliers ?? []).filter((s) => s.status === filter)

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Suppliers</Text>
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
          <MetaChip label="Active" value={data.meta.active} valueColor={colors.green} />
          <MetaChip
            label="Pending Review"
            value={data.meta.pendingReview}
            valueColor={colors.amber}
          />
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
              <Text style={s.emptyText}>No suppliers found</Text>
            </View>
          ) : (
            filtered.map((sup) => <SupplierCard key={sup.id} item={sup} />)
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

  // Supplier card
  supplierCard: {
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
  supplierRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  supplierCircle: {
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
  supplierInitial: {
    ...t.subhead,
    fontWeight: "700",
    color: colors.text2,
  },
  supplierInfo: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  supplierName: {
    ...t.footnote,
    fontWeight: "700",
    color: colors.text1,
  },
  supplierCategory: {
    ...t.caption2,
    color: colors.text2,
  },
  supplierLocation: {
    ...t.caption2,
    color: colors.text3,
  },
  supplierRight: {
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
  scoreChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,159,10,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,159,10,0.22)",
  },
  scoreChipText: {
    ...t.caption2,
    fontWeight: "700",
    color: colors.amber,
  },

  // Scorecard
  scorecard: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  scorecardDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginBottom: spacing.xs,
  },
  scorecardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  scorecardLabel: {
    ...t.caption2,
    color: colors.text3,
    width: 88,
  },
  scorecardTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
    overflow: "hidden",
  },
  scorecardFill: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 2,
  },
  scorecardPct: {
    ...t.caption2,
    color: colors.text3,
    width: 30,
    textAlign: "right",
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
