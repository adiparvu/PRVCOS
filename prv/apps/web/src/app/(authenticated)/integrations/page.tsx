import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { GlassCard, SectionLabel } from "@/app/(authenticated)/dashboard/_shared"

export const dynamic = "force-dynamic"
export const metadata = { title: "Integrations · PRV" }

const INTEGRATIONS = [
  {
    name: "Supabase",
    category: "Database",
    desc: "PostgreSQL 16 primary + read replica, realtime subscriptions",
    ok: true,
  },
  {
    name: "Supabase Auth",
    category: "Auth",
    desc: "Passkeys, MFA, Magic Link, OAuth — Zero Trust session management",
    ok: true,
  },
  {
    name: "Supabase Storage",
    category: "Storage",
    desc: "File storage with signed URLs and bucket-level access control",
    ok: true,
  },
  {
    name: "Upstash Redis",
    category: "Cache",
    desc: "Rate limiting, session cache, distributed job queues",
    ok: true,
  },
  {
    name: "Inngest",
    category: "Background Jobs",
    desc: "5-priority async job processing with retries and dead-letter queues",
    ok: true,
  },
  {
    name: "Typesense",
    category: "Search",
    desc: "Scoped full-text search per company with RBAC-filtered results",
    ok: true,
  },
  {
    name: "Resend",
    category: "Email",
    desc: "Transactional email delivery — notifications, invoices, alerts",
    ok: true,
  },
  {
    name: "Sentry",
    category: "Monitoring",
    desc: "Error tracking, performance profiling, session replays",
    ok: true,
  },
] as const

const CATEGORY_COLORS: Record<string, string> = {
  Database: "rgba(100,210,255,0.85)",
  Auth: "rgba(191,90,242,0.85)",
  Storage: "rgba(255,179,64,0.85)",
  Cache: "rgba(80,220,120,0.85)",
  "Background Jobs": "rgba(255,159,10,0.85)",
  Search: "rgba(100,210,255,0.85)",
  Email: "rgba(255,99,90,0.85)",
  Monitoring: "rgba(255,179,64,0.85)",
}

export default async function IntegrationsPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-[13px] font-medium mb-0.5" style={{ color: "var(--prv-text-3)" }}>
          PRV
        </p>
        <h1
          className="text-[26px] font-semibold tracking-tight leading-tight"
          style={{ color: "var(--prv-text-1)" }}
        >
          Integrations
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--prv-text-3)" }}>
          Connected services &amp; external systems
        </p>
      </div>

      {/* Status summary */}
      <GlassCard className="mb-3.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold" style={{ color: "var(--prv-text-1)" }}>
              All systems operational
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--prv-text-3)" }}>
              {INTEGRATIONS.length} integrations active
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-[8px] h-[8px] rounded-full"
              style={{ background: "rgba(80,220,120,0.9)" }}
            />
            <span className="text-[12px] font-semibold" style={{ color: "rgba(80,220,120,0.9)" }}>
              Healthy
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Integrations grid */}
      <div className="grid grid-cols-1 gap-3">
        {INTEGRATIONS.map((integration) => (
          <GlassCard key={integration.name}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p
                    className="text-[14px] font-semibold"
                    style={{ color: "var(--prv-text-1)" }}
                  >
                    {integration.name}
                  </p>
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-[6px]"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      color: CATEGORY_COLORS[integration.category] ?? "var(--prv-text-3)",
                    }}
                  >
                    {integration.category}
                  </span>
                </div>
                <p className="text-[12px]" style={{ color: "var(--prv-text-3)" }}>
                  {integration.desc}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span
                  className="w-[6px] h-[6px] rounded-full"
                  style={{ background: "rgba(80,220,120,0.9)" }}
                />
                <span className="text-[11px]" style={{ color: "rgba(80,220,120,0.75)" }}>
                  Connected
                </span>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
