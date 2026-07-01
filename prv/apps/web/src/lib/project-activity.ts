import { db } from "@prv/db"
import { projectActivity, type ProjectActivityKind } from "@prv/db/schema"

export interface ProjectActivityEntry {
  companyId: string
  projectId: string
  actorId: string | null
  kind: ProjectActivityKind
  summary: string
  entityType?: string | null
  entityId?: string | null
  metadata?: Record<string, unknown>
}

// Records a project-timeline event. Fire-and-forget: the caller `void`s this so
// a logging failure never breaks the underlying mutation (the immutable audit
// log remains the system of record). Best-effort by design.
export async function writeProjectActivity(entry: ProjectActivityEntry): Promise<void> {
  try {
    await db.insert(projectActivity).values({
      companyId: entry.companyId,
      projectId: entry.projectId,
      actorId: entry.actorId,
      kind: entry.kind,
      summary: entry.summary,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata ?? null,
    })
  } catch {
    // Swallow — activity logging must never fail the request.
  }
}
