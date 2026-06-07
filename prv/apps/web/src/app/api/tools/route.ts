import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ToolStatus = "Available" | "In Use" | "Maintenance" | "Missing"

export interface ToolSummary {
  id: string
  name: string
  model: string
  category: string
  status: ToolStatus
  assignedTo: string | null
  site: string | null
  dueBack: string | null
  location: string | null
  lastUsed: string | null
  utilisationPct: number
  serviceOverdueDays: number | null
}

export interface ToolsMeta {
  total: number
  inUse: number
  inService: number
  missing: number
  serviceAlert: boolean
  overdueCount: number
}

const MOCK_TOOLS: ToolSummary[] = [
  {
    id: "t1",
    name: "Rotary Hammer",
    model: "Bosch GBH 2-28",
    category: "Power Tools",
    status: "In Use",
    assignedTo: "Ion Crișan",
    site: "Cluj Mănăștur",
    dueBack: "9 Iun",
    location: null,
    lastUsed: null,
    utilisationPct: 94,
    serviceOverdueDays: null,
  },
  {
    id: "t2",
    name: "Angle Grinder",
    model: "Makita GA9020",
    category: "Power Tools",
    status: "Maintenance",
    assignedTo: null,
    site: null,
    dueBack: null,
    location: "Warehouse",
    lastUsed: "30 Mai",
    utilisationPct: 71,
    serviceOverdueDays: 12,
  },
  {
    id: "t3",
    name: "Cordless Drill",
    model: "DeWalt DCD796",
    category: "Power Tools",
    status: "Available",
    assignedTo: null,
    site: null,
    dueBack: null,
    location: "Warehouse A",
    lastUsed: "3 Iun",
    utilisationPct: 68,
    serviceOverdueDays: null,
  },
  {
    id: "t4",
    name: "Laser Level",
    model: "Leica Lino L2",
    category: "Measuring",
    status: "Available",
    assignedTo: null,
    site: null,
    dueBack: null,
    location: "Warehouse B",
    lastUsed: "1 Iun",
    utilisationPct: 55,
    serviceOverdueDays: null,
  },
  {
    id: "t5",
    name: "Concrete Mixer",
    model: "Altrad M150",
    category: "Heavy Equipment",
    status: "In Use",
    assignedTo: "Radu Dima",
    site: "Brașov",
    dueBack: "12 Iun",
    location: null,
    lastUsed: null,
    utilisationPct: 82,
    serviceOverdueDays: null,
  },
  {
    id: "t6",
    name: "Jigsaw",
    model: "Festool PS 420",
    category: "Power Tools",
    status: "Available",
    assignedTo: null,
    site: null,
    dueBack: null,
    location: "Warehouse A",
    lastUsed: "28 Mai",
    utilisationPct: 48,
    serviceOverdueDays: null,
  },
  {
    id: "t7",
    name: "Spirit Level 2m",
    model: "Stanley FatMax",
    category: "Measuring",
    status: "Available",
    assignedTo: null,
    site: null,
    dueBack: null,
    location: "Warehouse A",
    lastUsed: "4 Iun",
    utilisationPct: 62,
    serviceOverdueDays: null,
  },
  {
    id: "t8",
    name: "Plate Compactor",
    model: "Wacker Neuson WP1550AW",
    category: "Heavy Equipment",
    status: "Maintenance",
    assignedTo: null,
    site: null,
    dueBack: null,
    location: "Service Bay",
    lastUsed: "22 Mai",
    utilisationPct: 77,
    serviceOverdueDays: 27,
  },
  {
    id: "t9",
    name: "Tile Cutter",
    model: "Rubi TR 600",
    category: "Hand Tools",
    status: "In Use",
    assignedTo: "Sorin Florea",
    site: "Timișoara",
    dueBack: "8 Iun",
    location: null,
    lastUsed: null,
    utilisationPct: 73,
    serviceOverdueDays: null,
  },
  {
    id: "t10",
    name: "Circular Saw",
    model: "Makita HS7601",
    category: "Power Tools",
    status: "Available",
    assignedTo: null,
    site: null,
    dueBack: null,
    location: "Warehouse B",
    lastUsed: "2 Iun",
    utilisationPct: 59,
    serviceOverdueDays: null,
  },
]

function computeMeta(tools: ToolSummary[]): ToolsMeta {
  const total = tools.length
  const inUse = tools.filter((t) => t.status === "In Use").length
  const inService = tools.filter((t) => t.status === "Maintenance").length
  const missing = tools.filter((t) => t.status === "Missing").length
  const overdueCount = tools.filter((t) => t.serviceOverdueDays !== null).length
  return { total, inUse, inService, missing, serviceAlert: overdueCount > 0, overdueCount }
}

export const GET = withGates(
  { action: "tools.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const status = req.nextUrl.searchParams.get("status")
    const results = status ? MOCK_TOOLS.filter((t) => t.status === status) : MOCK_TOOLS
    const meta = computeMeta(MOCK_TOOLS)
    return NextResponse.json({ tools: results, count: results.length, meta })
  }
)
