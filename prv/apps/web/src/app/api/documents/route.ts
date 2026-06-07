import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type DocStatus = "signed" | "pending" | "draft" | "expired"
export type DocCategory = "contracts" | "invoices" | "projects" | "hr" | "fleet"
export type DocExt = "PDF" | "DOC" | "XLS"

export interface DocumentRecord {
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
}

export interface DocumentsMeta {
  total: number
  pendingCount: number
  expiredCount: number
  recentCount: number
}

const MOCK_DOCUMENTS: DocumentRecord[] = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
]

function computeMeta(records: DocumentRecord[]): DocumentsMeta {
  return {
    total: records.length,
    pendingCount: records.filter((d) => d.status === "pending").length,
    expiredCount: records.filter((d) => d.status === "expired").length,
    recentCount: records.filter((d) => d.status === "signed" || d.status === "draft").length,
  }
}

export const GET = withGates(
  { action: "documents.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const category = req.nextUrl.searchParams.get("category")
    const results = category
      ? MOCK_DOCUMENTS.filter((d) => d.category === category)
      : MOCK_DOCUMENTS
    const meta = computeMeta(MOCK_DOCUMENTS)
    return NextResponse.json({ documents: results, count: results.length, meta })
  }
)
