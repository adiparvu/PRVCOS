import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { AppearanceProvider, APPEARANCE_SCRIPT } from "@prv/ui"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "PRV — Company Operating System",
    template: "%s · PRV",
  },
  description: "The complete operating system for modern companies.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Sets data-theme + data-glass before first paint — zero flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--prv-bg)] text-[var(--prv-text-1)]">
        {/* Syncs to /api/preferences automatically on change */}
        <AppearanceProvider syncEndpoint="/api/preferences">{children}</AppearanceProvider>
      </body>
    </html>
  )
}
