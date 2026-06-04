import { EventSchemas, Inngest } from "inngest"

// PRV event type registry — extended as modules are implemented
type PRVEventSchemas = {
  "prv/ping": { data: { message: string; timestamp: string } }
  "prv/user.created": { data: { userId: string; companyId: string; role: string } }
  "prv/approval.requested": {
    data: { approvalId: string; entityType: string; entityId: string; companyId: string }
  }
  "prv/notification.send": {
    data: {
      userId: string
      companyId: string
      type: string
      templateId: string
      variables: Record<string, string>
    }
  }
  "prv/audit.log": {
    data: {
      actorId: string
      companyId: string
      action: string
      entityType: string
      entityId: string
      diff?: Record<string, unknown>
    }
  }
}

export type PRVEvents = PRVEventSchemas

export const inngest = new Inngest({
  id: "prv",
  eventKey: process.env["INNGEST_EVENT_KEY"],
  schemas: new EventSchemas().fromRecord<PRVEventSchemas>(),
})
