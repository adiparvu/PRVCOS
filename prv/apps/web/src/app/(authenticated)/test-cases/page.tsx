import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@prv/auth"
import { GlassCard, SectionLabel } from "@/app/(authenticated)/dashboard/_shared"

export const dynamic = "force-dynamic"
export const metadata = { title: "Test Cases" }

const TEST_DOMAINS = [
  {
    domain: "Authentication",
    status: "Monitored",
    ok: true,
    cases: ["Login flow", "Session expiry", "MFA challenge", "Token refresh"],
  },
  {
    domain: "Orders & POS",
    status: "Monitored",
    ok: true,
    cases: ["Order creation", "Cart validation", "Payment capture", "Receipt generation"],
  },
  {
    domain: "Finance",
    status: "Monitored",
    ok: true,
    cases: ["Invoice generation", "Expense approval", "Payroll calculation", "Cash-flow report"],
  },
  {
    domain: "People & HR",
    status: "Monitored",
    ok: true,
    cases: ["Employee onboarding", "Shift scheduling", "Attendance logging", "Leave requests"],
  },
  {
    domain: "Projects & Renovation",
    status: "Monitored",
    ok: true,
    cases: ["Project creation", "Task assignment", "Progress tracking", "Milestone completion"],
  },
  {
    domain: "Intelligence & AI",
    status: "In Review",
    ok: false,
    cases: ["Anomaly detection", "Revenue forecast", "AI briefing", "Report generation"],
  },
  {
    domain: "Notifications",
    status: "Monitored",
    ok: true,
    cases: ["Push delivery", "In-app dispatch", "Quiet hours", "Batch dismiss"],
  },
  {
    domain: "Audit & Security",
    status: "Monitored",
    ok: true,
    cases: ["Gate chain validation", "Hash chain integrity", "Impersonation logging", "Rate limiting"],
  },
  {
    domain: "Procurement",
    status: "In Review",
    ok: false,
    cases: ["PO creation", "Supplier selection", "Approval workflow", "Delivery confirmation"],
  },
  {
    domain: "Documents",
    status: "Monitored",
    ok: true,
    cases: ["Upload & storage", "Version control", "Access permissions", "Search indexing"],
  },
]

export default async function TestCasesPage() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("prv_session")?.value
  if (!sessionId) redirect("/auth/login")

  try {
    await getSession(sessionId)
  } catch {
    redirect("/auth/login")
  }

  const monitored = TEST_DOMAINS.filter((d) => d.ok).length
  const inReview = TEST_DOMAINS.filter((d) => !d.ok).length

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1
          className="text-[22px] font-semibold tracking-tight"
          style={{ color: "var(--prv-text-1)" }}
        >
          Test Cases
        </h1>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(80,220,120,0.12)",
            color: "rgba(80,220,120,0.9)",
            border: "1px solid rgba(80,220,120,0.25)",
          }}
        >
          {TEST_DOMAINS.length} domains
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <GlassCard className="text-center py-3">
          <p className="text-[22px] font-bold" style={{ color: "rgba(80,220,120,0.9)" }}>
            {monitored}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--prv-text-3)" }}>
            Monitored
          </p>
        </GlassCard>
        <GlassCard className="text-center py-3">
          <p className="text-[22px] font-bold" style={{ color: "rgba(255,179,64,0.9)" }}>
            {inReview}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--prv-text-3)" }}>
            In Review
          </p>
        </GlassCard>
      </div>

      {/* Domain list */}
      <div className="flex flex-col gap-3">
        {TEST_DOMAINS.map((domain) => (
          <GlassCard key={domain.domain}>
            <div className="flex items-center justify-between mb-3">
              <p
                className="text-[14px] font-semibold"
                style={{ color: "var(--prv-text-1)" }}
              >
                {domain.domain}
              </p>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: domain.ok
                    ? "rgba(80,220,120,0.12)"
                    : "rgba(255,179,64,0.12)",
                  color: domain.ok ? "rgba(80,220,120,0.9)" : "rgba(255,179,64,0.9)",
                  border: `1px solid ${domain.ok ? "rgba(80,220,120,0.25)" : "rgba(255,179,64,0.25)"}`,
                }}
              >
                {domain.status}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {domain.cases.map((c) => (
                <span
                  key={c}
                  className="text-[11px] px-2 py-0.5 rounded-[6px]"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "var(--prv-text-3)",
                    border: "1px solid var(--prv-border-subtle)",
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
