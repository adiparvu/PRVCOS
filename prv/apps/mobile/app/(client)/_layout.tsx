import { Tabs } from "expo-router"
import { ClientTabBar } from "@/components/ClientTabBar"

export default function ClientLayout() {
  return (
    <Tabs tabBar={(props) => <ClientTabBar {...props} />} screenOptions={{ headerShown: false }} />
  )
}
