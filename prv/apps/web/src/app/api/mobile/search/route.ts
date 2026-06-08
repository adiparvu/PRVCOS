import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { projects, users, clients, invoices, orders } from "@prv/db/schema"
import { eq, and, isNull, ilike, or } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100)
  const scope = req.nextUrl.searchParams.get("scope") ?? "all"

  const empty = { projects: [], people: [], clients: [], invoices: [], orders: [] }

  if (q.length < 2) {
    return NextResponse.json({ query: q, scope, results: empty })
  }

  const p = `%${q}%`
  const cid = ctx.companyId

  const runProjects = scope === "all" || scope === "projects"
  const runPeople = scope === "all" || scope === "people"
  const runClients = scope === "all" || scope === "clients"
  const runFinance = scope === "all" || scope === "finance"

  const [projectRows, peopleRows, clientRows, invoiceRows, orderRows] = await Promise.all([
    runProjects
      ? db
          .select({
            id: projects.id,
            name: projects.name,
            status: projects.status,
            dueDate: projects.dueDate,
          })
          .from(projects)
          .where(
            and(
              eq(projects.companyId, cid),
              isNull(projects.deletedAt),
              or(ilike(projects.name, p), ilike(projects.code, p))
            )
          )
          .limit(5)
      : Promise.resolve([]),

    runPeople
      ? db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            jobTitle: users.jobTitle,
            email: users.email,
          })
          .from(users)
          .where(
            and(
              eq(users.companyId, cid),
              isNull(users.deletedAt),
              or(
                ilike(users.firstName, p),
                ilike(users.lastName, p),
                ilike(users.email, p),
                ilike(users.jobTitle, p)
              )
            )
          )
          .limit(5)
      : Promise.resolve([]),

    runClients
      ? db
          .select({
            id: clients.id,
            name: clients.name,
            type: clients.type,
            status: clients.status,
            city: clients.city,
          })
          .from(clients)
          .where(
            and(
              eq(clients.companyId, cid),
              isNull(clients.deletedAt),
              or(ilike(clients.name, p), ilike(clients.email, p), ilike(clients.vatNumber, p))
            )
          )
          .limit(5)
      : Promise.resolve([]),

    runFinance
      ? db
          .select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            status: invoices.status,
            total: invoices.total,
            currency: invoices.currency,
          })
          .from(invoices)
          .where(
            and(
              eq(invoices.companyId, cid),
              isNull(invoices.deletedAt),
              ilike(invoices.invoiceNumber, p)
            )
          )
          .limit(5)
      : Promise.resolve([]),

    runFinance
      ? db
          .select({
            id: orders.id,
            orderNumber: orders.orderNumber,
            status: orders.status,
            total: orders.total,
            currency: orders.currency,
          })
          .from(orders)
          .where(
            and(eq(orders.companyId, cid), isNull(orders.deletedAt), ilike(orders.orderNumber, p))
          )
          .limit(5)
      : Promise.resolve([]),
  ])

  function fmtCurrency(amount: string | number, currency: string): string {
    const n = Number(amount)
    const sym = currency === "RON" ? "RON " : currency === "EUR" ? "€" : `${currency} `
    if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(2)}M`
    if (n >= 1_000) return `${sym}${(n / 1_000).toFixed(2)}k`
    return `${sym}${n.toFixed(2)}`
  }

  return NextResponse.json({
    query: q,
    scope,
    results: {
      projects: projectRows.map((r) => ({
        id: r.id,
        title: r.name,
        subtitle: r.status,
        meta: r.dueDate
          ? new Date(r.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
          : null,
        status: r.status,
      })),
      people: peopleRows.map((r) => ({
        id: r.id,
        title: `${r.firstName} ${r.lastName}`,
        subtitle: r.jobTitle ?? r.email,
      })),
      clients: clientRows.map((r) => ({
        id: r.id,
        title: r.name,
        subtitle: [r.type, r.city].filter(Boolean).join(" · "),
        status: r.status,
      })),
      invoices: invoiceRows.map((r) => ({
        id: r.id,
        title: r.invoiceNumber,
        total: fmtCurrency(r.total, r.currency),
        status: r.status,
      })),
      orders: orderRows.map((r) => ({
        id: r.id,
        title: r.orderNumber,
        total: fmtCurrency(r.total, r.currency),
        status: r.status,
      })),
    },
  })
})
