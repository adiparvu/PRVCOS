import { serve } from "@prv/jobs/serve"
import { inngest } from "@prv/jobs/client"
import {
  pingFunction,
  jitExpireFunction,
  notificationSendFunction,
  presenceExpireFunction,
  grantExpireFunction,
  approvalExpireFunction,
  shopOrderProcessFunction,
  shopStockAlertFunction,
  processRecurringInvoicesFunction,
  detectAnomaliesFunction,
  groupKpiSnapshotFunction,
  leaveNotificationFunction,
} from "@prv/jobs/functions"

// Inngest webhook handler — receives events and dispatches to functions
// POST /api/inngest — Inngest platform sends events here
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    pingFunction,
    jitExpireFunction,
    notificationSendFunction,
    presenceExpireFunction,
    grantExpireFunction,
    approvalExpireFunction,
    shopOrderProcessFunction,
    shopStockAlertFunction,
    processRecurringInvoicesFunction,
    detectAnomaliesFunction,
    groupKpiSnapshotFunction,
    leaveNotificationFunction,
  ],
  signingKey: process.env["INNGEST_SIGNING_KEY"],
})
