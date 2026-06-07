import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
import { colors, radius, type } from "@/tokens"

interface KPICardProps {
  value: string
  label: string
  delta?: string | null
  deltaType?: "up" | "down" | "neutral"
  valueColor?: string
  style?: StyleProp<ViewStyle>
}

export function KPICard({
  value,
  label,
  delta,
  deltaType = "neutral",
  valueColor,
  style,
}: KPICardProps) {
  const deltaColor =
    deltaType === "up" ? colors.green : deltaType === "down" ? colors.red : colors.text3

  return (
    <View style={[styles.card, style]}>
      <View style={styles.shine} pointerEvents="none" />
      <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {delta ? <Text style={[styles.delta, { color: deltaColor }]}>{delta}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 13,
    backgroundColor: colors.glass1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    overflow: "hidden",
  },
  shine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
  },
  value: {
    ...type.title2,
    color: colors.text1,
    marginBottom: 3,
  },
  label: {
    ...type.caption1,
    color: colors.text3,
    fontWeight: "500",
  },
  delta: {
    ...type.caption2,
    marginTop: 5,
  },
})
