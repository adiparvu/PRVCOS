import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@prv/db"
import {
  users,
  userProfiles,
  userPresence,
  socialProfiles,
  digitalBusinessCards,
  clients,
  suppliers,
  projects,
} from "@prv/db/schema"
import { getEntityConfig, getAllEntityTypes } from "@/components/preview-engine/registry"
import type { EntityType, PreviewPayload } from "@/components/preview-engine/types"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const VALID_ENTITY_TYPES = new Set(getAllEntityTypes())

// GET /api/preview/[entityType]/[id] — entity-aware preview payload, permission-gated
export const GET = withGates(
  { action: "preview.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const segments = req.nextUrl.pathname.split("/")
    // Path: /api/preview/[entityType]/[id]
    const entityId = segments[segments.length - 1]
    const entityType = segments[segments.length - 2] as EntityType

    if (!VALID_ENTITY_TYPES.has(entityType) || !entityId) {
      return NextResponse.json({ error: "Invalid entity type or id" }, { status: 400 })
    }

    const config = getEntityConfig(entityType)
    const { companyId } = ctx.session

    try {
      const payload = await resolveEntityPayload(
        entityType,
        entityId,
        companyId,
        config.contextActions
      )
      if (!payload) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      return NextResponse.json(payload)
    } catch {
      return NextResponse.json({ error: "Failed to load preview" }, { status: 500 })
    }
  }
)

async function resolveEntityPayload(
  entityType: EntityType,
  entityId: string,
  companyId: string,
  actions: PreviewPayload["actions"]
): Promise<PreviewPayload | null> {
  const config = getEntityConfig(entityType)

  switch (entityType) {
    case "employee": {
      const [row] = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          jobTitle: userProfiles.jobTitle,
          avatarUrl: users.avatarUrl,
          status: users.status,
          presenceStatus: userPresence.status,
          presenceMessage: userPresence.statusMessage,
          presenceLastSeen: userPresence.lastSeenAt,
          socialCount: db.$count(socialProfiles, eq(socialProfiles.userId, users.id)),
          hasCard: db.$count(digitalBusinessCards, eq(digitalBusinessCards.userId, users.id)),
        })
        .from(users)
        .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
        .leftJoin(userPresence, eq(userPresence.userId, users.id))
        .where(and(eq(users.id, entityId), eq(users.companyId, companyId)))

      if (!row) return null

      return {
        entityType: "employee",
        id: row.id,
        name: `${row.firstName} ${row.lastName}`,
        subtitle: row.jobTitle ?? null,
        avatarUrl: row.avatarUrl ?? null,
        iconPath: null,
        presence: row.presenceStatus
          ? {
              status: row.presenceStatus,
              statusMessage: row.presenceMessage ?? null,
              lastSeenAt: row.presenceLastSeen?.toISOString() ?? new Date().toISOString(),
            }
          : null,
        metadata: [...(row.status ? [{ label: "Status", value: row.status }] : [])],
        socialCount: Number(row.socialCount),
        hasBusinessCard: Number(row.hasCard) > 0,
        actions,
      }
    }

    case "client": {
      const [row] = await db
        .select({
          id: clients.id,
          name: clients.name,
          email: clients.email,
          phone: clients.phone,
          type: clients.type,
          status: clients.status,
        })
        .from(clients)
        .where(and(eq(clients.id, entityId), eq(clients.companyId, companyId)))

      if (!row) return null

      return {
        entityType: "client",
        id: row.id,
        name: row.name,
        subtitle: row.status,
        avatarUrl: null,
        iconPath: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
        presence: null,
        metadata: [
          ...(row.email ? [{ label: "Email", value: row.email }] : []),
          ...(row.phone ? [{ label: "Phone", value: row.phone }] : []),
          { label: "Type", value: row.type },
        ],
        socialCount: 0,
        hasBusinessCard: false,
        actions,
      }
    }

    case "supplier": {
      const [row] = await db
        .select({
          id: suppliers.id,
          name: suppliers.name,
          email: suppliers.email,
          phone: suppliers.phone,
          status: suppliers.status,
          category: suppliers.category,
        })
        .from(suppliers)
        .where(and(eq(suppliers.id, entityId), eq(suppliers.companyId, companyId)))

      if (!row) return null

      return {
        entityType: "supplier",
        id: row.id,
        name: row.name,
        subtitle: row.category ?? null,
        avatarUrl: null,
        iconPath: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z",
        presence: null,
        metadata: [
          ...(row.email ? [{ label: "Email", value: row.email }] : []),
          ...(row.phone ? [{ label: "Phone", value: row.phone }] : []),
          { label: "Status", value: row.status },
        ],
        socialCount: 0,
        hasBusinessCard: false,
        actions,
      }
    }

    case "project": {
      const [row] = await db
        .select({
          id: projects.id,
          name: projects.name,
          code: projects.code,
          status: projects.status,
          startDate: projects.startDate,
          dueDate: projects.dueDate,
          budget: projects.budget,
        })
        .from(projects)
        .where(and(eq(projects.id, entityId), eq(projects.companyId, companyId)))

      if (!row) return null

      return {
        entityType: "project",
        id: row.id,
        name: row.name,
        subtitle: row.code ?? null,
        avatarUrl: null,
        iconPath: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2Z",
        presence: null,
        metadata: [
          { label: "Status", value: row.status },
          ...(row.budget ? [{ label: "Budget", value: `${row.budget} RON` }] : []),
          ...(row.startDate ? [{ label: "Start", value: String(row.startDate) }] : []),
          ...(row.dueDate ? [{ label: "Due", value: String(row.dueDate) }] : []),
        ],
        socialCount: 0,
        hasBusinessCard: false,
        actions,
      }
    }

    default: {
      // Generic fallback — return minimal payload for unimplemented entity types
      return {
        entityType,
        id: entityId,
        name: `${entityType} ${entityId.slice(0, 8)}`,
        subtitle: null,
        avatarUrl: null,
        iconPath: null,
        presence: null,
        metadata: [],
        socialCount: 0,
        hasBusinessCard: false,
        actions: config.contextActions,
      }
    }
  }
}
