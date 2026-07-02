import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { publicHolidays } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { holidayForYear, isWeekend } from "@/lib/holidays"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface Holiday {
  id: string
  name: string
  date: string // effective date in the requested year
  country: string
  region: string | null
  isRecurring: boolean
  weekend: boolean
}

const ISO = /^\d{4}-\d{2}-\d{2}$/

// GET /api/workforce/holidays?year=&country= — the company holiday calendar for
// a year. Recurring holidays are expanded onto the requested year; one-offs
// appear only in their own year. Sorted by date.
export const GET = withGates(
  { action: "workforce.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const sp = req.nextUrl.searchParams
    const yearRaw = sp.get("year")
    const year = yearRaw && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : new Date().getUTCFullYear()
    const country = sp.get("country")

    const conds = [eq(publicHolidays.companyId, ctx.session.companyId)]
    if (country) conds.push(eq(publicHolidays.country, country))

    const rows = await db
      .select({
        id: publicHolidays.id,
        name: publicHolidays.name,
        date: publicHolidays.date,
        country: publicHolidays.country,
        region: publicHolidays.region,
        isRecurring: publicHolidays.isRecurring,
      })
      .from(publicHolidays)
      .where(and(...conds))

    const holidays: Holiday[] = []
    for (const r of rows) {
      const eff = holidayForYear(r.date, r.isRecurring, year)
      if (!eff) continue
      holidays.push({
        id: r.id,
        name: r.name,
        date: eff,
        country: r.country,
        region: r.region,
        isRecurring: r.isRecurring,
        weekend: isWeekend(eff),
      })
    }
    holidays.sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({ holidays, year, count: holidays.length })
  }
)

// POST /api/workforce/holidays — add a holiday to the calendar.
const postSchema = z.object({
  name: z.string().min(1).max(160),
  date: z.string().regex(ISO),
  country: z.string().min(2).max(8).default("RO"),
  region: z.string().max(80).nullable().optional(),
  isRecurring: z.boolean().default(true),
})

export const POST = withGates(
  { action: "workforce.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId: actorId, sessionId } = ctx.session

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = postSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data

    const [record] = await db
      .insert(publicHolidays)
      .values({
        companyId,
        name: d.name,
        date: d.date,
        country: d.country,
        region: d.region ?? null,
        isRecurring: d.isRecurring,
      })
      .onConflictDoUpdate({
        target: [publicHolidays.companyId, publicHolidays.date, publicHolidays.country],
        set: {
          name: d.name,
          region: d.region ?? null,
          isRecurring: d.isRecurring,
          updatedAt: new Date(),
        },
      })
      .returning({ id: publicHolidays.id })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "workforce.holiday.upsert",
      entityType: "public_holiday",
      entityId: record?.id ?? d.date,
      payload: { name: d.name, date: d.date, country: d.country },
      method: "POST",
      path: "/api/workforce/holidays",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record?.id }, { status: 201 })
  }
)
