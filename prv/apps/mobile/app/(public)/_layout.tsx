import { Tabs } from "expo-router"
import { PublicTabBar } from "@/components/PublicTabBar"

// Tabs are declared explicitly: without children expo-router orders static
// routes by name length, which put Account before Favorites.
export default function PublicLayout() {
  return (
    <Tabs tabBar={(props) => <PublicTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="shop" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="favorites" />
      <Tabs.Screen name="account" />
      {/* Pushed screens — routed, but never shown as tabs. */}
      <Tabs.Screen name="product" options={{ href: null }} />
      <Tabs.Screen name="cart" options={{ href: null }} />
      <Tabs.Screen name="quote" options={{ href: null }} />
    </Tabs>
  )
}
