import { Tabs } from "expo-router"
import { View } from "react-native"
import { OfflineSyncPill } from "@/components/OfflineSyncPill"
import { TabBar } from "@/components/TabBar"

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => (
        <View pointerEvents="box-none">
          <OfflineSyncPill />
          <TabBar {...props} />
        </View>
      )}
      screenOptions={{ headerShown: false }}
    />
  )
}
