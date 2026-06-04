import { serve } from "@prv/jobs/serve"
import { inngest } from "@prv/jobs/client"
import { pingFunction, jitExpireFunction } from "@prv/jobs/functions"

// Inngest webhook handler — receives events and dispatches to functions
// POST /api/inngest — Inngest platform sends events here
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [pingFunction, jitExpireFunction],
  signingKey: process.env["INNGEST_SIGNING_KEY"],
})
