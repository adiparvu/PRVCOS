import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { writeAuditLog } from "@prv/auth"
import { isEmbeddingConfigured } from "@prv/ai-engine"
import { searchKnowledgeSemantic } from "@/lib/rag"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Mobile twin of /api/knowledge/semantic-search — same shared handler in
// lib/rag, only the auth context differs (audit D3: shared logic, no drift).
const bodySchema = z.object({
  query: z.string().min(2).max(500),
  limit: z.number().int().min(1).max(10).default(5),
})

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const raw = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 422 }
    )
  }

  if (!isEmbeddingConfigured()) {
    return NextResponse.json({ results: [], reason: "not_configured" })
  }

  const results = await searchKnowledgeSemantic(ctx.companyId, parsed.data.query, parsed.data.limit)

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.knowledge.semantic_search",
    entityType: "knowledge_article",
    method: "POST",
    path: "/api/mobile/knowledge/semantic-search",
    ipAddress:
      req.headers.get("x-real-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown",
    userAgent: req.headers.get("user-agent") ?? "",
    payload: { resultCount: results.length },
  })

  return NextResponse.json({ results })
})
