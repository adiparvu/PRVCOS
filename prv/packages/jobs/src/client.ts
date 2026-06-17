import { EventSchemas, Inngest } from "inngest"

// PRV event type registry — extended as modules are implemented
export type PRVEvents = {
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
  "prv/jit.session.started": {
    data: { sessionId: string; expiresAt: string }
  }
  "prv/presence.manual_set": {
    data: { userId: string; companyId: string; expiresAt: string }
  }
  "prv/kpi.snapshot.requested": {
    data: { companyId: string; period: string }
  }
  "prv/grant.issued": {
    data: { grantId: string; expiresAt: string }
  }
  "prv/approval.deadline": {
    data: { approvalId: string; companyId: string; deadline: string }
  }
  "prv/shop.order.status_changed": {
    data: {
      orderId: string
      companyId: string
      orderNumber: string
      fromStatus: string
      toStatus: string
    }
  }
  "prv/shop.stock.low": {
    data: {
      companyId: string
      productId: string
      productName: string
      stockQuantity: number
      stockMinimum: number
    }
  }
  "prv/leave.status_changed": {
    data: {
      leaveId: string
      userId: string
      companyId: string
      decision: "approved" | "rejected"
      leaveType: string
      startDate: string
      endDate: string
      approverName: string
      notes?: string
      dashboardUrl?: string
    }
  }
}

export const inngest = new Inngest({
  id: "prv",
  eventKey: process.env["INNGEST_EVENT_KEY"],
  schemas: new EventSchemas().fromRecord<PRVEvents>(),
})
