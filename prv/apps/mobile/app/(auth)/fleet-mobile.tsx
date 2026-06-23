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

type VehicleStatus = "Active" | "Service" | "Idle" | "Unavailable"
type VehicleType = "car" | "van" | "truck" | "motorcycle"

interface VehicleMeta {
  total: number
  active: number
  inService: number
  idle: number
}

interface Vehicle {
  id: string
  plateNumber: string
  model: string
  type: VehicleType
  status: VehicleStatus
  assignment: string | null
  site: string | null
  fuelPct: number | null
}

interface FleetData {
  meta: VehicleMeta
  vehicles: Vehicle[]
}

// ─── Data hook ────────────────────────────────────────────────────────────────

function useFleetMobile() {
  const { session } = useAuthStore()
  return useQuery<FleetData>({
    queryKey: ["mobile-fleet"],
    queryFn: async () => {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/fleet?limit=30`, {
        headers: { Authorization: `Bearer ${session?.token}` },
      })
      return res.json()
    },
    staleTime: 60_000,
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_GLYPH: Record<VehicleType, string> = {
  car: "◯",
  van: "⊡",
  truck: "⬛",
  motorcycle: "◈",
}

function statusColor(status: VehicleStatus): string {
  switch (status) {
    case "Active":
      return colors.green
    case "Service":
      return colors.amber
    case "Idle":
      return colors.text3
    case "Unavailable":
      return colors.red
  }
}

function statusBg(status: VehicleStatus): string {
  switch (status) {
    case "Active":
      return "rgba(48,209,88,0.12)"
    case "Service":
      return "rgba(255,159,10,0.12)"
    case "Idle":
      return colors.glass1
    case "Unavailable":
      return "rgba(255,69,58,0.12)"
  }
}

type FilterChip = "All" | VehicleStatus

const FILTERS: FilterChip[] = ["All", "Active", "Service", "Idle", "Unavailable"]

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

function VehicleCard({ item }: { item: Vehicle }) {
  const glyph = TYPE_GLYPH[item.type] ?? "◯"
  const sc = statusColor(item.status)
  const sb = statusBg(item.status)
  const sub = item.assignment ?? item.site ?? "—"

  return (
    <GlassCard style={s.vehicleCard}>
      <View style={s.cardShine} pointerEvents="none" />
      <View style={s.vehicleRow}>
        {/* Left icon */}
        <View style={s.vehicleCircle}>
          <Text style={s.vehicleGlyph}>{glyph}</Text>
        </View>

        {/* Center info */}
        <View style={s.vehicleInfo}>
          <Text style={s.vehiclePlate}>{item.plateNumber}</Text>
          <Text style={s.vehicleModel} numberOfLines={1}>
            {item.model}
          </Text>
          <Text style={s.vehicleSite} numberOfLines={1}>
            {sub}
          </Text>
        </View>

        {/* Right side */}
        <View style={s.vehicleRight}>
          <View style={[s.statusPill, { backgroundColor: sb }]}>
            <Text style={[s.statusPillText, { color: sc }]}>{item.status}</Text>
          </View>
          {item.fuelPct !== null ? <Text style={s.fuelText}>⊞ {item.fuelPct}%</Text> : null}
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

export default function FleetMobileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [filter, setFilter] = useState<FilterChip>("All")
  const { data, isLoading, refetch, isRefetching } = useFleetMobile()

  const filtered =
    filter === "All"
      ? (data?.vehicles ?? [])
      : (data?.vehicles ?? []).filter((v) => v.status === filter)

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Fleet</Text>
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
          <MetaChip label="In Service" value={data.meta.inService} valueColor={colors.amber} />
          <MetaChip label="Idle" value={data.meta.idle} />
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
              <Text style={s.emptyText}>No vehicles found</Text>
            </View>
          ) : (
            filtered.map((v) => <VehicleCard key={v.id} item={v} />)
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

  // Vehicle card
  vehicleCard: {
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
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  vehicleCircle: {
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
  vehicleGlyph: {
    fontSize: 16,
    color: colors.text2,
  },
  vehicleInfo: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  vehiclePlate: {
    ...t.footnote,
    fontWeight: "700",
    color: colors.text1,
  },
  vehicleModel: {
    ...t.caption2,
    color: colors.text2,
  },
  vehicleSite: {
    ...t.caption2,
    color: colors.text3,
  },
  vehicleRight: {
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
  fuelText: {
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
