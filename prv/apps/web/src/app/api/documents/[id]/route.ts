import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import type { DocStatus, DocCategory, DocExt } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface ActivityEvent {
  id: string
  label: string
  actor: string
  timestamp: string
  color: string
  done: boolean
}

export interface DocumentDetail {
  id: string
  name: string
  ext: DocExt
  category: DocCategory
  categoryLabel: string
  author: string
  date: string
  sizeLabel: string
  status: DocStatus
  project: string | null
  expiresAt: string | null
  version: string | null
  pages: number | null
  signedBy: string | null
  signedAt: string | null
  activity: ActivityEvent[]
}

const MOCK_DETAILS: Record<string, DocumentDetail> = {
  doc1: {
    id: "doc1",
    name: "Contract_Renovare_A4Brasov.pdf",
    ext: "PDF",
    category: "contracts",
    categoryLabel: "Contracte",
    author: "Andrei Popescu",
    date: "3 Iun 2026",
    sizeLabel: "2.4 MB",
    status: "pending",
    project: "A4 Brașov",
    expiresAt: "12 Iun 2026",
    version: "v2.1",
    pages: 18,
    signedBy: null,
    signedAt: null,
    activity: [
      {
        id: "a1",
        label: "Trimis spre semnare",
        actor: "Andrei Popescu",
        timestamp: "Ieri, 14:32",
        color: "rgba(255,159,10,0.9)",
        done: true,
      },
      {
        id: "a2",
        label: "Versiune v2.1 încărcată",
        actor: "Andrei Popescu",
        timestamp: "3 Iun, 09:15",
        color: "rgba(10,132,255,0.9)",
        done: true,
      },
      {
        id: "a3",
        label: "Document creat v1.0",
        actor: "Andrei Popescu",
        timestamp: "28 Mai, 11:00",
        color: "rgba(255,255,255,0.25)",
        done: false,
      },
    ],
  },
  doc2: {
    id: "doc2",
    name: "Subcontract_Manopera_Electrici.pdf",
    ext: "PDF",
    category: "contracts",
    categoryLabel: "Contracte",
    author: "Elena Marin",
    date: "5 Iun 2026",
    sizeLabel: "1.1 MB",
    status: "pending",
    project: "Cluj Mănăștur",
    expiresAt: null,
    version: "v1.0",
    pages: 12,
    signedBy: null,
    signedAt: null,
    activity: [
      {
        id: "a1",
        label: "Trimis spre semnare",
        actor: "Elena Marin",
        timestamp: "5 Iun, 16:44",
        color: "rgba(255,159,10,0.9)",
        done: true,
      },
      {
        id: "a2",
        label: "Document creat v1.0",
        actor: "Elena Marin",
        timestamp: "5 Iun, 10:20",
        color: "rgba(255,255,255,0.25)",
        done: false,
      },
    ],
  },
  doc3: {
    id: "doc3",
    name: "Contract_Furnizor_Materiale.pdf",
    ext: "PDF",
    category: "contracts",
    categoryLabel: "Contracte",
    author: "Maria Ionescu",
    date: "28 Mai 2026",
    sizeLabel: "1.8 MB",
    status: "pending",
    project: null,
    expiresAt: "30 Iun 2026",
    version: "v1.2",
    pages: 24,
    signedBy: null,
    signedAt: null,
    activity: [
      {
        id: "a1",
        label: "Trimis spre semnare",
        actor: "Maria Ionescu",
        timestamp: "1 Iun, 09:00",
        color: "rgba(255,159,10,0.9)",
        done: true,
      },
      {
        id: "a2",
        label: "Versiune v1.2 actualizată",
        actor: "Maria Ionescu",
        timestamp: "30 Mai, 15:30",
        color: "rgba(10,132,255,0.9)",
        done: true,
      },
      {
        id: "a3",
        label: "Document creat v1.0",
        actor: "Maria Ionescu",
        timestamp: "28 Mai, 11:00",
        color: "rgba(255,255,255,0.25)",
        done: false,
      },
    ],
  },
  doc4: {
    id: "doc4",
    name: "Acord_Confidentialitate_RD.pdf",
    ext: "PDF",
    category: "hr",
    categoryLabel: "HR",
    author: "Maria Ionescu",
    date: "1 Iun 2026",
    sizeLabel: "0.3 MB",
    status: "pending",
    project: null,
    expiresAt: null,
    version: "v1.0",
    pages: 4,
    signedBy: null,
    signedAt: null,
    activity: [
      {
        id: "a1",
        label: "Trimis spre semnare lui Radu Dima",
        actor: "Maria Ionescu",
        timestamp: "1 Iun, 14:00",
        color: "rgba(255,159,10,0.9)",
        done: true,
      },
      {
        id: "a2",
        label: "Document creat v1.0",
        actor: "Maria Ionescu",
        timestamp: "1 Iun, 11:30",
        color: "rgba(255,255,255,0.25)",
        done: false,
      },
    ],
  },
  doc5: {
    id: "doc5",
    name: "Factura_Materiale_Mai2026.pdf",
    ext: "PDF",
    category: "invoices",
    categoryLabel: "Facturi",
    author: "Maria Ionescu",
    date: "7 Iun 2026",
    sizeLabel: "0.8 MB",
    status: "signed",
    project: null,
    expiresAt: null,
    version: null,
    pages: 3,
    signedBy: "Andrei Popescu",
    signedAt: "7 Iun 2026, 10:15",
    activity: [
      {
        id: "a1",
        label: "Semnat de Andrei Popescu",
        actor: "Andrei Popescu",
        timestamp: "7 Iun, 10:15",
        color: "rgba(48,209,88,0.9)",
        done: true,
      },
      {
        id: "a2",
        label: "Document încărcat",
        actor: "Maria Ionescu",
        timestamp: "7 Iun, 09:40",
        color: "rgba(10,132,255,0.9)",
        done: true,
      },
    ],
  },
  doc6: {
    id: "doc6",
    name: "Raport_Proiect_Cluj14_Iun.docx",
    ext: "DOC",
    category: "projects",
    categoryLabel: "Proiecte",
    author: "Andrei Popescu",
    date: "6 Iun 2026",
    sizeLabel: "0.4 MB",
    status: "draft",
    project: "Cluj 14",
    expiresAt: null,
    version: "v0.3",
    pages: 8,
    signedBy: null,
    signedAt: null,
    activity: [
      {
        id: "a1",
        label: "Versiune v0.3 salvată",
        actor: "Andrei Popescu",
        timestamp: "6 Iun, 17:20",
        color: "rgba(10,132,255,0.9)",
        done: true,
      },
      {
        id: "a2",
        label: "Versiune v0.2 salvată",
        actor: "Andrei Popescu",
        timestamp: "5 Iun, 14:55",
        color: "rgba(10,132,255,0.9)",
        done: true,
      },
      {
        id: "a3",
        label: "Document creat v0.1",
        actor: "Andrei Popescu",
        timestamp: "4 Iun, 09:00",
        color: "rgba(255,255,255,0.25)",
        done: false,
      },
    ],
  },
  doc7: {
    id: "doc7",
    name: "Contract_Renovare_ClujManastur.pdf",
    ext: "PDF",
    category: "contracts",
    categoryLabel: "Contracte",
    author: "Andrei Popescu",
    date: "4 Iun 2026",
    sizeLabel: "2.1 MB",
    status: "signed",
    project: "Cluj Mănăștur",
    expiresAt: "4 Iun 2027",
    version: "v1.0",
    pages: 16,
    signedBy: "Elena Marin",
    signedAt: "4 Iun 2026, 15:30",
    activity: [
      {
        id: "a1",
        label: "Semnat de Elena Marin",
        actor: "Elena Marin",
        timestamp: "4 Iun, 15:30",
        color: "rgba(48,209,88,0.9)",
        done: true,
      },
      {
        id: "a2",
        label: "Trimis spre semnare",
        actor: "Andrei Popescu",
        timestamp: "4 Iun, 11:00",
        color: "rgba(255,159,10,0.9)",
        done: true,
      },
      {
        id: "a3",
        label: "Document creat v1.0",
        actor: "Andrei Popescu",
        timestamp: "3 Iun, 16:00",
        color: "rgba(255,255,255,0.25)",
        done: false,
      },
    ],
  },
  doc8: {
    id: "doc8",
    name: "Deviz_Lucrari_A4Brasov.xls",
    ext: "XLS",
    category: "projects",
    categoryLabel: "Proiecte",
    author: "Elena Marin",
    date: "2 Iun 2026",
    sizeLabel: "1.2 MB",
    status: "signed",
    project: "A4 Brașov",
    expiresAt: null,
    version: "v3.0",
    pages: null,
    signedBy: "Andrei Popescu",
    signedAt: "2 Iun 2026, 12:45",
    activity: [
      {
        id: "a1",
        label: "Aprobat de Andrei Popescu",
        actor: "Andrei Popescu",
        timestamp: "2 Iun, 12:45",
        color: "rgba(48,209,88,0.9)",
        done: true,
      },
      {
        id: "a2",
        label: "Versiune v3.0 finalizată",
        actor: "Elena Marin",
        timestamp: "2 Iun, 10:00",
        color: "rgba(10,132,255,0.9)",
        done: true,
      },
      {
        id: "a3",
        label: "Document creat v1.0",
        actor: "Elena Marin",
        timestamp: "20 Mai, 09:00",
        color: "rgba(255,255,255,0.25)",
        done: false,
      },
    ],
  },
  doc9: {
    id: "doc9",
    name: "Autorizatie_Constructie_Cluj.pdf",
    ext: "PDF",
    category: "projects",
    categoryLabel: "Proiecte",
    author: "Sorin Florea",
    date: "28 Apr 2026",
    sizeLabel: "0.6 MB",
    status: "expired",
    project: "Cluj 14",
    expiresAt: "1 Iun 2026",
    version: null,
    pages: 2,
    signedBy: null,
    signedAt: null,
    activity: [
      {
        id: "a1",
        label: "Document expirat",
        actor: "Sistem",
        timestamp: "1 Iun, 00:00",
        color: "rgba(255,69,58,0.9)",
        done: true,
      },
      {
        id: "a2",
        label: "Document încărcat",
        actor: "Sorin Florea",
        timestamp: "28 Apr, 14:00",
        color: "rgba(10,132,255,0.9)",
        done: true,
      },
    ],
  },
  doc10: {
    id: "doc10",
    name: "Asigurare_Flotă_2025.pdf",
    ext: "PDF",
    category: "fleet",
    categoryLabel: "Flotă",
    author: "Maria Ionescu",
    date: "15 Ian 2026",
    sizeLabel: "0.9 MB",
    status: "expired",
    project: null,
    expiresAt: "31 Mai 2026",
    version: null,
    pages: 6,
    signedBy: null,
    signedAt: null,
    activity: [
      {
        id: "a1",
        label: "Document expirat",
        actor: "Sistem",
        timestamp: "31 Mai, 00:00",
        color: "rgba(255,69,58,0.9)",
        done: true,
      },
      {
        id: "a2",
        label: "Document încărcat",
        actor: "Maria Ionescu",
        timestamp: "15 Ian, 09:30",
        color: "rgba(10,132,255,0.9)",
        done: true,
      },
    ],
  },
  doc11: {
    id: "doc11",
    name: "Contract_Munca_IonCrisan.pdf",
    ext: "PDF",
    category: "hr",
    categoryLabel: "HR",
    author: "Maria Ionescu",
    date: "1 Mar 2026",
    sizeLabel: "0.5 MB",
    status: "signed",
    project: null,
    expiresAt: null,
    version: "v1.0",
    pages: 10,
    signedBy: "Ion Crișan",
    signedAt: "1 Mar 2026, 09:00",
    activity: [
      {
        id: "a1",
        label: "Semnat de Ion Crișan",
        actor: "Ion Crișan",
        timestamp: "1 Mar, 09:00",
        color: "rgba(48,209,88,0.9)",
        done: true,
      },
      {
        id: "a2",
        label: "Document creat",
        actor: "Maria Ionescu",
        timestamp: "28 Feb, 16:00",
        color: "rgba(10,132,255,0.9)",
        done: true,
      },
    ],
  },
  doc12: {
    id: "doc12",
    name: "Factura_Echipamente_Iun2026.pdf",
    ext: "PDF",
    category: "invoices",
    categoryLabel: "Facturi",
    author: "Maria Ionescu",
    date: "8 Iun 2026",
    sizeLabel: "0.7 MB",
    status: "signed",
    project: null,
    expiresAt: null,
    version: null,
    pages: 2,
    signedBy: "Andrei Popescu",
    signedAt: "8 Iun 2026, 11:20",
    activity: [
      {
        id: "a1",
        label: "Aprobat de Andrei Popescu",
        actor: "Andrei Popescu",
        timestamp: "8 Iun, 11:20",
        color: "rgba(48,209,88,0.9)",
        done: true,
      },
      {
        id: "a2",
        label: "Document încărcat",
        actor: "Maria Ionescu",
        timestamp: "8 Iun, 10:50",
        color: "rgba(10,132,255,0.9)",
        done: true,
      },
    ],
  },
}

export const GET = withGates(
  { action: "documents.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const detail = MOCK_DETAILS[id]
    if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(detail)
  }
)
