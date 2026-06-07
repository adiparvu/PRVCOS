import { BlurView } from "expo-blur"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs"
import { colors, radius } from "@/tokens"

const TAB_META: Record<string, { icon: string; label: string }> = {
  command: { icon: "⌂", label: "Command" },
  operations: { icon: "⊞", label: "Ops" },
  people: { icon: "◎", label: "People" },
  finance: { icon: "⟁", label: "Finance" },
  intelligence: { icon: "✦", label: "Intel" },
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.wrapper, { bottom: Math.max(insets.bottom, 16) }]}>
      <BlurView intensity={48} tint="dark" style={styles.bar}>
        {/* Top specular shine */}
        <View style={styles.shine} pointerEvents="none" />

        {state.routes.map((route, index) => {
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
              style={styles.tab}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
            >
              <Text style={[styles.icon, isFocused && styles.iconActive]}>{meta.icon}</Text>
              <Text style={[styles.label, isFocused && styles.labelActive]}>{meta.label}</Text>
              {isFocused && <View style={styles.dot} />}
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
    height: 72,
    zIndex: 100,
  },
  bar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    borderRadius: radius.tab,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.tabBar,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.7,
    shadowRadius: 48,
    elevation: 24,
  },
  shine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.shineTop,
    zIndex: 1,
    borderTopLeftRadius: radius.tab,
    borderTopRightRadius: radius.tab,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 3,
    minHeight: 56,
  },
  icon: {
    fontSize: 22,
    color: colors.text3,
    lineHeight: 26,
  },
  iconActive: {
    color: colors.text1,
  },
  label: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: colors.text3,
  },
  labelActive: {
    color: colors.text2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.text1,
  },
})
