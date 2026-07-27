import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams, useRouter } from "expo-router"
import { ActivityIndicator } from "react-native"
import { useSiteReports } from "@/hooks/useSiteReports"
import { colors, radius, spacing, type as t } from "@/tokens"

// Read-only gallery of site-report photos, grouped by report day (preview
// approved 2026-07). Capturing photos from the phone is a separate slice —
// it reintroduces the iOS camera/photo permissions removed pre-App Store.

const GAP = 6
const COLS = 3
const TILE = (Dimensions.get("window").width - spacing.base * 2 - GAP * (COLS - 1)) / COLS

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "short",
  })
}

export default function ProjectPhotosScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data, isLoading } = useSiteReports(id)

  const withPhotos = (data?.reports ?? []).filter((r) => r.photos.length > 0)
  const totalPhotos = withPhotos.reduce((sum, r) => sum + r.photos.length, 0)

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.base,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.titleRow}>
          <Text style={s.title}>Site Photos</Text>
          {totalPhotos > 0 && (
            <Text style={s.count}>
              {totalPhotos} {totalPhotos === 1 ? "fotografie" : "fotografii"} · {withPhotos.length}{" "}
              {withPhotos.length === 1 ? "zi" : "zile"}
            </Text>
          )}
        </View>

        {isLoading ? (
          <View style={s.center}>
            <ActivityIndicator color={colors.text3} />
          </View>
        ) : withPhotos.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyShine} pointerEvents="none" />
            <Text style={s.emptyGlyph}>⊞</Text>
            <Text style={s.emptyTitle}>No site photos yet</Text>
            <Text style={s.emptyDesc}>
              Photos attached to site reports will appear here, grouped by day.
            </Text>
          </View>
        ) : (
          withPhotos.map((report) => (
            <View key={report.id}>
              <Text style={s.dayLabel}>
                {dayLabel(report.reportDate)} · {report.reportType.replace("_", " ")}
              </Text>
              <View style={s.grid}>
                {report.photos.map((url, i) => (
                  <View key={`${report.id}-${i}`} style={s.tile}>
                    <Image
                      source={{ uri: url }}
                      style={StyleSheet.absoluteFillObject}
                      resizeMode="cover"
                      accessibilityLabel={`Site photo ${i + 1}, ${dayLabel(report.reportDate)}`}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.base, paddingBottom: spacing.sm },
  backBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  backText: { ...t.footnote, color: colors.text1 },
  titleRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  title: { ...t.title2, color: colors.text1, letterSpacing: -0.5 },
  count: { ...t.caption1, color: colors.text3 },
  center: { paddingVertical: 60, alignItems: "center" },

  dayLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text3,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 2,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },

  empty: {
    marginTop: 16,
    alignItems: "center",
    padding: 26,
    borderRadius: 20,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: "hidden",
    position: "relative",
  },
  emptyShine: {
    position: "absolute",
    top: 0,
    left: 14,
    right: 14,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  emptyGlyph: { fontSize: 22, color: colors.text3 },
  emptyTitle: { ...t.headline, color: colors.text1, marginTop: 8 },
  emptyDesc: {
    ...t.footnote,
    color: colors.text2,
    marginTop: 5,
    textAlign: "center",
    lineHeight: 18,
  },
})
