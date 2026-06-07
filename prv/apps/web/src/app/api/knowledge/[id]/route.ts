import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import type { ArticleType, ArticleCategory } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface ChecklistItem {
  id: string
  label: string
  checked: boolean
}

export interface TocSection {
  id: string
  index: number
  title: string
}

export interface RelatedArticle {
  id: string
  title: string
  type: ArticleType
  typeLabel: string
  category: ArticleCategory
  categoryLabel: string
  readMinutes: number
}

export interface KnowledgeArticleDetail {
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
  checklist: ChecklistItem[] | null
  toc: TocSection[]
  related: RelatedArticle[]
}

const MOCK_DETAILS: Record<string, KnowledgeArticleDetail> = {
  "sop-14": {
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
    checklist: [
      { id: "c1", label: "Cască protecție EN397", checked: true },
      { id: "c2", label: "Vestă vizibilitate Clasa 2", checked: true },
      { id: "c3", label: "Bocanci protecție S3", checked: false },
      { id: "c4", label: "Mănuși EN388", checked: false },
    ],
    toc: [
      { id: "t1", index: 1, title: "Scop și Domeniu de Aplicare" },
      { id: "t2", index: 2, title: "Echipament Individual de Protecție" },
      { id: "t3", index: 3, title: "Proceduri de Intrare pe Șantier" },
      { id: "t4", index: 4, title: "Răspuns în Situații de Urgență" },
      { id: "t5", index: 5, title: "Raportarea Incidentelor" },
    ],
    related: [
      {
        id: "pol-ppe",
        title: "Politică Echipamente de Protecție",
        type: "policy",
        typeLabel: "Politică",
        category: "hr",
        categoryLabel: "HR",
        readMinutes: 6,
      },
      {
        id: "sop-11",
        title: "SOP-11 · Procedură Incident Șantier",
        type: "sop",
        typeLabel: "SOP",
        category: "operations",
        categoryLabel: "Operațiuni",
        readMinutes: 5,
      },
    ],
  },
  "sop-07": {
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
    checklist: [
      { id: "c1", label: "Verifică bon de comandă", checked: false },
      { id: "c2", label: "Numără cantitățile primite", checked: false },
      { id: "c3", label: "Inspecție vizuală calitate", checked: false },
      { id: "c4", label: "Semnează avizul de expediție", checked: false },
    ],
    toc: [
      { id: "t1", index: 1, title: "Pregătirea Recepției" },
      { id: "t2", index: 2, title: "Verificarea Documentelor" },
      { id: "t3", index: 3, title: "Inspecția Fizică" },
      { id: "t4", index: 4, title: "Înregistrarea în Sistem" },
    ],
    related: [
      {
        id: "sop-02",
        title: "SOP-02 · Comandă Urgentă",
        type: "sop",
        typeLabel: "SOP",
        category: "procurement",
        categoryLabel: "Procurare",
        readMinutes: 3,
      },
      {
        id: "pol-expense",
        title: "Politică Cheltuieli și Deconturi",
        type: "policy",
        typeLabel: "Politică",
        category: "finance",
        categoryLabel: "Finanțe",
        readMinutes: 9,
      },
    ],
  },
  "pol-leave": {
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
    checklist: null,
    toc: [
      { id: "t1", index: 1, title: "Drept la Concediu Anual" },
      { id: "t2", index: 2, title: "Solicitarea Concediului" },
      { id: "t3", index: 3, title: "Concediu Medical" },
      { id: "t4", index: 4, title: "Concediu Fără Plată" },
      { id: "t5", index: 5, title: "Zile Libere Legale" },
    ],
    related: [
      {
        id: "faq-leave",
        title: "Cum soliciți o zi liberă",
        type: "faq",
        typeLabel: "FAQ",
        category: "hr",
        categoryLabel: "HR",
        readMinutes: 3,
      },
      {
        id: "sop-01",
        title: "SOP-01 · Onboarding Angajat Nou",
        type: "sop",
        typeLabel: "SOP",
        category: "hr",
        categoryLabel: "HR",
        readMinutes: 10,
      },
    ],
  },
  "guide-onboard": {
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
    checklist: [
      { id: "c1", label: "Ziua 1: Întâmpinare & tur birou", checked: false },
      { id: "c2", label: "Configurare acces sisteme IT", checked: false },
      { id: "c3", label: "Întâlnire cu echipa directă", checked: false },
      { id: "c4", label: "Primire echipament de lucru", checked: false },
      { id: "c5", label: "Primul proiect asignat", checked: false },
    ],
    toc: [
      { id: "t1", index: 1, title: "Checklist Ziua 1" },
      { id: "t2", index: 2, title: "Configurare Acces Sisteme" },
      { id: "t3", index: 3, title: "Cunoașterea Echipei" },
      { id: "t4", index: 4, title: "Primul Proiect Asignat" },
    ],
    related: [
      {
        id: "sop-01",
        title: "SOP-01 · Onboarding Angajat Nou",
        type: "sop",
        typeLabel: "SOP",
        category: "hr",
        categoryLabel: "HR",
        readMinutes: 10,
      },
      {
        id: "pol-leave",
        title: "Politică Concedii & Absențe",
        type: "policy",
        typeLabel: "Politică",
        category: "hr",
        categoryLabel: "HR",
        readMinutes: 12,
      },
    ],
  },
  "faq-expense": {
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
    checklist: null,
    toc: [
      { id: "t1", index: 1, title: "Ce cheltuieli sunt eligibile" },
      { id: "t2", index: 2, title: "Completarea formularului" },
      { id: "t3", index: 3, title: "Atașarea bonurilor fiscale" },
      { id: "t4", index: 4, title: "Trimiterea spre aprobare" },
    ],
    related: [
      {
        id: "pol-expense",
        title: "Politică Cheltuieli și Deconturi",
        type: "policy",
        typeLabel: "Politică",
        category: "finance",
        categoryLabel: "Finanțe",
        readMinutes: 9,
      },
    ],
  },
  "guide-project": {
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
    checklist: [
      { id: "c1", label: "Creare fișă de proiect", checked: false },
      { id: "c2", label: "Asignare manager proiect", checked: false },
      { id: "c3", label: "Definire echipă și roluri", checked: false },
      { id: "c4", label: "Configurare jaloane principale", checked: false },
    ],
    toc: [
      { id: "t1", index: 1, title: "Documentele Necesare" },
      { id: "t2", index: 2, title: "Configurarea în Sistem" },
      { id: "t3", index: 3, title: "Asignarea Echipei" },
      { id: "t4", index: 4, title: "Planificarea Jaloanelor" },
      { id: "t5", index: 5, title: "Kickoff cu Clientul" },
    ],
    related: [
      {
        id: "sop-05",
        title: "SOP-05 · Predare-Primire Proiect",
        type: "sop",
        typeLabel: "SOP",
        category: "projects",
        categoryLabel: "Proiecte",
        readMinutes: 7,
      },
      {
        id: "sop-14",
        title: "SOP-14 · Siguranță pe Șantier",
        type: "sop",
        typeLabel: "SOP",
        category: "operations",
        categoryLabel: "Operațiuni",
        readMinutes: 8,
      },
    ],
  },
}

function fallbackDetail(id: string): KnowledgeArticleDetail {
  return {
    id,
    title: id,
    type: "sop",
    typeLabel: "SOP",
    category: "operations",
    categoryLabel: "Operațiuni",
    author: "—",
    updatedDate: "—",
    readMinutes: 5,
    views: 0,
    version: null,
    isPinned: false,
    readProgress: 0,
    checklist: null,
    toc: [],
    related: [],
  }
}

export const GET = withGates(
  { action: "knowledge.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const detail = MOCK_DETAILS[id] ?? fallbackDetail(id)
    return NextResponse.json(detail)
  }
)
