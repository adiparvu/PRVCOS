import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import {
  users,
  projects,
  clients,
  invoices,
  documents,
  vehicles,
  tools,
  products,
  teams,
} from "@prv/db/schema"
import { and, eq, ilike, isNull, or } from "drizzle-orm"
import type { EntityResult, EntityType, EntityStatus } from "@/components/command-palette/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const PER_TYPE_LIMIT = 5

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "search.entities", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get("q") ?? "").trim()
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "6", 10), 20)

    if (q.length < 2) return NextResponse.json({ results: [] })

    const { companyId } = ctx.session
    const pat = `%${q}%`

    const [
      userRows,
      projectRows,
      clientRows,
      invoiceRows,
      documentRows,
      vehicleRows,
      toolRows,
      productRows,
      teamRows,
    ] = await Promise.all([
      db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          jobTitle: users.jobTitle,
          status: users.status,
        })
        .from(users)
        .where(
          and(
            eq(users.companyId, companyId),
            isNull(users.deletedAt),
            or(ilike(users.firstName, pat), ilike(users.lastName, pat), ilike(users.jobTitle, pat))
          )
        )
        .limit(PER_TYPE_LIMIT),

      db
        .select({ id: projects.id, name: projects.name, status: projects.status })
        .from(projects)
        .where(
          and(
            eq(projects.companyId, companyId),
            isNull(projects.deletedAt),
            ilike(projects.name, pat)
          )
        )
        .limit(PER_TYPE_LIMIT),

      db
        .select({ id: clients.id, name: clients.name, city: clients.city, status: clients.status })
        .from(clients)
        .where(
          and(eq(clients.companyId, companyId), isNull(clients.deletedAt), ilike(clients.name, pat))
        )
        .limit(PER_TYPE_LIMIT),

      db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          total: invoices.total,
          status: invoices.status,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            isNull(invoices.deletedAt),
            ilike(invoices.invoiceNumber, pat)
          )
        )
        .limit(PER_TYPE_LIMIT),

      db
        .select({
          id: documents.id,
          fileName: documents.fileName,
          title: documents.title,
          type: documents.type,
        })
        .from(documents)
        .where(
          and(
            eq(documents.companyId, companyId),
            isNull(documents.deletedAt),
            or(ilike(documents.fileName, pat), ilike(documents.title, pat))
          )
        )
        .limit(PER_TYPE_LIMIT),

      db
        .select({
          id: vehicles.id,
          licensePlate: vehicles.licensePlate,
          make: vehicles.make,
          model: vehicles.model,
          status: vehicles.status,
        })
        .from(vehicles)
        .where(
          and(
            eq(vehicles.companyId, companyId),
            isNull(vehicles.deletedAt),
            or(
              ilike(vehicles.licensePlate, pat),
              ilike(vehicles.make, pat),
              ilike(vehicles.model, pat)
            )
          )
        )
        .limit(PER_TYPE_LIMIT),

      db
        .select({
          id: tools.id,
          name: tools.name,
          brand: tools.brand,
          model: tools.model,
          status: tools.status,
        })
        .from(tools)
        .where(
          and(
            eq(tools.companyId, companyId),
            isNull(tools.deletedAt),
            or(ilike(tools.name, pat), ilike(tools.brand, pat))
          )
        )
        .limit(PER_TYPE_LIMIT),

      db
        .select({ id: products.id, name: products.name, status: products.status })
        .from(products)
        .where(and(eq(products.companyId, companyId), ilike(products.name, pat)))
        .limit(PER_TYPE_LIMIT),

      db
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(and(eq(teams.companyId, companyId), ilike(teams.name, pat)))
        .limit(PER_TYPE_LIMIT),
    ])

    const results: EntityResult[] = []

    for (const u of userRows) {
      const name = `${u.firstName} ${u.lastName}`
      results.push({
        id: u.id,
        entityType: "employee" as EntityType,
        title: name,
        subtitle: u.jobTitle ?? "Employee",
        status: (u.status === "active" ? "active" : "inactive") as EntityStatus,
        href: `/people/${u.id}`,
      })
    }

    for (const p of projectRows) {
      results.push({
        id: p.id,
        entityType: "project" as EntityType,
        title: p.name,
        subtitle: `Project · ${p.status}`,
        status: p.status as EntityStatus,
        href: `/projects/${p.id}`,
      })
    }

    for (const c of clientRows) {
      results.push({
        id: c.id,
        entityType: "client" as EntityType,
        title: c.name,
        subtitle: c.city ? `CRM · ${c.city}` : "CRM",
        status: (c.status === "active" ? "active" : "inactive") as EntityStatus,
        href: `/crm/${c.id}`,
      })
    }

    for (const inv of invoiceRows) {
      results.push({
        id: inv.id,
        entityType: "invoice" as EntityType,
        title: inv.invoiceNumber,
        subtitle: `€${Number(inv.total ?? 0).toLocaleString()} · ${inv.status}`,
        status: inv.status === "paid" ? "active" : ("pending" as EntityStatus),
        href: `/finance/invoices/${inv.id}`,
      })
    }

    for (const d of documentRows) {
      results.push({
        id: d.id,
        entityType: "document" as EntityType,
        title: d.title ?? d.fileName,
        subtitle: `Documents · ${d.type}`,
        status: "active" as EntityStatus,
        href: `/documents/${d.id}`,
      })
    }

    for (const v of vehicleRows) {
      results.push({
        id: v.id,
        entityType: "vehicle" as EntityType,
        title: `${v.make} ${v.model} · ${v.licensePlate}`,
        subtitle: `Fleet · ${v.status}`,
        status: v.status === "active" ? "active" : ("inactive" as EntityStatus),
        href: `/fleet/${v.id}`,
      })
    }

    for (const t of toolRows) {
      results.push({
        id: t.id,
        entityType: "tool" as EntityType,
        title: t.name,
        subtitle: [t.brand, t.model].filter(Boolean).join(" · ") || "Tools",
        status: "active" as EntityStatus,
        href: `/tools/${t.id}`,
      })
    }

    for (const pr of productRows) {
      results.push({
        id: pr.id,
        entityType: "product" as EntityType,
        title: pr.name,
        subtitle: `Shop · ${pr.status}`,
        status: pr.status === "active" ? "active" : ("inactive" as EntityStatus),
        href: `/shop/${pr.id}`,
      })
    }

    for (const tm of teamRows) {
      results.push({
        id: tm.id,
        entityType: "team" as EntityType,
        title: tm.name,
        subtitle: "Team",
        status: "active" as EntityStatus,
        href: `/people/teams/${tm.id}`,
      })
    }

    // Score and rank
    const lower = q.toLowerCase()
    const scored = results
      .map((e) => {
        const title = e.title.toLowerCase()
        let s = 0
        if (title === lower) s = 100
        else if (title.startsWith(lower)) s = 80
        else if (title.includes(lower)) s = 60
        else s = 40
        return { e, s }
      })
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map((x) => x.e)

    return NextResponse.json({ results: scored })
  }
)
