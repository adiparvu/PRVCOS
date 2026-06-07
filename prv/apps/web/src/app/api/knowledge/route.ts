import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ArticleType = "sop" | "policy" | "guide" | "faq"
export type ArticleCategory = "operations" | "hr" | "finance" | "procurement" | "fleet" | "projects"

export interface KnowledgeArticle {
  id: string
  title: string
  type: ArticleType
  typeLabel: string
  category: ArticleCategory
  categoryLabel: string
  author: string
  updatedDate: string
  readMinutes: number
  views: number
  version: string | null
  isPinned: boolean
  readProgress: number
}

export interface KnowledgeMeta {
  total: number
  sopCount: number
  recentlyUpdated: number
}

const MOCK_ARTICLES: KnowledgeArticle[] = [
  {
    id: "sop-14",
    title: "SOP-14 · Protocol Siguranță pe Șantier",
    type: "sop",
    typeLabel: "SOP",
    category: "operations",
    categoryLabel: "Operațiuni",
    author: "Maria Ionescu",
    updatedDate: "1 Iun 2026",
    readMinutes: 8,
    views: 988,
    version: "v4.2",
    isPinned: true,
    readProgress: 60,
  },
  {
    id: "sop-07",
    title: "SOP-07 · Recepție Materiale",
    type: "sop",
    typeLabel: "SOP",
    category: "procurement",
    categoryLabel: "Procurare",
    author: "Maria Ionescu",
    updatedDate: "15 Mai 2026",
    readMinutes: 5,
    views: 412,
    version: "v2.1",
    isPinned: false,
    readProgress: 0,
  },
  {
    id: "sop-11",
    title: "SOP-11 · Procedură Incident Șantier",
    type: "sop",
    typeLabel: "SOP",
    category: "operations",
    categoryLabel: "Operațiuni",
    author: "Maria Ionescu",
    updatedDate: "20 Apr 2026",
    readMinutes: 5,
    views: 334,
    version: "v3.0",
    isPinned: false,
    readProgress: 0,
  },
  {
    id: "sop-03",
    title: "SOP-03 · Inspecție Echipamente Zilnică",
    type: "sop",
    typeLabel: "SOP",
    category: "fleet",
    categoryLabel: "Flotă",
    author: "Maria Ionescu",
    updatedDate: "10 Apr 2026",
    readMinutes: 4,
    views: 289,
    version: "v1.5",
    isPinned: false,
    readProgress: 100,
  },
  {
    id: "sop-09",
    title: "SOP-09 · Gestionare Deșeuri pe Șantier",
    type: "sop",
    typeLabel: "SOP",
    category: "operations",
    categoryLabel: "Operațiuni",
    author: "Sorin Florea",
    updatedDate: "5 Mar 2026",
    readMinutes: 6,
    views: 201,
    version: "v2.0",
    isPinned: false,
    readProgress: 0,
  },
  {
    id: "sop-02",
    title: "SOP-02 · Procedură Comandă Urgentă",
    type: "sop",
    typeLabel: "SOP",
    category: "procurement",
    categoryLabel: "Procurare",
    author: "Maria Ionescu",
    updatedDate: "1 Mar 2026",
    readMinutes: 3,
    views: 178,
    version: "v1.0",
    isPinned: false,
    readProgress: 0,
  },
  {
    id: "sop-05",
    title: "SOP-05 · Predare-Primire Proiect",
    type: "sop",
    typeLabel: "SOP",
    category: "projects",
    categoryLabel: "Proiecte",
    author: "Andrei Popescu",
    updatedDate: "20 Feb 2026",
    readMinutes: 7,
    views: 144,
    version: "v1.2",
    isPinned: false,
    readProgress: 0,
  },
  {
    id: "sop-01",
    title: "SOP-01 · Onboarding Angajat Nou",
    type: "sop",
    typeLabel: "SOP",
    category: "hr",
    categoryLabel: "HR",
    author: "Maria Ionescu",
    updatedDate: "10 Feb 2026",
    readMinutes: 10,
    views: 654,
    version: "v5.0",
    isPinned: false,
    readProgress: 0,
  },
  {
    id: "pol-leave",
    title: "Politică Concedii & Absențe 2026",
    type: "policy",
    typeLabel: "Politică",
    category: "hr",
    categoryLabel: "HR",
    author: "Maria Ionescu",
    updatedDate: "15 Mai 2026",
    readMinutes: 12,
    views: 2100,
    version: "v2.0",
    isPinned: false,
    readProgress: 0,
  },
  {
    id: "pol-ppe",
    title: "Politică Echipamente de Protecție",
    type: "policy",
    typeLabel: "Politică",
    category: "hr",
    categoryLabel: "HR",
    author: "Maria Ionescu",
    updatedDate: "1 Apr 2026",
    readMinutes: 6,
    views: 876,
    version: "v1.1",
    isPinned: false,
    readProgress: 0,
  },
  {
    id: "pol-expense",
    title: "Politică Cheltuieli și Deconturi",
    type: "policy",
    typeLabel: "Politică",
    category: "finance",
    categoryLabel: "Finanțe",
    author: "Elena Marin",
    updatedDate: "10 Mar 2026",
    readMinutes: 9,
    views: 1340,
    version: "v3.0",
    isPinned: false,
    readProgress: 0,
  },
  {
    id: "guide-onboard",
    title: "Onboarding Angajat Nou — Săptămâna 1",
    type: "guide",
    typeLabel: "Ghid",
    category: "hr",
    categoryLabel: "HR",
    author: "Maria Ionescu",
    updatedDate: "20 Apr 2026",
    readMinutes: 15,
    views: 876,
    version: "v3.1",
    isPinned: false,
    readProgress: 0,
  },
  {
    id: "guide-project",
    title: "Ghid Deschidere Proiect Nou",
    type: "guide",
    typeLabel: "Ghid",
    category: "projects",
    categoryLabel: "Proiecte",
    author: "Andrei Popescu",
    updatedDate: "5 Iun 2026",
    readMinutes: 11,
    views: 532,
    version: "v2.0",
    isPinned: false,
    readProgress: 0,
  },
  {
    id: "faq-expense",
    title: "Cum completezi un raport de cheltuieli",
    type: "faq",
    typeLabel: "FAQ",
    category: "finance",
    categoryLabel: "Finanțe",
    author: "Elena Marin",
    updatedDate: "1 Iun 2026",
    readMinutes: 4,
    views: 1400,
    version: "v1.0",
    isPinned: false,
    readProgress: 0,
  },
  {
    id: "faq-leave",
    title: "Cum soliciți o zi liberă",
    type: "faq",
    typeLabel: "FAQ",
    category: "hr",
    categoryLabel: "HR",
    author: "Maria Ionescu",
    updatedDate: "20 Mar 2026",
    readMinutes: 3,
    views: 1820,
    version: null,
    isPinned: false,
    readProgress: 0,
  },
]

function computeMeta(articles: KnowledgeArticle[]): KnowledgeMeta {
  return {
    total: articles.length,
    sopCount: articles.filter((a) => a.type === "sop").length,
    recentlyUpdated: articles.filter(
      (a) => a.updatedDate.includes("Iun") || a.updatedDate.includes("Mai")
    ).length,
  }
}

export const GET = withGates(
  { action: "knowledge.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const type = req.nextUrl.searchParams.get("type")
    const category = req.nextUrl.searchParams.get("category")
    let results = MOCK_ARTICLES
    if (type) results = results.filter((a) => a.type === type)
    if (category) results = results.filter((a) => a.category === category)
    const meta = computeMeta(MOCK_ARTICLES)
    return NextResponse.json({ articles: results, count: results.length, meta })
  }
)
