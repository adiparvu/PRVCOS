import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import type { ToolSummary } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type MaintenanceStatus = "Done" | "Due Soon" | "Overdue"

export interface MaintenanceRecord {
  id: string
  label: string
  detail: string
  status: MaintenanceStatus
}

export interface ToolSpec {
  key: string
  val: string
}

export interface ToolDetail extends ToolSummary {
  ageYears: number
  usesThisMonth: number
  valueEur: number
  lastService: string
  nextService: string
  specs: ToolSpec[]
  maintenance: MaintenanceRecord[]
}

const MOCK_DETAIL: Record<string, ToolDetail> = {
  t1: {
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
    ageYears: 3.2,
    usesThisMonth: 12,
    valueEur: 380,
    lastService: "2 Apr 2026",
    nextService: "15 Iul 2026",
    specs: [
      { key: "Putere", val: "880W" },
      { key: "Impact", val: "3.2J" },
      { key: "Mandrina", val: "SDS-Plus" },
      { key: "Greutate", val: "2.9kg" },
    ],
    maintenance: [
      { id: "m1", label: "Revizii perii carbon", detail: "Mar 2026 · Înlocuite", status: "Done" },
      { id: "m2", label: "Lubrifiere mecanism", detail: "Apr 2, 2026 · Efectuat", status: "Done" },
      {
        id: "m3",
        label: "Inspecție periodică",
        detail: "La 15 Iul 2026 · ~38 zile distanță",
        status: "Due Soon",
      },
    ],
  },
  t2: {
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
    ageYears: 4.1,
    usesThisMonth: 0,
    valueEur: 220,
    lastService: "8 Ian 2026",
    nextService: "25 Mai 2026",
    specs: [
      { key: "Putere", val: "2000W" },
      { key: "Disc", val: "230mm" },
      { key: "Turație", val: "6600 rpm" },
      { key: "Greutate", val: "5.2kg" },
    ],
    maintenance: [
      {
        id: "m1",
        label: "Înlocuire disc protecție",
        detail: "Ian 8, 2026 · Efectuat",
        status: "Done",
      },
      {
        id: "m2",
        label: "Service complet",
        detail: "Restant 12 zile · AutoPro Cluj",
        status: "Overdue",
      },
    ],
  },
  t3: {
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
    ageYears: 2.0,
    usesThisMonth: 8,
    valueEur: 290,
    lastService: "14 Mar 2026",
    nextService: "15 Aug 2026",
    specs: [
      { key: "Tensiune", val: "18V" },
      { key: "Cuplu", val: "70Nm" },
      { key: "Baterie", val: "5.0Ah" },
      { key: "Greutate", val: "1.9kg" },
    ],
    maintenance: [
      {
        id: "m1",
        label: "Curățare contact baterie",
        detail: "Mar 14, 2026 · Efectuat",
        status: "Done",
      },
      {
        id: "m2",
        label: "Inspecție periodică",
        detail: "La 15 Aug 2026 · ~73 zile distanță",
        status: "Due Soon",
      },
    ],
  },
  t4: {
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
    ageYears: 1.5,
    usesThisMonth: 6,
    valueEur: 640,
    lastService: "20 Feb 2026",
    nextService: "1 Oct 2026",
    specs: [
      { key: "Raze", val: "2 (H + V)" },
      { key: "Acuratețe", val: "±0.3mm/m" },
      { key: "Raza max", val: "25m" },
      { key: "Clasa laser", val: "II" },
    ],
    maintenance: [
      { id: "m1", label: "Calibrare anuală", detail: "Feb 20, 2026 · Efectuat", status: "Done" },
    ],
  },
  t5: {
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
    ageYears: 5.8,
    usesThisMonth: 9,
    valueEur: 1200,
    lastService: "18 Apr 2026",
    nextService: "1 Sep 2026",
    specs: [
      { key: "Capacitate", val: "150L" },
      { key: "Motor", val: "800W" },
      { key: "Turație tambur", val: "28 rpm" },
      { key: "Greutate", val: "112kg" },
    ],
    maintenance: [
      { id: "m1", label: "Curățare tambur", detail: "Apr 18, 2026 · Efectuat", status: "Done" },
      { id: "m2", label: "Ungere angrenaje", detail: "Apr 18, 2026 · Efectuat", status: "Done" },
    ],
  },
  t6: {
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
    ageYears: 2.8,
    usesThisMonth: 4,
    valueEur: 480,
    lastService: "30 Mar 2026",
    nextService: "20 Iul 2026",
    specs: [
      { key: "Putere", val: "420W" },
      { key: "Cursă", val: "26mm" },
      { key: "Turație", val: "500-3100 rpm" },
      { key: "Greutate", val: "2.1kg" },
    ],
    maintenance: [
      { id: "m1", label: "Înlocuire perie", detail: "Mar 30, 2026 · Efectuat", status: "Done" },
      {
        id: "m2",
        label: "Revizii periodice",
        detail: "La 20 Iul 2026 · ~43 zile distanță",
        status: "Due Soon",
      },
    ],
  },
  t7: {
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
    ageYears: 3.0,
    usesThisMonth: 14,
    valueEur: 60,
    lastService: "5 Ian 2026",
    nextService: "5 Ian 2027",
    specs: [
      { key: "Lungime", val: "200cm" },
      { key: "Acuratețe", val: "0.5mm/m" },
      { key: "Fiole", val: "3 (H, V, 45°)" },
      { key: "Material", val: "Aluminiu" },
    ],
    maintenance: [
      { id: "m1", label: "Calibrare anuală", detail: "Ian 5, 2026 · Efectuat", status: "Done" },
    ],
  },
  t8: {
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
    ageYears: 6.2,
    usesThisMonth: 0,
    valueEur: 2400,
    lastService: "10 Nov 2025",
    nextService: "10 Mai 2026",
    specs: [
      { key: "Forță compactare", val: "15kN" },
      { key: "Motor", val: "Honda GX160" },
      { key: "Suprafață placă", val: "50x44cm" },
      { key: "Greutate", val: "73kg" },
    ],
    maintenance: [
      {
        id: "m1",
        label: "Service motor Honda",
        detail: "Nov 10, 2025 · Efectuat",
        status: "Done",
      },
      {
        id: "m2",
        label: "Schimb ulei + filtru",
        detail: "Restant 27 zile · În așteptare",
        status: "Overdue",
      },
      {
        id: "m3",
        label: "Inspecție plăci antivibratii",
        detail: "Restant · Necesită atenție urgentă",
        status: "Overdue",
      },
    ],
  },
  t9: {
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
    ageYears: 2.4,
    usesThisMonth: 7,
    valueEur: 190,
    lastService: "8 Feb 2026",
    nextService: "8 Aug 2026",
    specs: [
      { key: "Lungime tăiere", val: "60cm" },
      { key: "Diagonală", val: "43cm" },
      { key: "Grosime max", val: "16mm" },
      { key: "Greutate", val: "7.5kg" },
    ],
    maintenance: [
      {
        id: "m1",
        label: "Înlocuire disc diamantat",
        detail: "Feb 8, 2026 · Efectuat",
        status: "Done",
      },
    ],
  },
  t10: {
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
    ageYears: 3.7,
    usesThisMonth: 5,
    valueEur: 310,
    lastService: "10 Apr 2026",
    nextService: "10 Oct 2026",
    specs: [
      { key: "Putere", val: "1600W" },
      { key: "Disc", val: "190mm" },
      { key: "Tăiere max 90°", val: "66mm" },
      { key: "Greutate", val: "4.2kg" },
    ],
    maintenance: [
      { id: "m1", label: "Înlocuire disc", detail: "Apr 10, 2026 · Efectuat", status: "Done" },
      {
        id: "m2",
        label: "Inspecție periodică",
        detail: "La 10 Oct 2026 · ~125 zile distanță",
        status: "Due Soon",
      },
    ],
  },
}

export const GET = withGates(
  { action: "tools.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const tool = MOCK_DETAIL[id]
    if (!tool) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ tool })
  }
)
