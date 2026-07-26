import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "PRV Renovations — Renovări complete, București & Ilfov",
    template: "%s · PRV Renovations",
  },
  description:
    "Renovări la cheie pentru apartamente, case și spații comerciale. Echipe proprii, predare la termen, deviz gratuit.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
}

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ro" data-theme="dark">
      <body>{children}</body>
    </html>
  )
}
