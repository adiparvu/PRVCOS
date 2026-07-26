import { NextRequest, NextResponse } from "next/server"
import { db } from "@prv/db"
import { safetyIncidents } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { withMobileAuth } from "@/lib/mobile/auth"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Field incident reporting from the phone (offline-queue consumer — a report
// filed on a job site with no signal is queued durably and replayed on
// reconnect; losing a near-miss report is a compliance problem). Mirrors the
// web POST /api/safety/incidents contract exactly, so both surfaces feed the
// same investigation workflow.

const bodySchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().min(1),
  type: z.enum(["accident", "near_miss", "hazard", "property_damage", "environmental", "security"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  location: z.string().max(300).optional(),
  incidentAt: z.string().datetime(),
  projectId: z.string().uuid().optional(),
  injuriesCount: z.number().int().nonnegative().optional(),
})

function extractIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
}

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 422 }
    )
  }
  const d = parsed.data

  // A queued report can replay hours later — incidentAt stays the time the
  // worker filed it, but never accept a timestamp from the future.
  const incidentAt = new Date(d.incidentAt)
  if (incidentAt.getTime() > Date.now() + 5 * 60_000) {
    return NextResponse.json({ error: "incidentAt cannot be in the future" }, { status: 422 })
  }

  const [record] = await db
    .insert(safetyIncidents)
    .values({
      companyId: ctx.companyId,
      reportedBy: ctx.userId,
      status: "open",
      title: d.title,
      description: d.description,
      type: d.type,
      severity: d.severity,
      location: d.location,
      incidentAt,
      projectId: d.projectId ?? null,
      injuriesCount: d.injuriesCount ?? 0,
    })
    .returning({ id: safetyIncidents.id, title: safetyIncidents.title })

  if (!record) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.safety.incident.create",
    entityType: "safety_incident",
    entityId: record.id,
    method: "POST",
    path: "/api/mobile/safety/incidents",
    ipAddress: extractIp(req),
    userAgent: req.headers.get("user-agent") ?? "",
    payload: d,
  })

  return NextResponse.json({ id: record.id, title: record.title }, { status: 201 })
})
