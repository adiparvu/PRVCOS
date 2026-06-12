import type { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    default: "Client Portal · PRV",
    template: "%s · PRV Portal",
  },
  robots: { index: false, follow: false },
}

export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255,255,255,0.04) 0%, transparent 70%)",
        }}
      />
      {children}
    </div>
  )
}
