import type { ActivityEventPayload } from "@prv/cache"

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function fmtElapsed(createdAt: Date): string {
  const elapsed = Date.now() - createdAt.getTime()
  const mins = Math.floor(elapsed / 60000)
  if (mins < 2) return "just now"
  if (mins < 60) return `${mins} minutes ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`
  return "yesterday"
}

// Map an audit-log action (e.g. "invoices.create") into a dashboard activity entry.
export function auditActionToActivity(
  action: string,
  entityType: string | null,
  id: string,
  createdAt: Date,
  actorId: string | null
): ActivityEventPayload {
  const lower = action.toLowerCase()
  let type: ActivityEventPayload["type"] = "info"
  if (
    lower.includes("create") ||
    lower.includes("pay") ||
    lower.includes("approve") ||
    lower.includes("sign")
  ) {
    type = "success"
  } else if (
    lower.includes("delete") ||
    lower.includes("fail") ||
    lower.includes("decline") ||
    lower.includes("reject")
  ) {
    type = "warning"
  } else if (lower.includes("alert") || lower.includes("error") || lower.includes("critical")) {
    type = "error"
  }

  const parts = action.split(".")
  const entity = parts[0] ?? "item"
  const verb = parts[parts.length - 1] ?? "updated"
  const verbMap: Record<string, string> = {
    create: "created",
    update: "updated",
    delete: "deleted",
    read: "viewed",
    pay: "paid",
    approve: "approved",
    sign: "signed",
  }
  const title = `${capitalize(entity.replace(/_/g, " "))} ${verbMap[verb] ?? verb}`

  return {
    id,
    type,
    title,
    description: entityType ?? "System",
    timestamp: fmtElapsed(createdAt),
    actorId: actorId ?? undefined,
  }
}
