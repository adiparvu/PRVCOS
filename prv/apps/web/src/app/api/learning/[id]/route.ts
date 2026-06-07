import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import type { CourseStatus, CourseCategory } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ModuleStatus = "done" | "active" | "locked"

export interface CourseModule {
  id: string
  index: number
  title: string
  durationLabel: string
  status: ModuleStatus
}

export interface CourseDetail {
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
  description: string
  modules: CourseModule[]
}

const MOCK_DETAILS: Record<string, CourseDetail> = {
  "health-safety": {
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
    description:
      "Acest curs acoperă toate aspectele esențiale ale siguranței pe șantierele de construcție, de la echipamentele de protecție individuală până la procedurile de urgență și raportarea incidentelor.",
    modules: [
      {
        id: "m1",
        index: 1,
        title: "Introducere în Siguranță",
        durationLabel: "18 min",
        status: "done",
      },
      {
        id: "m2",
        index: 2,
        title: "Echipamente de Protecție",
        durationLabel: "22 min",
        status: "done",
      },
      {
        id: "m3",
        index: 3,
        title: "Lucrul la Înălțime",
        durationLabel: "48 min",
        status: "active",
      },
      {
        id: "m4",
        index: 4,
        title: "Situații de Urgență",
        durationLabel: "35 min",
        status: "locked",
      },
      {
        id: "m5",
        index: 5,
        title: "Raportare Incidente",
        durationLabel: "28 min",
        status: "locked",
      },
      { id: "m6", index: 6, title: "Evaluare Finală", durationLabel: "20 min", status: "locked" },
    ],
  },
  "fire-safety": {
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
    description:
      "Proceduri complete de siguranță în caz de incendiu, inclusiv utilizarea echipamentelor de stingere, căile de evacuare și protocolul de urgență pentru locurile de muncă.",
    modules: [
      {
        id: "m1",
        index: 1,
        title: "Clasificarea Incendiilor",
        durationLabel: "15 min",
        status: "done",
      },
      {
        id: "m2",
        index: 2,
        title: "Echipamente de Stingere",
        durationLabel: "20 min",
        status: "active",
      },
      { id: "m3", index: 3, title: "Căi de Evacuare", durationLabel: "18 min", status: "locked" },
      { id: "m4", index: 4, title: "Simulare Urgență", durationLabel: "25 min", status: "locked" },
    ],
  },
  "gdpr-basics": {
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
    description:
      "Înțelegerea reglementărilor GDPR, drepturile persoanelor vizate, obligațiile operatorilor de date și gestionarea conformității în cadrul organizației.",
    modules: [
      { id: "m1", index: 1, title: "Introducere GDPR", durationLabel: "12 min", status: "done" },
      {
        id: "m2",
        index: 2,
        title: "Drepturile Persoanelor",
        durationLabel: "15 min",
        status: "done",
      },
      { id: "m3", index: 3, title: "Obligații Operator", durationLabel: "18 min", status: "done" },
      {
        id: "m4",
        index: 4,
        title: "Incidente de Securitate",
        durationLabel: "12 min",
        status: "active",
      },
      {
        id: "m5",
        index: 5,
        title: "Evaluare Conformitate",
        durationLabel: "10 min",
        status: "locked",
      },
    ],
  },
  "project-management": {
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
    description:
      "Fundamente complete de management de proiect: planificare, execuție, monitorizare și finalizare, adaptate specificului industriei de construcții și renovare.",
    modules: [
      {
        id: "m1",
        index: 1,
        title: "Inițierea Proiectului",
        durationLabel: "22 min",
        status: "locked",
      },
      {
        id: "m2",
        index: 2,
        title: "Planificarea Resurselor",
        durationLabel: "28 min",
        status: "locked",
      },
      {
        id: "m3",
        index: 3,
        title: "Gestionarea Riscurilor",
        durationLabel: "25 min",
        status: "locked",
      },
      {
        id: "m4",
        index: 4,
        title: "Comunicare & Stakeholders",
        durationLabel: "20 min",
        status: "locked",
      },
      {
        id: "m5",
        index: 5,
        title: "Monitorizare & Control",
        durationLabel: "30 min",
        status: "locked",
      },
      {
        id: "m6",
        index: 6,
        title: "Finalizare & Evaluare",
        durationLabel: "25 min",
        status: "locked",
      },
    ],
  },
  "communication-skills": {
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
    description:
      "Tehnici eficiente de comunicare cu clienții: ascultare activă, gestionarea așteptărilor, rezolvarea conflictelor și fidelizarea relațiilor pe termen lung.",
    modules: [
      {
        id: "m1",
        index: 1,
        title: "Principii de Comunicare",
        durationLabel: "25 min",
        status: "locked",
      },
      { id: "m2", index: 2, title: "Ascultare Activă", durationLabel: "22 min", status: "locked" },
      {
        id: "m3",
        index: 3,
        title: "Gestionarea Conflictelor",
        durationLabel: "30 min",
        status: "locked",
      },
      { id: "m4", index: 4, title: "Fidelizare Client", durationLabel: "28 min", status: "locked" },
    ],
  },
  "excel-advanced": {
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
    description:
      "Utilizarea avansată a Microsoft Excel pentru optimizarea operațiunilor: tabele pivot, macros, formule complexe și vizualizare date pentru raportare operațională.",
    modules: [
      { id: "m1", index: 1, title: "Formule Avansate", durationLabel: "22 min", status: "locked" },
      { id: "m2", index: 2, title: "Tabele Pivot", durationLabel: "28 min", status: "locked" },
      {
        id: "m3",
        index: 3,
        title: "Grafice & Vizualizare",
        durationLabel: "20 min",
        status: "locked",
      },
      { id: "m4", index: 4, title: "Macro-uri de Bază", durationLabel: "25 min", status: "locked" },
      { id: "m5", index: 5, title: "Power Query", durationLabel: "30 min", status: "locked" },
      {
        id: "m6",
        index: 6,
        title: "Dashboard Operațional",
        durationLabel: "35 min",
        status: "locked",
      },
      {
        id: "m7",
        index: 7,
        title: "Automatizare Rapoarte",
        durationLabel: "25 min",
        status: "locked",
      },
      { id: "m8", index: 8, title: "Proiect Final", durationLabel: "5 min", status: "locked" },
    ],
  },
  "renovation-safety-2026": {
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
    description:
      "Standardele actualizate de siguranță pentru lucrările de renovare în 2026, incluzând normele europene și cerințele specifice României privind protecția muncii.",
    modules: [
      {
        id: "m1",
        index: 1,
        title: "Norme Europene Actualizate",
        durationLabel: "24 min",
        status: "done",
      },
      {
        id: "m2",
        index: 2,
        title: "Protecție Chimică & Praf",
        durationLabel: "22 min",
        status: "done",
      },
      {
        id: "m3",
        index: 3,
        title: "Securitate Electrică",
        durationLabel: "26 min",
        status: "done",
      },
      { id: "m4", index: 4, title: "Gestionare Deșeuri", durationLabel: "20 min", status: "done" },
      {
        id: "m5",
        index: 5,
        title: "Evaluare & Certificare",
        durationLabel: "28 min",
        status: "done",
      },
    ],
  },
  "workplace-ergonomics": {
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
    description:
      "Principii de ergonomie pentru prevenirea accidentărilor la locul de muncă: postura corectă, amenajarea stației de lucru și exerciții de prevenție.",
    modules: [
      {
        id: "m1",
        index: 1,
        title: "Principii Ergonomice",
        durationLabel: "25 min",
        status: "done",
      },
      {
        id: "m2",
        index: 2,
        title: "Amenajarea Stației de Lucru",
        durationLabel: "28 min",
        status: "done",
      },
      {
        id: "m3",
        index: 3,
        title: "Exerciții de Prevenție",
        durationLabel: "27 min",
        status: "done",
      },
    ],
  },
}

function fallbackDetail(id: string): CourseDetail {
  return {
    id,
    title: id,
    subtitle: "—",
    category: "safety",
    categoryLabel: "Siguranță",
    status: "new",
    progress: 0,
    currentModule: 0,
    totalModules: 0,
    durationLabel: "—",
    hasCert: false,
    isFeatured: false,
    instructorName: "—",
    updatedDate: "—",
    rating: 0,
    reviewCount: 0,
    description: "",
    modules: [],
  }
}

export const GET = withGates(
  { action: "learning.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const detail = MOCK_DETAILS[id] ?? fallbackDetail(id)
    return NextResponse.json(detail)
  }
)
