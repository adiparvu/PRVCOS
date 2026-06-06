"use client"

import {
  GlassHero,
  GlassFeatureGrid,
  GlassPricingTable,
  GlassTestimonial,
  type FeatureItem,
  type PricingPlan,
} from "@prv/ui"

// ── Icons ─────────────────────────────────────────────────────────────────────

const icon = (paths: React.ReactNode) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {paths}
  </svg>
)

const FEATURES: FeatureItem[] = [
  {
    title: "18 Platforms",
    description: "Projects, CRM, shop, finance, HR & more in one ecosystem.",
    icon: icon(
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </>
    ),
  },
  {
    title: "Zero Trust",
    description: "10-gate security chain with immutable SHA-256 audit logs.",
    icon: icon(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />),
  },
  {
    title: "Real-time",
    description: "Live presence, notifications & dashboards on every device.",
    icon: icon(
      <>
        <path d="M12 2a10 10 0 1 0 10 10" />
        <path d="M12 6v6l4 2" />
      </>
    ),
  },
  {
    title: "AI Native",
    description: "An assistant that forecasts, summarizes & drafts for every role.",
    icon: icon(
      <>
        <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  },
  {
    title: "Multi-tenant",
    description: "Scales to 100+ companies & 1,000+ stores with strict isolation.",
    icon: icon(<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />),
  },
  {
    title: "Every Platform",
    description: "iPhone, iPad, Android, web & macOS — one design language.",
    icon: icon(
      <>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </>
    ),
  },
]

const PLANS: PricingPlan[] = [
  {
    name: "Starter",
    price: "€0",
    period: "/mo",
    description: "For small teams getting started.",
    cta: "Get started",
    features: [
      { label: "Up to 5 users" },
      { label: "3 platforms" },
      { label: "AI assistant", included: false },
    ],
  },
  {
    name: "Business",
    price: "€49",
    period: "/user/mo",
    description: "For growing companies.",
    featured: true,
    badge: "Most popular",
    cta: "Start trial",
    features: [
      { label: "Unlimited users" },
      { label: "All 18 platforms" },
      { label: "AI assistant" },
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For 100+ companies & groups.",
    cta: "Contact sales",
    features: [
      { label: "Everything in Business" },
      { label: "SSO & SCIM" },
      { label: "Dedicated support" },
    ],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function scrollToId(id: string) {
  if (typeof document !== "undefined") {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
  }
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-7">
      <h2 className="text-[28px] font-bold tracking-tight text-white/90">{title}</h2>
      {subtitle && <p className="text-[15px] text-white/35 mt-2">{subtitle}</p>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main className="max-w-[1000px] mx-auto px-6">
      {/* Nav */}
      <nav className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2.5 text-[17px] font-extrabold tracking-tight">
          <span
            className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[13px]"
            style={{ background: "linear-gradient(135deg,#0A84FF,#BF5AF2)" }}
          >
            ✦
          </span>
          PRV
        </div>
        <div className="hidden sm:flex gap-6 text-[14px] text-white/65">
          <a href="#features">Product</a>
          <a href="#features">Platforms</a>
          <a href="#pricing">Pricing</a>
          <a href="#customers">Customers</a>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => scrollToId("pricing")}
            className="px-[18px] py-2 rounded-[12px] text-[13px] font-semibold text-white/95"
            style={{ background: "var(--prv-g2)", border: "1px solid var(--prv-border)" }}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => scrollToId("pricing")}
            className="px-[18px] py-2 rounded-[12px] text-[13px] font-semibold text-black"
            style={{ background: "var(--prv-text-1)" }}
          >
            Start free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="my-[18px]">
        <GlassHero
          eyebrow="✦ The Company Operating System"
          title={
            <>
              Run your whole company from{" "}
              <span
                style={{
                  background: "linear-gradient(120deg,#0A84FF,#BF5AF2)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                one glass surface
              </span>
            </>
          }
          description="PRV unifies 18 platforms — projects, workforce, finance, AI — into a single Apple-grade experience."
          actions={[
            { label: "Start free trial", variant: "primary", onClick: () => scrollToId("pricing") },
            { label: "Book a demo", variant: "ghost", onClick: () => scrollToId("customers") },
          ]}
          trust={["★ 4.9 / 5 rating", "100+ companies", "10,000+ employees", "SOC 2 compliant"]}
        />
      </div>

      {/* Features */}
      <section id="features" className="mt-14 mb-14 scroll-mt-6">
        <SectionHeading
          title="One platform. Every workflow."
          subtitle="Replace a dozen disconnected tools."
        />
        <GlassFeatureGrid features={FEATURES} columns={3} />
      </section>

      {/* Pricing */}
      <section id="pricing" className="mb-14 scroll-mt-6">
        <SectionHeading
          title="Simple, scalable pricing"
          subtitle="Start free. Upgrade as you grow."
        />
        <GlassPricingTable plans={PLANS} onSelect={() => scrollToId("pricing")} />
      </section>

      {/* Testimonials */}
      <section id="customers" className="mb-14 scroll-mt-6">
        <SectionHeading title="Loved by operators" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <GlassTestimonial
            rating={5}
            quote="PRV replaced six separate tools. Our CEO sees revenue, projects and workforce in one glance."
            author="Andrei Popescu"
            role="COO · Renovații SRL"
            avatar="AP"
          />
          <GlassTestimonial
            rating={5}
            quote="The Liquid Glass design genuinely feels like a first-party Apple app."
            author="Maria Ionescu"
            role="HR Director · West Group"
            avatar="MI"
            avatarColor="linear-gradient(135deg,#FF9F0A,#FF375F)"
          />
        </div>
      </section>

      {/* Footer */}
      <footer
        className="flex items-center justify-between flex-wrap gap-3 py-7 text-[13px] text-white/35"
        style={{ borderTop: "1px solid var(--prv-border-subtle)" }}
      >
        <div className="flex items-center gap-2.5 font-extrabold text-white/90">
          <span
            className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[13px]"
            style={{ background: "linear-gradient(135deg,#0A84FF,#BF5AF2)" }}
          >
            ✦
          </span>
          PRV
        </div>
        <div>© 2026 PRV · Privacy · Terms · Status</div>
      </footer>
    </main>
  )
}
