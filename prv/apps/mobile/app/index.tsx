import { Redirect } from "expo-router"

// The initial URL "/" matches no route in this app — every screen lives under a
// route group — so expo-router briefly paints its built-in "Unmatched Route"
// error before the root layout's auth effect redirects. This entry point makes
// the first frame deterministic: guests continue to the public app, and the
// root layout still moves authenticated users on to their own home.
export default function Index() {
  return <Redirect href="/(public)/home" />
}
