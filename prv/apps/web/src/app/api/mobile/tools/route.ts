import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { tools, users, stores } from "@prv/db/schema"
import { and, asc, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type ToolStatus = "Available" | "In Use" | "Maintenance" | "Missing"

function dbStatusToMobile(dbStatus: string): ToolStatus {
  switch (dbStatus) {
    case "in_use":
      return "In Use"
    case "maintenance":
      return "Maintenance"
    case "lost":
    case "retired":
      return "Missing"
    default:
      return "Available"
  }
}

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url)
  const statusFilter = searchParams.get("status") as ToolStatus | null

  const rows = await db
    .select({
      id: tools.id,
      name: tools.name,
      brand: tools.brand,
      model: tools.model,
      category: tools.category,
      status: tools.status,
      notes: tools.notes,
      assignedFirstName: users.firstName,
      assignedLastName: users.lastName,
      storeCity: stores.city,
      storeName: stores.name,
    })
    .from(tools)
    .leftJoin(users, eq(tools.assignedUserId, users.id))
    .leftJoin(stores, eq(tools.storeId, stores.id))
    .where(and(eq(tools.companyId, ctx.companyId), isNull(tools.deletedAt)))
    .orderBy(asc(tools.name))
    .limit(50)

  const all = rows.map((r) => {
    const status = dbStatusToMobile(r.status)
    const isInUse = status === "In Use"
    const assignedTo =
      r.assignedFirstName && r.assignedLastName
        ? `${r.assignedFirstName} ${r.assignedLastName}`
        : null
    const site = r.storeCity ?? r.storeName ?? null
    return {
      id: r.id,
      name: r.name,
      model: [r.brand, r.model].filter(Boolean).join(" ") || null,
      category: r.category ?? "Other",
      status,
      assignedTo: isInUse ? assignedTo : null,
      site: isInUse ? site : (site ?? r.notes ?? null),
      utilisationPct: isInUse ? 100 : 0,
    }
  })

  const filtered = statusFilter ? all.filter((t) => t.status === statusFilter) : all

  const meta = {
    total: all.length,
    inUse: all.filter((t) => t.status === "In Use").length,
    inService: all.filter((t) => t.status === "Maintenance").length,
    missing: all.filter((t) => t.status === "Missing").length,
  }

  return NextResponse.json({ meta, tools: filtered })
})
