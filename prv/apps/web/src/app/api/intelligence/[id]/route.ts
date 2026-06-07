import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import type { InsightType, InsightPriority, InsightStatus } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface AffectedStore {
  storeId: string
  storeName: string
  statusDot: "red" | "amber" | "green"
  metricLabel: string
  metricValue: string
  detail: string
}

export interface Recommendation {
  id: string
  title: string
  priority: "urgent" | "medium" | "low"
  deadline: string
}

export interface InsightDetail {
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
  score: number
  riskLabel: string
  riskDeadline: string
  dataSource: string
  affectedStores: AffectedStore[]
  recommendations: Recommendation[]
}

const MOCK_DETAILS: Record<string, InsightDetail> = {
  "ins-001": {
    id: "ins-001",
    type: "recommendation",
    priority: "urgent",
    status: "new",
    title: "3 Magazine sub Pragul de Performanță",
    summary:
      "Risc moderat de scădere a veniturilor în Q3 dacă nu se iau măsuri corective în următoarele 14 zile.",
    affectedCount: 3,
    affectedLabel: "magazine afectate",
    confidenceLabel: "Conf. 89%",
    timeAgo: "acum 2h",
    score: 73,
    riskLabel: "Risc moderat",
    riskDeadline: "14 zile",
    dataSource: "Bazat pe date istorice · 18 luni",
    affectedStores: [
      {
        storeId: "brasov-coresi",
        storeName: "Brașov · Coresi",
        statusDot: "amber",
        metricLabel: "marjă",
        metricValue: "29%",
        detail: "Marjă −4pp · Comenzi −12%",
      },
      {
        storeId: "iasi-palas",
        storeName: "Iași · Palas",
        statusDot: "red",
        metricLabel: "marjă",
        metricValue: "27%",
        detail: "Stoc redus · 3 SKU · Alerte active",
      },
      {
        storeId: "timisoara-iulius",
        storeName: "Timișoara · Iulius",
        statusDot: "amber",
        metricLabel: "marjă",
        metricValue: "31%",
        detail: "Creștere 0% · Marjă stagnantă",
      },
    ],
    recommendations: [
      {
        id: "r1",
        title: "Audit inventar pentru magazinele Brașov și Iași",
        priority: "urgent",
        deadline: "Această săptămână",
      },
      {
        id: "r2",
        title: "Training suplimentar echipă vânzări Timișoara",
        priority: "medium",
        deadline: "Luna aceasta",
      },
      {
        id: "r3",
        title: "Revizuire strategie prețuri în Q3",
        priority: "medium",
        deadline: "Q3 2026",
      },
    ],
  },
  "ins-002": {
    id: "ins-002",
    type: "alert",
    priority: "urgent",
    status: "new",
    title: "Stoc Critic — 5 SKU-uri sub Prag",
    summary:
      "Iași și Brașov vor rămâne fără stoc pentru 5 SKU-uri critice în mai puțin de 48h dacă nu se lansează comenzi de reaprovizionare.",
    affectedCount: 2,
    affectedLabel: "magazine",
    confidenceLabel: "Date live",
    timeAgo: "acum 45 min",
    score: 91,
    riskLabel: "Risc ridicat",
    riskDeadline: "48 ore",
    dataSource: "Sistem inventar · Date live",
    affectedStores: [
      {
        storeId: "iasi-palas",
        storeName: "Iași · Palas",
        statusDot: "red",
        metricLabel: "SKU-uri",
        metricValue: "3",
        detail: "Hârtie renovare, Primer siliconic, Vopsea lavabilă",
      },
      {
        storeId: "brasov-coresi",
        storeName: "Brașov · Coresi",
        statusDot: "amber",
        metricLabel: "SKU-uri",
        metricValue: "2",
        detail: "Polistiren expandat, Spumă PU",
      },
    ],
    recommendations: [
      {
        id: "r1",
        title: "Lansează comandă urgentă furnizori principali",
        priority: "urgent",
        deadline: "Azi",
      },
      {
        id: "r2",
        title: "Transfer stoc din depozitul central",
        priority: "urgent",
        deadline: "Mâine",
      },
      {
        id: "r3",
        title: "Revizuire prag minim stoc pentru toate SKU-urile",
        priority: "low",
        deadline: "Luna aceasta",
      },
    ],
  },
  "ins-003": {
    id: "ins-003",
    type: "forecast",
    priority: "medium",
    status: "reviewed",
    title: "Prognoză Venituri Q3 2026",
    summary:
      "Modelul AI estimează o creștere de 12% a veniturilor față de Q2 2026, cu interval de incertitudine de ±5%.",
    affectedCount: 18,
    affectedLabel: "magazine incluse",
    confidenceLabel: "Conf. 87%",
    timeAgo: "azi",
    score: 87,
    riskLabel: "Prognoză pozitivă",
    riskDeadline: "Q3 2026",
    dataSource: "Model AI · Regresie liniară + sezonalitate",
    affectedStores: [
      {
        storeId: "cluj-main",
        storeName: "Cluj · Main",
        statusDot: "green",
        metricLabel: "creștere est.",
        metricValue: "+15%",
        detail: "Performanță constantă",
      },
      {
        storeId: "bucuresti-floreasca",
        storeName: "București",
        statusDot: "green",
        metricLabel: "creștere est.",
        metricValue: "+11%",
        detail: "Trend pozitiv",
      },
      {
        storeId: "timisoara-iulius",
        storeName: "Timișoara",
        statusDot: "amber",
        metricLabel: "creștere est.",
        metricValue: "+4%",
        detail: "Sub potențial",
      },
    ],
    recommendations: [
      {
        id: "r1",
        title: "Investiție marketing Q3 în top 3 magazine",
        priority: "medium",
        deadline: "Iulie 2026",
      },
      {
        id: "r2",
        title: "Planificare stoc sezonier Q3",
        priority: "medium",
        deadline: "Iunie 2026",
      },
      {
        id: "r3",
        title: "Program motivare vânzări pentru echipele Timișoara",
        priority: "low",
        deadline: "Iulie 2026",
      },
    ],
  },
  "ins-004": {
    id: "ins-004",
    type: "recommendation",
    priority: "medium",
    status: "new",
    title: "Optimizare Personal — Timișoara",
    summary:
      "Costul per vânzare la Timișoara este cu 18% mai mare decât media rețelei, sugerând ineficiențe operaționale.",
    affectedCount: 1,
    affectedLabel: "magazin",
    confidenceLabel: "Conf. 82%",
    timeAgo: "ieri",
    score: 62,
    riskLabel: "Risc moderat",
    riskDeadline: "1 lună",
    dataSource: "Analiză cost operațional · Comparativ rețea",
    affectedStores: [
      {
        storeId: "timisoara-iulius",
        storeName: "Timișoara · Iulius",
        statusDot: "amber",
        metricLabel: "cost/vânzare",
        metricValue: "+18%",
        detail: "9 angajați · Schimb 09–17",
      },
    ],
    recommendations: [
      {
        id: "r1",
        title: "Audit program de lucru și rotație ture",
        priority: "medium",
        deadline: "Această lună",
      },
      {
        id: "r2",
        title: "Training eficiență vânzări",
        priority: "medium",
        deadline: "Luna viitoare",
      },
      {
        id: "r3",
        title: "Analiză KPI individual angajați",
        priority: "low",
        deadline: "Trimestrul acesta",
      },
    ],
  },
  "ins-005": {
    id: "ins-005",
    type: "forecast",
    priority: "low",
    status: "reviewed",
    title: "Tendință Marjă — Lunile 6–9",
    summary:
      "Reducere treptată a marjei brute cu ~2pp este anticipată din cauza inflației materialelor și creșterii costurilor logistice.",
    affectedCount: 18,
    affectedLabel: "magazine",
    confidenceLabel: "Conf. 75%",
    timeAgo: "acum 3 zile",
    score: 55,
    riskLabel: "Risc scăzut",
    riskDeadline: "6 luni",
    dataSource: "Model AI · Analiză inflație + costuri logistice",
    affectedStores: [
      {
        storeId: "iasi-palas",
        storeName: "Iași · Palas",
        statusDot: "red",
        metricLabel: "marjă est.",
        metricValue: "25%",
        detail: "Risc maxim la marjă",
      },
      {
        storeId: "brasov-coresi",
        storeName: "Brașov · Coresi",
        statusDot: "amber",
        metricLabel: "marjă est.",
        metricValue: "27%",
        detail: "Risc mediu",
      },
    ],
    recommendations: [
      {
        id: "r1",
        title: "Renegociere contracte furnizori principali",
        priority: "medium",
        deadline: "Q3 2026",
      },
      {
        id: "r2",
        title: "Analiză prețuri concurență și ajustare catalog",
        priority: "low",
        deadline: "Trimestrul acesta",
      },
    ],
  },
}

function fallbackDetail(id: string): InsightDetail {
  return {
    id,
    type: "recommendation",
    priority: "medium",
    status: "new",
    title: id,
    summary: "—",
    affectedCount: 0,
    affectedLabel: "—",
    confidenceLabel: "—",
    timeAgo: "—",
    score: 0,
    riskLabel: "—",
    riskDeadline: "—",
    dataSource: "—",
    affectedStores: [],
    recommendations: [],
  }
}

export const GET = withGates(
  { action: "intelligence.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const detail = MOCK_DETAILS[id] ?? fallbackDetail(id)
    return NextResponse.json(detail)
  }
)
