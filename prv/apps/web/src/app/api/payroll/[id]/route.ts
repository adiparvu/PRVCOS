import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import type { PayrollRunStatus, PayrollRunType } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface CostEntry {
  label: string
  amount: number
  color: string | null
  isTotal: boolean
}

export interface TopEmployee {
  id: string
  initials: string
  name: string
  role: string
  net: number
  hasOT: boolean
  avatarBg: string
  avatarColor: string
}

export interface PayrollRunDetail {
  id: string
  title: string
  subtitle: string
  period: string
  employeeCount: number
  totalGross: number
  netPaid: number
  status: PayrollRunStatus
  type: PayrollRunType
  ref: string
  breakdown: CostEntry[]
  topEmployees: TopEmployee[]
  initiatedBy: string
  processingDate: string
  estimatedPayDate: string
  paymentMethod: string
}

const MOCK_DETAILS: Record<string, PayrollRunDetail> = {
  pr1: {
    id: "pr1",
    title: "Săptămâna 2 Iun",
    subtitle: "142 angajați · 9–15 Iun 2026",
    period: "9–15 Iun 2026",
    employeeCount: 142,
    totalGross: 28400,
    netPaid: 19880,
    status: "processing",
    type: "weekly",
    ref: "PR-0024",
    breakdown: [
      { label: "Salarii de bază", amount: 24100, color: null, isTotal: false },
      { label: "Ore suplimentare", amount: 2840, color: "rgba(255,159,10,0.9)", isTotal: false },
      { label: "Bonusuri performanță", amount: 960, color: "rgba(48,209,88,0.9)", isTotal: false },
      {
        label: "Contribuții angajator",
        amount: -8520,
        color: "rgba(255,69,58,0.85)",
        isTotal: false,
      },
      { label: "Impozit reținut", amount: -2856, color: "rgba(255,69,58,0.85)", isTotal: false },
      { label: "Net de plată", amount: 19880, color: "rgba(48,209,88,0.95)", isTotal: true },
    ],
    topEmployees: [
      {
        id: "te1",
        initials: "IC",
        name: "Ion Crișan",
        role: "Maistru Construcții",
        net: 3200,
        hasOT: false,
        avatarBg: "rgba(10,132,255,0.12)",
        avatarColor: "rgba(10,132,255,0.9)",
      },
      {
        id: "te2",
        initials: "EM",
        name: "Elena Marin",
        role: "Manager Proiect",
        net: 3200,
        hasOT: false,
        avatarBg: "rgba(48,209,88,0.10)",
        avatarColor: "rgba(48,209,88,0.85)",
      },
      {
        id: "te3",
        initials: "SF",
        name: "Sorin Florea",
        role: "Maistru + 18h OT",
        net: 2840,
        hasOT: true,
        avatarBg: "rgba(191,90,242,0.10)",
        avatarColor: "rgba(191,90,242,0.9)",
      },
      {
        id: "te4",
        initials: "LT",
        name: "Liviu Toma",
        role: "Electrician + 12h OT",
        net: 2460,
        hasOT: true,
        avatarBg: "rgba(255,159,10,0.10)",
        avatarColor: "rgba(255,159,10,0.85)",
      },
    ],
    initiatedBy: "Elena Marin",
    processingDate: "9 Iun 2026",
    estimatedPayDate: "15 Iun 2026",
    paymentMethod: "Transfer bancar",
  },
  pr2: {
    id: "pr2",
    title: "Săptămâna 1 Iun",
    subtitle: "142 angajați · 2–8 Iun 2026",
    period: "2–8 Iun 2026",
    employeeCount: 142,
    totalGross: 27900,
    netPaid: 19530,
    status: "done",
    type: "weekly",
    ref: "PR-0023",
    breakdown: [
      { label: "Salarii de bază", amount: 23800, color: null, isTotal: false },
      { label: "Ore suplimentare", amount: 2640, color: "rgba(255,159,10,0.9)", isTotal: false },
      { label: "Bonusuri performanță", amount: 860, color: "rgba(48,209,88,0.9)", isTotal: false },
      {
        label: "Contribuții angajator",
        amount: -8370,
        color: "rgba(255,69,58,0.85)",
        isTotal: false,
      },
      { label: "Impozit reținut", amount: -2800, color: "rgba(255,69,58,0.85)", isTotal: false },
      { label: "Net de plată", amount: 19530, color: "rgba(48,209,88,0.95)", isTotal: true },
    ],
    topEmployees: [
      {
        id: "te1",
        initials: "IC",
        name: "Ion Crișan",
        role: "Maistru Construcții",
        net: 3200,
        hasOT: false,
        avatarBg: "rgba(10,132,255,0.12)",
        avatarColor: "rgba(10,132,255,0.9)",
      },
      {
        id: "te2",
        initials: "EM",
        name: "Elena Marin",
        role: "Manager Proiect",
        net: 3200,
        hasOT: false,
        avatarBg: "rgba(48,209,88,0.10)",
        avatarColor: "rgba(48,209,88,0.85)",
      },
      {
        id: "te3",
        initials: "RD",
        name: "Radu Dima",
        role: "Zidar + 14h OT",
        net: 2720,
        hasOT: true,
        avatarBg: "rgba(191,90,242,0.10)",
        avatarColor: "rgba(191,90,242,0.9)",
      },
      {
        id: "te4",
        initials: "MP",
        name: "Mihai Popa",
        role: "Instalator Sanitar",
        net: 2200,
        hasOT: false,
        avatarBg: "rgba(255,159,10,0.10)",
        avatarColor: "rgba(255,159,10,0.85)",
      },
    ],
    initiatedBy: "Elena Marin",
    processingDate: "2 Iun 2026",
    estimatedPayDate: "8 Iun 2026",
    paymentMethod: "Transfer bancar",
  },
  pr3: {
    id: "pr3",
    title: "Săptămâna 4 Mai",
    subtitle: "140 angajați · 26 Mai – 1 Iun",
    period: "26 Mai – 1 Iun 2026",
    employeeCount: 140,
    totalGross: 27400,
    netPaid: 19180,
    status: "done",
    type: "weekly",
    ref: "PR-0022",
    breakdown: [
      { label: "Salarii de bază", amount: 23400, color: null, isTotal: false },
      { label: "Ore suplimentare", amount: 2480, color: "rgba(255,159,10,0.9)", isTotal: false },
      { label: "Bonusuri performanță", amount: 720, color: "rgba(48,209,88,0.9)", isTotal: false },
      {
        label: "Contribuții angajator",
        amount: -8220,
        color: "rgba(255,69,58,0.85)",
        isTotal: false,
      },
      { label: "Impozit reținut", amount: -2740, color: "rgba(255,69,58,0.85)", isTotal: false },
      { label: "Net de plată", amount: 19180, color: "rgba(48,209,88,0.95)", isTotal: true },
    ],
    topEmployees: [
      {
        id: "te1",
        initials: "IC",
        name: "Ion Crișan",
        role: "Maistru Construcții",
        net: 3200,
        hasOT: false,
        avatarBg: "rgba(10,132,255,0.12)",
        avatarColor: "rgba(10,132,255,0.9)",
      },
      {
        id: "te2",
        initials: "EM",
        name: "Elena Marin",
        role: "Manager Proiect",
        net: 3200,
        hasOT: false,
        avatarBg: "rgba(48,209,88,0.10)",
        avatarColor: "rgba(48,209,88,0.85)",
      },
      {
        id: "te3",
        initials: "DN",
        name: "Dorel Nistor",
        role: "Zugrav + 10h OT",
        net: 2380,
        hasOT: true,
        avatarBg: "rgba(191,90,242,0.10)",
        avatarColor: "rgba(191,90,242,0.9)",
      },
      {
        id: "te4",
        initials: "VB",
        name: "Vasile Bota",
        role: "Muncitor General",
        net: 1980,
        hasOT: false,
        avatarBg: "rgba(255,159,10,0.10)",
        avatarColor: "rgba(255,159,10,0.85)",
      },
    ],
    initiatedBy: "Elena Marin",
    processingDate: "26 Mai 2026",
    estimatedPayDate: "1 Iun 2026",
    paymentMethod: "Transfer bancar",
  },
  pr4: {
    id: "pr4",
    title: "Săptămâna 3 Mai",
    subtitle: "140 angajați · 19–25 Mai 2026",
    period: "19–25 Mai 2026",
    employeeCount: 140,
    totalGross: 26800,
    netPaid: 18760,
    status: "done",
    type: "weekly",
    ref: "PR-0021",
    breakdown: [
      { label: "Salarii de bază", amount: 23100, color: null, isTotal: false },
      { label: "Ore suplimentare", amount: 2180, color: "rgba(255,159,10,0.9)", isTotal: false },
      { label: "Bonusuri performanță", amount: 480, color: "rgba(48,209,88,0.9)", isTotal: false },
      {
        label: "Contribuții angajator",
        amount: -8040,
        color: "rgba(255,69,58,0.85)",
        isTotal: false,
      },
      { label: "Impozit reținut", amount: -2680, color: "rgba(255,69,58,0.85)", isTotal: false },
      { label: "Net de plată", amount: 18760, color: "rgba(48,209,88,0.95)", isTotal: true },
    ],
    topEmployees: [
      {
        id: "te1",
        initials: "IC",
        name: "Ion Crișan",
        role: "Maistru Construcții",
        net: 3200,
        hasOT: false,
        avatarBg: "rgba(10,132,255,0.12)",
        avatarColor: "rgba(10,132,255,0.9)",
      },
      {
        id: "te2",
        initials: "EM",
        name: "Elena Marin",
        role: "Manager Proiect",
        net: 3200,
        hasOT: false,
        avatarBg: "rgba(48,209,88,0.10)",
        avatarColor: "rgba(48,209,88,0.85)",
      },
      {
        id: "te3",
        initials: "SF",
        name: "Sorin Florea",
        role: "Maistru Construcții",
        net: 2600,
        hasOT: false,
        avatarBg: "rgba(191,90,242,0.10)",
        avatarColor: "rgba(191,90,242,0.9)",
      },
      {
        id: "te4",
        initials: "MP",
        name: "Mihai Popa",
        role: "Instalator + 8h OT",
        net: 2240,
        hasOT: true,
        avatarBg: "rgba(255,159,10,0.10)",
        avatarColor: "rgba(255,159,10,0.85)",
      },
    ],
    initiatedBy: "Elena Marin",
    processingDate: "19 Mai 2026",
    estimatedPayDate: "25 Mai 2026",
    paymentMethod: "Transfer bancar",
  },
  pr5: {
    id: "pr5",
    title: "Bonus Lunar Mai",
    subtitle: "142 angajați · 31 Mai 2026",
    period: "31 Mai 2026",
    employeeCount: 142,
    totalGross: 18600,
    netPaid: 13020,
    status: "done",
    type: "monthly",
    ref: "PR-0020",
    breakdown: [
      { label: "Bonus performanță", amount: 12400, color: "rgba(48,209,88,0.9)", isTotal: false },
      {
        label: "Bonus proiect finalizat",
        amount: 4200,
        color: "rgba(48,209,88,0.9)",
        isTotal: false,
      },
      {
        label: "Contribuții angajator",
        amount: -5580,
        color: "rgba(255,69,58,0.85)",
        isTotal: false,
      },
      { label: "Impozit reținut", amount: -1860, color: "rgba(255,69,58,0.85)", isTotal: false },
      { label: "Net de plată", amount: 13020, color: "rgba(48,209,88,0.95)", isTotal: true },
    ],
    topEmployees: [
      {
        id: "te1",
        initials: "AP",
        name: "Andrei Popescu",
        role: "Manager Proiect",
        net: 2800,
        hasOT: false,
        avatarBg: "rgba(10,132,255,0.12)",
        avatarColor: "rgba(10,132,255,0.9)",
      },
      {
        id: "te2",
        initials: "EM",
        name: "Elena Marin",
        role: "Manager Proiect",
        net: 2800,
        hasOT: false,
        avatarBg: "rgba(48,209,88,0.10)",
        avatarColor: "rgba(48,209,88,0.85)",
      },
      {
        id: "te3",
        initials: "IC",
        name: "Ion Crișan",
        role: "Maistru Construcții",
        net: 1600,
        hasOT: false,
        avatarBg: "rgba(191,90,242,0.10)",
        avatarColor: "rgba(191,90,242,0.9)",
      },
      {
        id: "te4",
        initials: "SF",
        name: "Sorin Florea",
        role: "Maistru Construcții",
        net: 1600,
        hasOT: false,
        avatarBg: "rgba(255,159,10,0.10)",
        avatarColor: "rgba(255,159,10,0.85)",
      },
    ],
    initiatedBy: "Elena Marin",
    processingDate: "31 Mai 2026",
    estimatedPayDate: "31 Mai 2026",
    paymentMethod: "Transfer bancar",
  },
  pr6: {
    id: "pr6",
    title: "Bonus Q1",
    subtitle: "38 angajați · 15 Apr · Aprobare necesară",
    period: "15 Apr 2026",
    employeeCount: 38,
    totalGross: 14200,
    netPaid: 9940,
    status: "pending",
    type: "special",
    ref: "PR-0019",
    breakdown: [
      {
        label: "Bonus trimestrial Q1",
        amount: 14200,
        color: "rgba(48,209,88,0.9)",
        isTotal: false,
      },
      {
        label: "Contribuții angajator",
        amount: -4260,
        color: "rgba(255,69,58,0.85)",
        isTotal: false,
      },
      { label: "Impozit reținut", amount: -1420, color: "rgba(255,69,58,0.85)", isTotal: false },
      { label: "Net de plată", amount: 9940, color: "rgba(48,209,88,0.95)", isTotal: true },
    ],
    topEmployees: [
      {
        id: "te1",
        initials: "AP",
        name: "Andrei Popescu",
        role: "Manager Proiect",
        net: 2400,
        hasOT: false,
        avatarBg: "rgba(10,132,255,0.12)",
        avatarColor: "rgba(10,132,255,0.9)",
      },
      {
        id: "te2",
        initials: "EM",
        name: "Elena Marin",
        role: "Manager Proiect",
        net: 2400,
        hasOT: false,
        avatarBg: "rgba(48,209,88,0.10)",
        avatarColor: "rgba(48,209,88,0.85)",
      },
      {
        id: "te3",
        initials: "MI",
        name: "Maria Ionescu",
        role: "Manager HR",
        net: 1800,
        hasOT: false,
        avatarBg: "rgba(191,90,242,0.10)",
        avatarColor: "rgba(191,90,242,0.9)",
      },
      {
        id: "te4",
        initials: "IC",
        name: "Ion Crișan",
        role: "Maistru Construcții",
        net: 1200,
        hasOT: false,
        avatarBg: "rgba(255,159,10,0.10)",
        avatarColor: "rgba(255,159,10,0.85)",
      },
    ],
    initiatedBy: "Maria Ionescu",
    processingDate: "15 Apr 2026",
    estimatedPayDate: "15 Apr 2026",
    paymentMethod: "Transfer bancar",
  },
}

export const GET = withGates(
  { action: "payroll.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const detail = MOCK_DETAILS[id]
    if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(detail)
  }
)
