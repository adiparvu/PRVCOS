import { BlurView } from "expo-blur"
import { type ReactNode } from "react"
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { colors, radius } from "@/tokens"

interface GlassProps {
  children: ReactNode
  level?: 1 | 2 | 3
  style?: StyleProp<ViewStyle>
}

// Tiered glass surface — maps to the 3 blur/opacity levels in the design system.
export function Glass({ children, level = 1, style }: GlassProps) {
  const intensity = level === 1 ? 32 : level === 2 ? 48 : 64

  return (
    <BlurView intensity={intensity} tint="dark" style={[styles.base, styles[`l${level}`], style]}>
      {/* Top specular shine */}
      <View style={styles.shine} pointerEvents="none" />
      {children}
    </BlurView>
  )
}

// Convenience card — level 1 with card radius.
export function GlassCard({ children, style }: Omit<GlassProps, "level">) {
  return (
    <Glass level={1} style={[styles.card, style]}>
      {children}
    </Glass>
  )
}

// Full-screen sheet surface — level 2 with sheet radius.
export function GlassSheet({ children, style }: Omit<GlassProps, "level">) {
  return (
    <Glass level={2} style={[styles.sheet, style]}>
      {children}
    </Glass>
  )
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  l1: { backgroundColor: colors.glass1 },
  l2: { backgroundColor: colors.glass2 },
  l3: { backgroundColor: colors.glass3 },
  shine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
    zIndex: 1,
  },
  card: {
    borderRadius: radius.card,
  },
  sheet: {
    borderRadius: radius.sheet,
  },
})
