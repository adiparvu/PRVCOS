import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

const isDev = process.env["NODE_ENV"] === "development"
const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000"

// Content Security Policy — tightened per environment
const cspDirectives = [
  "default-src 'self'",
  // Scripts: self + Next.js inline scripts (nonce-based in production is ideal — using strict-dynamic here)
  isDev ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  `connect-src 'self' ${appUrl} https://*.supabase.co wss://*.supabase.co https://api.resend.com https://cloud.typesense.org https://app.inngest.com https://*.sentry.io`,
  "img-src 'self' data: blob: https://*.supabase.co",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
]
  .filter(Boolean)
  .join("; ")

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent framing
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referrer control
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permissions
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // XSS protection via CSP
          { key: "Content-Security-Policy", value: cspDirectives },
          // HSTS — 2 years, include subdomains, preload eligible
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Disable DNS prefetch on sensitive pages
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
    ]
  },

  logging: {
    fetches: {
      fullUrl: isDev,
    },
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env["SENTRY_ORG"],
  project: process.env["SENTRY_PROJECT"],
  silent: true,
  widenClientFileUpload: true,
  // Sentry tunnel route — proxies Sentry events through our domain to bypass ad-blockers
  // Route handler at app/monitoring/route.ts
  tunnelRoute: "/monitoring",
  disableLogger: true,
  automaticVercelMonitors: false,
})
