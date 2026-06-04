import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {}
  let healthy = true

  // Database connectivity
  try {
    const { db } = await import("@prv/db")
    const { sql } = await import("drizzle-orm")
    await db.execute(sql`SELECT 1`)
    checks["database"] = "ok"
  } catch {
    checks["database"] = "error"
    healthy = false
  }

  const status = healthy ? 200 : 503
  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status }
  )
}
