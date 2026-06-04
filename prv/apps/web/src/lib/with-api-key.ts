import { NextRequest, NextResponse } from "next/server"
import { eq, and, isNull } from "drizzle-orm"
import { createHash } from "crypto"
import { db } from "@prv/db"
import { apiKeys } from "@prv/db/schema"

export interface ApiKeyContext {
  userId: string
  companyId: string
  keyId: string
  scopes: string[]
}

function extractApiKey(req: NextRequest): string | null {
  const auth = req.headers.get("authorization")
  if (auth?.startsWith("ApiKey ")) return auth.slice(7).trim()
  return null
}

// Wrap a route handler requiring ApiKey authentication.
// Usage:
//   export const GET = withApiKey(["resource.read"], async (req, ctx) => { ... })
export function withApiKey(
  requiredScopes: string[],
  handler: (req: NextRequest, ctx: ApiKeyContext) => Promise<NextResponse | Response>
): (req: NextRequest) => Promise<NextResponse | Response> {
  return async (req: NextRequest): Promise<NextResponse | Response> => {
    const rawKey = extractApiKey(req)
    if (!rawKey) {
      return NextResponse.json(
        { error: "Missing API key", code: "API_KEY_MISSING" },
        { status: 401 }
      )
    }

    const keyHash = createHash("sha256").update(rawKey).digest("hex")
    const now = new Date()

    const [key] = await db
      .select({
        id: apiKeys.id,
        userId: apiKeys.userId,
        companyId: apiKeys.companyId,
        scopes: apiKeys.scopes,
        expiresAt: apiKeys.expiresAt,
      })
      .from(apiKeys)
      .where(
        and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true), isNull(apiKeys.revokedAt))
      )
      .limit(1)

    if (!key) {
      return NextResponse.json(
        { error: "Invalid API key", code: "API_KEY_INVALID" },
        { status: 401 }
      )
    }

    // Check expiry
    if (key.expiresAt && key.expiresAt < now) {
      return NextResponse.json(
        { error: "API key expired", code: "API_KEY_EXPIRED" },
        { status: 401 }
      )
    }

    // Check required scopes
    const keyScopes = (key.scopes as string[]) ?? []
    const missingScopes = requiredScopes.filter((s) => !keyScopes.includes(s))
    if (missingScopes.length > 0) {
      return NextResponse.json(
        { error: "Insufficient API key scopes", code: "API_KEY_SCOPE", missing: missingScopes },
        { status: 403 }
      )
    }

    // Update lastUsedAt asynchronously — don't block the response
    void db
      .update(apiKeys)
      .set({ lastUsedAt: now })
      .where(eq(apiKeys.id, key.id))
      .catch(() => undefined)

    const ctx: ApiKeyContext = {
      userId: key.userId,
      companyId: key.companyId,
      keyId: key.id,
      scopes: keyScopes,
    }

    return handler(req, ctx)
  }
}
