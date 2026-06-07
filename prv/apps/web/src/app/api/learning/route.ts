import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type CourseStatus = "in_progress" | "completed" | "new" | "saved"
export type CourseCategory =
  | "safety"
  | "leadership"
  | "digital"
  | "finance"
  | "renovation"
  | "compliance"

export interface Course {
  id: string
  title: string
  subtitle: string
  category: CourseCategory
  categoryLabel: string
  status: CourseStatus
  progress: number
  currentModule: number
  totalModules: number
  durationLabel: string
  hasCert: boolean
  isFeatured: boolean
  instructorName: string
  updatedDate: string
  rating: number
  reviewCount: number
}

export interface Achievement {
  id: string
  label: string
  detail: string
  date: string
  colorType: "amber" | "green"
}

export interface LearningMeta {
  completedCount: number
  inProgressCount: number
  monthlyHours: number
  avgScore: number
}

const MOCK_COURSES: Course[] = [
  {
    id: "health-safety",
    title: "Sănătate & Siguranță pe Șantier",
    subtitle: "Modulul 3 din 6 · Certificare Siguranță",
    category: "safety",
    categoryLabel: "Siguranță",
    status: "in_progress",
    progress: 48,
    currentModule: 3,
    totalModules: 6,
    durationLabel: "45 min rămase",
    hasCert: true,
    isFeatured: true,
    instructorName: "Maria Ionescu",
    updatedDate: "4 Iun 2026",
    rating: 4.8,
    reviewCount: 234,
  },
  {
    id: "fire-safety",
    title: "Siguranță Incendiu & Urgențe",
    subtitle: "Modulul 2 din 4 · 20 min rămase",
    category: "safety",
    categoryLabel: "Siguranță",
    status: "in_progress",
    progress: 40,
    currentModule: 2,
    totalModules: 4,
    durationLabel: "20 min",
    hasCert: false,
    isFeatured: false,
    instructorName: "Maria Ionescu",
    updatedDate: "1 Iun 2026",
    rating: 4.5,
    reviewCount: 128,
  },
  {
    id: "gdpr-basics",
    title: "GDPR & Protecția Datelor",
    subtitle: "Modulul 4 din 5 · 12 min rămase",
    category: "compliance",
    categoryLabel: "Conformitate",
    status: "in_progress",
    progress: 72,
    currentModule: 4,
    totalModules: 5,
    durationLabel: "12 min",
    hasCert: false,
    isFeatured: false,
    instructorName: "Elena Marin",
    updatedDate: "15 Mai 2026",
    rating: 4.6,
    reviewCount: 87,
  },
  {
    id: "project-management",
    title: "Management de Proiect — Fundamente",
    subtitle: "6 module · 2h 30min · Certificat",
    category: "leadership",
    categoryLabel: "Leadership",
    status: "new",
    progress: 0,
    currentModule: 0,
    totalModules: 6,
    durationLabel: "2h 30min",
    hasCert: true,
    isFeatured: false,
    instructorName: "Andrei Popescu",
    updatedDate: "5 Iun 2026",
    rating: 4.9,
    reviewCount: 312,
  },
  {
    id: "communication-skills",
    title: "Comunicare cu Clienții",
    subtitle: "4 module · 1h 45min",
    category: "leadership",
    categoryLabel: "Leadership",
    status: "new",
    progress: 0,
    currentModule: 0,
    totalModules: 4,
    durationLabel: "1h 45min",
    hasCert: false,
    isFeatured: false,
    instructorName: "Andrei Popescu",
    updatedDate: "20 Mai 2026",
    rating: 4.4,
    reviewCount: 156,
  },
  {
    id: "excel-advanced",
    title: "Excel Avansat pentru Operațiuni",
    subtitle: "8 module · 3h 10min",
    category: "digital",
    categoryLabel: "Abilități Digitale",
    status: "new",
    progress: 0,
    currentModule: 0,
    totalModules: 8,
    durationLabel: "3h 10min",
    hasCert: false,
    isFeatured: false,
    instructorName: "Ioan Georgescu",
    updatedDate: "10 Apr 2026",
    rating: 4.7,
    reviewCount: 201,
  },
  {
    id: "renovation-safety-2026",
    title: "Standarde Siguranță Renovare 2026",
    subtitle: "Finalizat · 4 Iun · Certificat obținut",
    category: "renovation",
    categoryLabel: "Renovare",
    status: "completed",
    progress: 100,
    currentModule: 5,
    totalModules: 5,
    durationLabel: "2h 00min",
    hasCert: true,
    isFeatured: false,
    instructorName: "Maria Ionescu",
    updatedDate: "4 Iun 2026",
    rating: 4.8,
    reviewCount: 445,
  },
  {
    id: "workplace-ergonomics",
    title: "Ergonomie la Locul de Muncă",
    subtitle: "Finalizat · 28 Mai",
    category: "safety",
    categoryLabel: "Siguranță",
    status: "completed",
    progress: 100,
    currentModule: 3,
    totalModules: 3,
    durationLabel: "1h 20min",
    hasCert: false,
    isFeatured: false,
    instructorName: "Maria Ionescu",
    updatedDate: "28 Mai 2026",
    rating: 4.3,
    reviewCount: 98,
  },
]

const MOCK_ACHIEVEMENTS: Achievement[] = [
  {
    id: "a1",
    label: "Safety Champion",
    detail: "Ai finalizat toate cursurile de siguranță",
    date: "4 Iun",
    colorType: "amber",
  },
  {
    id: "a2",
    label: "10 Cursuri Finalizate",
    detail: "Jalonul trimestrului curent",
    date: "28 Mai",
    colorType: "green",
  },
]

function computeMeta(courses: Course[]): LearningMeta {
  return {
    completedCount: courses.filter((c) => c.status === "completed").length,
    inProgressCount: courses.filter((c) => c.status === "in_progress").length,
    monthlyHours: 14,
    avgScore: 86,
  }
}

export const GET = withGates(
  { action: "learning.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const status = req.nextUrl.searchParams.get("status")
    const category = req.nextUrl.searchParams.get("category")
    let results = MOCK_COURSES
    if (status) results = results.filter((c) => c.status === status)
    if (category) results = results.filter((c) => c.category === category)
    const meta = computeMeta(MOCK_COURSES)
    return NextResponse.json({
      courses: results,
      count: results.length,
      meta,
      achievements: MOCK_ACHIEVEMENTS,
    })
  }
)
