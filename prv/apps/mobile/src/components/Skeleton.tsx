import { useEffect, useRef } from "react"
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { radius } from "@/tokens"

interface SkeletonBoxProps {
  width?: number | `${number}%`
  height: number
  borderRadius?: number
  style?: StyleProp<ViewStyle>
}

export function SkeletonBox({
  width = "100%",
  height,
  borderRadius = radius.sm,
  style,
}: SkeletonBoxProps) {
  const opacity = useRef(new Animated.Value(0.35)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.08, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: "#ffffff", opacity }, style]}
    />
  )
}

export function SkeletonKPICard({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.kpiCard, style]}>
      <SkeletonBox height={28} width="60%" borderRadius={radius.xs} style={{ marginBottom: 8 }} />
      <SkeletonBox height={14} width="80%" borderRadius={radius.xs} style={{ marginBottom: 4 }} />
      <SkeletonBox height={12} width="50%" borderRadius={radius.xs} />
    </View>
  )
}

export function SkeletonRow({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.row, style]}>
      <SkeletonBox width={36} height={36} borderRadius={18} />
      <View style={styles.rowText}>
        <SkeletonBox height={14} width="55%" borderRadius={radius.xs} style={{ marginBottom: 6 }} />
        <SkeletonBox height={12} width="80%" borderRadius={radius.xs} />
      </View>
    </View>
  )
}

export function SkeletonCard({
  height = 80,
  style,
}: {
  height?: number
  style?: StyleProp<ViewStyle>
}) {
  return <SkeletonBox height={height} borderRadius={radius.card} style={style} />
}

const styles = StyleSheet.create({
  kpiCard: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  rowText: {
    flex: 1,
  },
})
