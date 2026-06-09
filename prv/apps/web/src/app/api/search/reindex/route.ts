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
import { eq } from "drizzle-orm"
import { bulkUpsert, isTypesenseAvailable } from "@prv/search"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const BATCH_LIMIT = 1000

export const POST = withGates(
  { action: "search.reindex", endpointClass: "api_write" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    if (!isTypesenseAvailable()) {
      return NextResponse.json({ error: "Typesense is not configured" }, { status: 503 })
    }

    const { companyId } = ctx.session
    const ts = Math.floor(Date.now() / 1000)

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
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(eq(users.companyId, companyId))
        .limit(BATCH_LIMIT),

      db
        .select({ id: projects.id, name: projects.name, status: projects.status })
        .from(projects)
        .where(eq(projects.companyId, companyId))
        .limit(BATCH_LIMIT),

      db
        .select({
          id: clients.id,
          name: clients.name,
          city: clients.city,
          status: clients.status,
          type: clients.type,
        })
        .from(clients)
        .where(eq(clients.companyId, companyId))
        .limit(BATCH_LIMIT),

      db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          total: invoices.total,
        })
        .from(invoices)
        .where(eq(invoices.companyId, companyId))
        .limit(BATCH_LIMIT),

      db
        .select({
          id: documents.id,
          title: documents.title,
          fileName: documents.fileName,
          mimeType: documents.mimeType,
        })
        .from(documents)
        .where(eq(documents.companyId, companyId))
        .limit(BATCH_LIMIT),

      db
        .select({
          id: vehicles.id,
          licensePlate: vehicles.licensePlate,
          make: vehicles.make,
          model: vehicles.model,
          status: vehicles.status,
        })
        .from(vehicles)
        .where(eq(vehicles.companyId, companyId))
        .limit(BATCH_LIMIT),

      db
        .select({
          id: tools.id,
          name: tools.name,
          brand: tools.brand,
          model: tools.model,
          status: tools.status,
        })
        .from(tools)
        .where(eq(tools.companyId, companyId))
        .limit(BATCH_LIMIT),

      db
        .select({ id: products.id, name: products.name, status: products.status })
        .from(products)
        .where(eq(products.companyId, companyId))
        .limit(BATCH_LIMIT),

      db
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(eq(teams.companyId, companyId))
        .limit(BATCH_LIMIT),
    ])

    await Promise.all([
      bulkUpsert(
        "users",
        userRows.map((r) => ({
          id: r.id,
          company_id: companyId,
          full_name: `${r.firstName} ${r.lastName}`,
          email: r.email,
          role: r.role,
          created_at: ts,
        }))
      ),

      bulkUpsert(
        "projects",
        projectRows.map((r) => ({
          id: r.id,
          company_id: companyId,
          title: r.name,
          status: r.status,
          created_at: ts,
        }))
      ),

      bulkUpsert(
        "clients",
        clientRows.map((r) => ({
          id: r.id,
          company_id: companyId,
          name: r.name,
          city: r.city ?? undefined,
          status: r.status,
          type: r.type ?? undefined,
          created_at: ts,
        }))
      ),

      bulkUpsert(
        "invoices",
        invoiceRows.map((r) => ({
          id: r.id,
          company_id: companyId,
          invoice_number: r.invoiceNumber,
          client_name: "",
          status: r.status,
          total_amount: Number(r.total ?? 0),
          created_at: ts,
        }))
      ),

      bulkUpsert(
        "documents",
        documentRows.map((r) => ({
          id: r.id,
          company_id: companyId,
          title: r.title ?? r.fileName,
          mime_type: r.mimeType ?? undefined,
          created_at: ts,
        }))
      ),

      bulkUpsert(
        "vehicles",
        vehicleRows.map((r) => ({
          id: r.id,
          company_id: companyId,
          license_plate: r.licensePlate,
          make: r.make,
          model: r.model,
          status: r.status,
          created_at: ts,
        }))
      ),

      bulkUpsert(
        "tools",
        toolRows.map((r) => ({
          id: r.id,
          company_id: companyId,
          name: r.name,
          brand: r.brand ?? undefined,
          model: r.model ?? undefined,
          status: r.status,
          created_at: ts,
        }))
      ),

      bulkUpsert(
        "products",
        productRows.map((r) => ({
          id: r.id,
          company_id: companyId,
          name: r.name,
          status: r.status,
          created_at: ts,
        }))
      ),

      bulkUpsert(
        "teams",
        teamRows.map((r) => ({
          id: r.id,
          company_id: companyId,
          name: r.name,
          created_at: ts,
        }))
      ),
    ])

    return NextResponse.json({
      ok: true,
      indexed: {
        users: userRows.length,
        projects: projectRows.length,
        clients: clientRows.length,
        invoices: invoiceRows.length,
        documents: documentRows.length,
        vehicles: vehicleRows.length,
        tools: toolRows.length,
        products: productRows.length,
        teams: teamRows.length,
      },
    })
  }
)
