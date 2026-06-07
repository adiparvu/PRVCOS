import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type InsightType = "recommendation" | "alert" | "forecast" | "report"
export type InsightPriority = "urgent" | "medium" | "low"
export type InsightStatus = "new" | "reviewed" | "actioned" | "dismissed"
export type ReportType = "monthly" | "inventory" | "forecast" | "performance"
export type ReportStatus = "ready" | "pending" | "scheduled"

export interface Insight {
  id: string
  type: InsightType
  priority: InsightPriority
  status: InsightStatus
  title: string
  summary: string
  affectedCount: number
  affectedLabel: string
  confidenceLabel: string
  timeAgo: string
}

export interface Report {
  id: string
  title: string
  type: ReportType
  status: ReportStatus
  statusLabel: string
  pages: number
  generatedDate: string
}

export interface StoreKpi {
  storeId: string
  storeName: string
  revenueTodayLabel: string
  revenueBarPct: number
  marginPct: number
}

export interface IntelligenceMeta {
  totalRevenueLabel: string
  revenueTrend: string
  avgMarginPct: number
  marginTrend: string
  ordersToday: number
  activeAlerts: number
}

const MOCK_INSIGHTS: Insight[] = [
  {
    id: "ins-001",
    type: "recommendation",
    priority: "urgent",
    status: "new",
    title: "3 Magazine sub Pragul de Performanță",
    summary: "Risc de pierderi în Q3 dacă nu se iau măsuri corective în 14 zile.",
    affectedCount: 3,
    affectedLabel: "magazine afectate",
    confidenceLabel: "Conf. 89%",
    timeAgo: "acum 2h",
  },
  {
    id: "ins-002",
    type: "alert",
    priority: "urgent",
    status: "new",
    title: "Stoc Critic — 5 SKU-uri sub Prag",
    summary: "Iași și Brașov vor rămâne fără stoc în 48h dacă nu se reaprovizionează.",
    affectedCount: 2,
    affectedLabel: "magazine",
    confidenceLabel: "Date live",
    timeAgo: "acum 45 min",
  },
  {
    id: "ins-003",
    type: "forecast",
    priority: "medium",
    status: "reviewed",
    title: "Prognoză Venituri Q3 2026",
    summary: "Model AI estimează creștere de 12% față de Q2, cu incertitudine ±5%.",
    affectedCount: 18,
    affectedLabel: "magazine incluse",
    confidenceLabel: "Conf. 87%",
    timeAgo: "azi",
  },
  {
    id: "ins-004",
    type: "recommendation",
    priority: "medium",
    status: "new",
    title: "Optimizare Personal — Timișoara",
    summary: "Raportat cost/vânzare 18% mai mare față de media rețelei.",
    affectedCount: 1,
    affectedLabel: "magazin",
    confidenceLabel: "Conf. 82%",
    timeAgo: "ieri",
  },
  {
    id: "ins-005",
    type: "forecast",
    priority: "low",
    status: "reviewed",
    title: "Tendință Marjă — Lunile 6–9",
    summary: "Reducere treptată a marjei cu 2pp anticipată pe fondul inflației.",
    affectedCount: 18,
    affectedLabel: "magazine",
    confidenceLabel: "Conf. 75%",
    timeAgo: "acum 3 zile",
  },
]

const MOCK_REPORTS: Report[] = [
  {
    id: "rep-001",
    title: "Raport Lunar · Mai 2026",
    type: "monthly",
    status: "ready",
    statusLabel: "Finalizat",
    pages: 14,
    generatedDate: "1 Iun 2026",
  },
  {
    id: "rep-002",
    title: "Raport Stocuri Critice",
    type: "inventory",
    status: "ready",
    statusLabel: "Revizuiește",
    pages: 6,
    generatedDate: "7 Iun 2026",
  },
  {
    id: "rep-003",
    title: "Prognoză Q3 2026",
    type: "forecast",
    status: "ready",
    statusLabel: "AI",
    pages: 9,
    generatedDate: "5 Iun 2026",
  },
  {
    id: "rep-004",
    title: "Raport Performanță Echipe",
    type: "performance",
    status: "scheduled",
    statusLabel: "Programat",
    pages: 0,
    generatedDate: "10 Iun 2026",
  },
]

const MOCK_STORE_KPIS: StoreKpi[] = [
  {
    storeId: "cluj-main",
    storeName: "Cluj · Main",
    revenueTodayLabel: "€34.2k",
    revenueBarPct: 88,
    marginPct: 39,
  },
  {
    storeId: "bucuresti-floreasca",
    storeName: "București",
    revenueTodayLabel: "€28.9k",
    revenueBarPct: 75,
    marginPct: 34,
  },
  {
    storeId: "timisoara-iulius",
    storeName: "Timișoara",
    revenueTodayLabel: "€21.4k",
    revenueBarPct: 55,
    marginPct: 31,
  },
  {
    storeId: "brasov-coresi",
    storeName: "Brașov",
    revenueTodayLabel: "€18.6k",
    revenueBarPct: 48,
    marginPct: 29,
  },
  {
    storeId: "iasi-palas",
    storeName: "Iași",
    revenueTodayLabel: "€15.2k",
    revenueBarPct: 39,
    marginPct: 27,
  },
]

const MOCK_META: IntelligenceMeta = {
  totalRevenueLabel: "€118k",
  revenueTrend: "+8%",
  avgMarginPct: 34,
  marginTrend: "−1pp",
  ordersToday: 93,
  activeAlerts: 2,
}

export const GET = withGates(
  { action: "intelligence.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const type = req.nextUrl.searchParams.get("type")
    const priority = req.nextUrl.searchParams.get("priority")

    let insights = MOCK_INSIGHTS
    if (type) insights = insights.filter((i) => i.type === type)
    if (priority) insights = insights.filter((i) => i.priority === priority)

    return NextResponse.json({
      insights,
      reports: MOCK_REPORTS,
      storeKpis: MOCK_STORE_KPIS,
      meta: MOCK_META,
    })
  }
)
