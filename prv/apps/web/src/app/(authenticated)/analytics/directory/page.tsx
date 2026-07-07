import Link from "next/link"

export const metadata = { title: "Analytics Directory · PRV" }

interface Entry {
  href: string
  label: string
  description: string
}
interface Group {
  title: string
  entries: Entry[]
}

const GROUPS: Group[] = [
  {
    title: "Command Center",
    entries: [
      {
        href: "/command-center",
        label: "Executive Cockpit",
        description: "CEO 60-second view — 8 live panels across the company.",
      },
      {
        href: "/command-center/briefing",
        label: "Daily Briefing",
        description: "Narrative morning brief — money, ops, people, risk.",
      },
      {
        href: "/command-center/insights",
        label: "Insights",
        description: "Rule-based, ranked, actionable insight cards.",
      },
      {
        href: "/command-center/modules",
        label: "Module Status",
        description: "Operational health of every module from the audit log.",
      },
    ],
  },
  {
    title: "Business Intelligence",
    entries: [
      {
        href: "/analytics/health",
        label: "Company Health",
        description: "Composite 0–100 index across domains.",
      },
      {
        href: "/analytics/trends",
        label: "KPI Trends",
        description: "Headline KPIs with sparklines and period comparison.",
      },
      {
        href: "/analytics/anomalies",
        label: "Anomaly Feed",
        description: "Unusual day-over-day KPI moves.",
      },
      {
        href: "/analytics/project-profitability",
        label: "Project Profitability",
        description: "Revenue, cost, margin and budget per project.",
      },
      {
        href: "/analytics/employee-roi",
        label: "Employee ROI",
        description: "Payroll cost vs completed output.",
      },
      {
        href: "/analytics/inventory-efficiency",
        label: "Inventory Efficiency",
        description: "Turnover, days-on-hand, dead stock.",
      },
      {
        href: "/analytics/demand-forecast",
        label: "Demand Forecast",
        description: "Reorder plan from sale velocity.",
      },
      {
        href: "/analytics/reports",
        label: "Reports",
        description: "Export any analytics dataset as CSV.",
      },
    ],
  },
  {
    title: "People & Learning",
    entries: [
      {
        href: "/analytics/attendance",
        label: "Attendance Analytics",
        description: "Attendance, punctuality and a watchlist.",
      },
      {
        href: "/analytics/learning-completion",
        label: "Learning Completion",
        description: "Course completion rate and per-course breakdown.",
      },
    ],
  },
  {
    title: "Safety",
    entries: [
      {
        href: "/analytics/safety",
        label: "Safety Analytics",
        description: "Incident intelligence — risk index, MTTR.",
      },
      {
        href: "/analytics/safety-metrics",
        label: "Safety Metrics",
        description: "Days-since-incident, near-miss, high-risk sites.",
      },
      {
        href: "/analytics/safety-training",
        label: "Training Compliance",
        description: "Certification and training expiry register.",
      },
    ],
  },
  {
    title: "Fleet & Tools",
    entries: [
      {
        href: "/analytics/fleet-readiness",
        label: "Fleet Readiness",
        description: "Service, insurance/ITP, maintenance and fuel.",
      },
      {
        href: "/analytics/fleet-utilization",
        label: "Fleet Utilization",
        description: "Kilometres driven per vehicle from daily logs.",
      },
      {
        href: "/analytics/tool-inventory",
        label: "Tool Inventory",
        description: "Availability, utilization and lost assets.",
      },
    ],
  },
  {
    title: "Procurement",
    entries: [
      {
        href: "/analytics/supplier-spend",
        label: "Supplier Spend",
        description: "Spend, outstanding and overdue payables.",
      },
    ],
  },
]

const TOTAL = GROUPS.reduce((n, g) => n + g.entries.length, 0)

export default function AnalyticsDirectoryPage() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>
        Analytics Directory
      </h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Every dashboard, one place · {TOTAL} views across {GROUPS.length} domains
      </div>

      {GROUPS.map((group) => (
        <div key={group.title} style={{ marginTop: 28 }}>
          <h2
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "var(--prv-text-3)",
              fontWeight: 600,
              margin: "0 2px 12px",
            }}
          >
            {group.title}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {group.entries.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                style={{
                  background: "var(--prv-g1)",
                  border: "1px solid var(--prv-border)",
                  borderRadius: 18,
                  padding: "16px 17px",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
                  textDecoration: "none",
                  color: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 96,
                }}
              >
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>{e.label}</div>
                <div
                  style={{
                    color: "var(--prv-text-3)",
                    fontSize: 12,
                    lineHeight: 1.5,
                    marginTop: 6,
                    flex: 1,
                  }}
                >
                  {e.description}
                </div>
                <div
                  style={{
                    color: "var(--prv-text-3)",
                    fontSize: 15,
                    marginTop: 8,
                    alignSelf: "flex-end",
                  }}
                >
                  ›
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
