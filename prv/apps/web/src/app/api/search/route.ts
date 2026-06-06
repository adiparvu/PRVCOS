import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import type { EntityResult } from "@/components/command-palette/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MOCK_ENTITIES: EntityResult[] = [
  {
    id: "e1",
    entityType: "employee",
    title: "Ion Popa",
    subtitle: "Store Manager · Cluj",
    status: "active",
    href: "/people/e1",
  },
  {
    id: "e2",
    entityType: "employee",
    title: "Ana Ionescu",
    subtitle: "Accountant · București",
    status: "active",
    href: "/people/e2",
  },
  {
    id: "e3",
    entityType: "employee",
    title: "Mihai Popescu",
    subtitle: "Field Technician · Timișoara",
    status: "active",
    href: "/people/e3",
  },
  {
    id: "p1",
    entityType: "project",
    title: "Renovare Apartament Floreasca",
    subtitle: "PRV Renovations · Active",
    status: "active",
    href: "/projects/p1",
  },
  {
    id: "p2",
    entityType: "project",
    title: "Baie Modernă Cluj",
    subtitle: "PRV Renovations · Planning",
    status: "planning",
    href: "/projects/p2",
  },
  {
    id: "p3",
    entityType: "project",
    title: "Bucătărie Integrată Timișoara",
    subtitle: "PRV Renovations · Review",
    status: "review",
    href: "/projects/p3",
  },
  {
    id: "p4",
    entityType: "project",
    title: "Pardoseli Comerciale Brașov",
    subtitle: "PRV Renovations · Active",
    status: "active",
    href: "/projects/p4",
  },
  {
    id: "c1",
    entityType: "client",
    title: "Andronic Group SRL",
    subtitle: "CRM · 3 projects",
    status: "active",
    href: "/crm/c1",
  },
  {
    id: "c2",
    entityType: "client",
    title: "Biroul Construct SRL",
    subtitle: "CRM · 1 project",
    status: "active",
    href: "/crm/c2",
  },
  {
    id: "c3",
    entityType: "client",
    title: "Radu Construct SRL",
    subtitle: "CRM · 2 projects",
    status: "inactive",
    href: "/crm/c3",
  },
  {
    id: "i1",
    entityType: "invoice",
    title: "INV-208 — Andronic Group",
    subtitle: "€2,100 · Overdue",
    status: "pending",
    href: "/finance/invoices/i1",
  },
  {
    id: "i2",
    entityType: "invoice",
    title: "INV-207 — Biroul Construct",
    subtitle: "€1,140 · Overdue",
    status: "pending",
    href: "/finance/invoices/i2",
  },
  {
    id: "i3",
    entityType: "invoice",
    title: "INV-205 — Radu Construct",
    subtitle: "€3,800 · Paid",
    status: "active",
    href: "/finance/invoices/i3",
  },
  {
    id: "t1",
    entityType: "team",
    title: "Echipa Instalații Cluj",
    subtitle: "8 members",
    status: "active",
    href: "/people/teams/t1",
  },
  {
    id: "t2",
    entityType: "team",
    title: "Echipa Finisaje București",
    subtitle: "6 members",
    status: "active",
    href: "/people/teams/t2",
  },
  {
    id: "v1",
    entityType: "vehicle",
    title: "Dacia Dokker · CJ-12-PRV",
    subtitle: "Fleet · Available",
    status: "active",
    href: "/fleet/v1",
  },
  {
    id: "v2",
    entityType: "vehicle",
    title: "Ford Transit · B-88-PRV",
    subtitle: "Fleet · In Use",
    status: "pending",
    href: "/fleet/v2",
  },
  {
    id: "d1",
    entityType: "document",
    title: "Contract Renovare Floreasca",
    subtitle: "Documents · Jun 2026",
    status: "active",
    href: "/documents/d1",
  },
  {
    id: "tl1",
    entityType: "tool",
    title: "Bormasina Makita HR2470",
    subtitle: "Tools · Cluj Depot",
    status: "active",
    href: "/tools/tl1",
  },
  {
    id: "pr1",
    entityType: "product",
    title: "Gresie Rectificată 60×60",
    subtitle: "Shop · In Stock",
    status: "active",
    href: "/shop/pr1",
  },
]

function score(entity: EntityResult, q: string): number {
  const lower = q.toLowerCase()
  const title = entity.title.toLowerCase()
  const sub = (entity.subtitle ?? "").toLowerCase()
  if (title === lower) return 100
  if (title.startsWith(lower)) return 80
  if (title.includes(lower)) return 60
  if (sub.includes(lower)) return 40
  return 0
}

export const GET = withGates(
  { action: "search.entities", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get("q") ?? "").trim()
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "6", 10), 20)

    if (q.length < 2) return NextResponse.json({ results: [] })

    const results = MOCK_ENTITIES.map((e) => ({ entity: e, s: score(e, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map((x) => x.entity)

    return NextResponse.json({ results })
  }
)
