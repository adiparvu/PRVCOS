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

  // Redis: every authenticated request resolves its session through Redis, so
  // a dead Redis means a fully unusable app. Reporting "healthy" on the
  // strength of a database SELECT alone hid exactly that.
  try {
    const { getRedis } = await import("@prv/cache")
    await getRedis().ping()
    checks["redis"] = "ok"
  } catch {
    checks["redis"] = "error"
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
