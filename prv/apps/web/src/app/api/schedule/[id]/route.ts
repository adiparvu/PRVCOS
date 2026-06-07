import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import type { ShiftSummary } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface TimelineEntry {
  id: string
  time: string
  label: string
  sub: string | null
  done: boolean
}

export interface ShiftDetail extends ShiftSummary {
  breakMinutes: number
  breakTime: string | null
  hourlyRate: number
  estimatedCost: number
  notes: string | null
  timeline: TimelineEntry[]
}

const MOCK_DETAIL: Record<string, ShiftDetail> = {
  s1: {
    id: "s1",
    role: "foreman",
    roleLabel: "Maistru Construcții",
    title: "Maistru Construcții",
    location: "Șantier A4 Brașov",
    site: "A4 Brașov",
    date: "9 Iun 2026",
    dayLabel: "Miercuri 9 Iun",
    startTime: "07:00",
    endTime: "16:00",
    durationHours: 9,
    status: "confirmed",
    assignees: [
      { id: "e1", initials: "IC", name: "Ion Crișan" },
      { id: "e2", initials: "RD", name: "Radu Dima" },
      { id: "e3", initials: "SF", name: "Sorin Florea" },
    ],
    openSlots: 0,
    project: "A4 Brașov",
    breakMinutes: 30,
    breakTime: "12:00",
    hourlyRate: 22,
    estimatedCost: 594,
    notes:
      "Turnare fundație sector B. Echipamentul de protecție obligatoriu. Contactați maistrul înainte de 06:30.",
    timeline: [
      {
        id: "t1",
        time: "07:00",
        label: "Început Tură",
        sub: "Prezență confirmată · Toți angajații",
        done: true,
      },
      {
        id: "t2",
        time: "12:00",
        label: "Pauză de masă",
        sub: "30 minute · Obligatoriu",
        done: false,
      },
      {
        id: "t3",
        time: "16:00",
        label: "Sfârșit Tură",
        sub: "Semnare pontaj necesară",
        done: false,
      },
      { id: "t4", time: "—", label: "Raport Sfârșit Tură", sub: "Nepublicat", done: false },
    ],
  },
  s2: {
    id: "s2",
    role: "electrician",
    roleLabel: "Electrician",
    title: "Electrician",
    location: "Cluj Mănăștur",
    site: "Cluj Mănăștur",
    date: "9 Iun 2026",
    dayLabel: "Miercuri 9 Iun",
    startTime: "08:00",
    endTime: "17:00",
    durationHours: 9,
    status: "confirmed",
    assignees: [{ id: "e5", initials: "LT", name: "Liviu Toma" }],
    openSlots: 0,
    project: "Cluj Mănăștur",
    breakMinutes: 30,
    breakTime: "13:00",
    hourlyRate: 25,
    estimatedCost: 225,
    notes: "Instalare tablou electric etaj 3. Acces necesitar coordonat cu antreprenorul general.",
    timeline: [
      { id: "t1", time: "08:00", label: "Început Tură", sub: "Acces confirmat", done: true },
      { id: "t2", time: "13:00", label: "Pauză de masă", sub: "30 minute", done: false },
      {
        id: "t3",
        time: "17:00",
        label: "Sfârșit Tură",
        sub: "Raport instalație necesar",
        done: false,
      },
    ],
  },
  s3: {
    id: "s3",
    role: "finisher",
    roleLabel: "Echipă Finisaj",
    title: "Echipă Finisaj",
    location: "Cluj Mănăștur",
    site: "Cluj Mănăștur",
    date: "9 Iun 2026",
    dayLabel: "Miercuri 9 Iun",
    startTime: "09:00",
    endTime: "18:00",
    durationHours: 9,
    status: "draft",
    assignees: [
      { id: "e4", initials: "EM", name: "Elena Marin" },
      { id: "e6", initials: "AS", name: "Ana Stoica" },
    ],
    openSlots: 2,
    project: "Cluj Mănăștur",
    breakMinutes: 30,
    breakTime: "12:30",
    hourlyRate: 18,
    estimatedCost: 648,
    notes: "Gletuire și vopsire apartamente 3–8. 2 locuri neacoperite — necesară asignare urgentă.",
    timeline: [
      {
        id: "t1",
        time: "09:00",
        label: "Început Tură",
        sub: "Echipă parțial confirmată",
        done: false,
      },
      { id: "t2", time: "12:30", label: "Pauză de masă", sub: "30 minute", done: false },
      {
        id: "t3",
        time: "18:00",
        label: "Sfârșit Tură",
        sub: "Inspecție calitate necesară",
        done: false,
      },
    ],
  },
  s4: {
    id: "s4",
    role: "welder",
    roleLabel: "Sudor · Structuri Metal",
    title: "Sudor · Structuri Metal",
    location: "Șantier A4 Brașov",
    site: "A4 Brașov",
    date: "10 Iun 2026",
    dayLabel: "Joi 10 Iun",
    startTime: "06:30",
    endTime: "15:00",
    durationHours: 8.5,
    status: "scheduled",
    assignees: [{ id: "e2", initials: "RD", name: "Radu Dima" }],
    openSlots: 0,
    project: "A4 Brașov",
    breakMinutes: 30,
    breakTime: "11:00",
    hourlyRate: 28,
    estimatedCost: 238,
    notes:
      "Sudură structuri metalice acoperiș. EIP complet obligatoriu. Verificare gaze înainte de start.",
    timeline: [
      { id: "t1", time: "06:30", label: "Început Tură", sub: "Verificare echipament", done: false },
      { id: "t2", time: "11:00", label: "Pauză", sub: "30 minute", done: false },
      { id: "t3", time: "15:00", label: "Sfârșit Tură", sub: "Raport sudură necesar", done: false },
    ],
  },
  s5: {
    id: "s5",
    role: "bricklayer",
    roleLabel: "Zidar",
    title: "Zidar",
    location: "Șantier A4 Brașov",
    site: "A4 Brașov",
    date: "12 Iun 2026",
    dayLabel: "Sâmbătă 12 Iun",
    startTime: "08:00",
    endTime: "17:00",
    durationHours: 9,
    status: "open",
    assignees: [],
    openSlots: 1,
    project: "A4 Brașov",
    breakMinutes: 30,
    breakTime: "12:00",
    hourlyRate: 20,
    estimatedCost: 180,
    notes: "Zidărie perimetrală etaj 2. Tură neacoperită — necesită asignare urgentă.",
    timeline: [
      { id: "t1", time: "08:00", label: "Început Tură", sub: "Angajat necesar", done: false },
      { id: "t2", time: "12:00", label: "Pauză de masă", sub: "30 minute", done: false },
      { id: "t3", time: "17:00", label: "Sfârșit Tură", sub: null, done: false },
    ],
  },
  s6: {
    id: "s6",
    role: "electrician",
    roleLabel: "Electrician",
    title: "Electrician",
    location: "Cluj Mănăștur",
    site: "Cluj Mănăștur",
    date: "7 Iun 2026",
    dayLabel: "Luni 7 Iun",
    startTime: "07:00",
    endTime: "15:00",
    durationHours: 8,
    status: "open",
    assignees: [],
    openSlots: 1,
    project: "Cluj Mănăștur",
    breakMinutes: 30,
    breakTime: "11:30",
    hourlyRate: 25,
    estimatedCost: 200,
    notes: "Cablare circuite prize etaj 1–2. Tură neacoperită.",
    timeline: [
      { id: "t1", time: "07:00", label: "Început Tură", sub: "Angajat necesar", done: false },
      { id: "t2", time: "11:30", label: "Pauză", sub: "30 minute", done: false },
      { id: "t3", time: "15:00", label: "Sfârșit Tură", sub: null, done: false },
    ],
  },
  s7: {
    id: "s7",
    role: "foreman",
    roleLabel: "Maistru Construcții",
    title: "Maistru Construcții",
    location: "Șantier A4 Brașov",
    site: "A4 Brașov",
    date: "11 Iun 2026",
    dayLabel: "Vineri 11 Iun",
    startTime: "07:00",
    endTime: "16:00",
    durationHours: 9,
    status: "confirmed",
    assignees: [
      { id: "e1", initials: "IC", name: "Ion Crișan" },
      { id: "e3", initials: "SF", name: "Sorin Florea" },
    ],
    openSlots: 0,
    project: "A4 Brașov",
    breakMinutes: 30,
    breakTime: "12:00",
    hourlyRate: 22,
    estimatedCost: 396,
    notes: "Inspecție progres săptămânal. Raport obligatoriu la finalizare.",
    timeline: [
      { id: "t1", time: "07:00", label: "Început Tură", sub: null, done: false },
      { id: "t2", time: "12:00", label: "Pauză de masă", sub: "30 minute", done: false },
      {
        id: "t3",
        time: "16:00",
        label: "Inspecție & Raport",
        sub: "Document obligatoriu",
        done: false,
      },
    ],
  },
  s8: {
    id: "s8",
    role: "general",
    roleLabel: "Muncitor General",
    title: "Muncitor General",
    location: "Depozit Central",
    site: "Depozit Cluj",
    date: "10 Iun 2026",
    dayLabel: "Joi 10 Iun",
    startTime: "08:00",
    endTime: "16:00",
    durationHours: 8,
    status: "confirmed",
    assignees: [{ id: "e7", initials: "VB", name: "Vasile Bota" }],
    openSlots: 0,
    project: null,
    breakMinutes: 30,
    breakTime: "12:00",
    hourlyRate: 15,
    estimatedCost: 120,
    notes: "Recepție materiale și inventariere stoc. Lista de verificare atașată.",
    timeline: [
      {
        id: "t1",
        time: "08:00",
        label: "Început Tură",
        sub: "Recepție livrare 08:30",
        done: false,
      },
      { id: "t2", time: "12:00", label: "Pauză de masă", sub: "30 minute", done: false },
      {
        id: "t3",
        time: "16:00",
        label: "Raport Inventar",
        sub: "Document obligatoriu",
        done: false,
      },
    ],
  },
}

export const GET = withGates(
  { action: "schedule.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const shift = MOCK_DETAIL[id]
    if (!shift) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ shift })
  }
)
