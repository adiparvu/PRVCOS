import { Tabs } from "expo-router"
import { PublicTabBar } from "@/components/PublicTabBar"

export default function PublicLayout() {
  return (
    <Tabs tabBar={(props) => <PublicTabBar {...props} />} screenOptions={{ headerShown: false }} />
  )
}
