import { BlurView } from "expo-blur"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs"
import { colors, radius } from "@/tokens"

const TAB_META: Record<string, { icon: string; label: string }> = {
  overview: { icon: "⌂", label: "Overview" },
  projects: { icon: "◈", label: "Projects" },
  invoices: { icon: "⟁", label: "Invoices" },
  documents: { icon: "◻", label: "Documents" },
  account: { icon: "◯", label: "Account" },
}

export function ClientTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.wrapper, { bottom: Math.max(insets.bottom, 16) }]}>
      <BlurView intensity={48} tint="dark" style={styles.bar}>
        <View style={styles.shine} pointerEvents="none" />

        {state.routes.map((route: { key: string; name: string }, index: number) => {
          const isFocused = state.index === index
          const meta = TAB_META[route.name] ?? { icon: "●", label: route.name }

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            })
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name)
            }
          }

          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key })
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.7}
              style={[styles.tab, isFocused && styles.tabActive]}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={descriptors[route.key]?.options.tabBarAccessibilityLabel}
            >
              <Text style={[styles.icon, isFocused && styles.iconActive]}>{meta.icon}</Text>
              <Text style={[styles.label, isFocused && styles.labelActive]}>{meta.label}</Text>
            </TouchableOpacity>
          )
        })}
      </BlurView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 12,
    right: 12,
    height: 64,
    zIndex: 100,
  },
  bar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.09)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.7,
    shadowRadius: 40,
    elevation: 24,
  },
  shine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.24)",
    zIndex: 1,
    borderTopLeftRadius: radius.pill,
    borderTopRightRadius: radius.pill,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 3,
    minHeight: 56,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  icon: {
    fontSize: 20,
    color: colors.text3,
    lineHeight: 24,
  },
  iconActive: {
    color: colors.text1,
  },
  label: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.4)",
  },
  labelActive: {
    color: colors.text2,
  },
})
