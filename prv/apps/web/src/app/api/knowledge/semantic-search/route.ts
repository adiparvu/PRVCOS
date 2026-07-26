import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { isEmbeddingConfigured } from "@prv/ai-engine"
import { searchKnowledgeSemantic } from "@/lib/rag"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Semantic search over the company's knowledge base (AI platform, area #11).
// POST because the query rides in the body and each call spends an embedding
// API call — the "ai" endpoint class carries the strictest authed limit.
// The actual search lives in lib/rag (shared with the mobile route).
const bodySchema = z.object({
  query: z.string().min(2).max(500),
  limit: z.number().int().min(1).max(10).default(5),
})

export const POST = withGates(
  { action: "knowledge.semantic_search", endpointClass: "ai" },
  async (req: NextRequest, ctx: GateContext) => {
    const raw = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    if (!isEmbeddingConfigured()) {
      // Deliberate 200: an unprovisioned optional feature is an empty result,
      // not a server error the UI has to special-case.
      return NextResponse.json({ results: [], reason: "not_configured" })
    }

    const results = await searchKnowledgeSemantic(
      ctx.session.companyId,
      parsed.data.query,
      parsed.data.limit
    )
    return NextResponse.json({ results })
  }
)
