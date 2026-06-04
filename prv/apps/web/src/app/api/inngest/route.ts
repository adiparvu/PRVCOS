import { serve } from "@prv/jobs/serve"
import { inngest } from "@prv/jobs/client"
import { pingFunction } from "@prv/jobs/functions"

// Inngest webhook handler — receives events and dispatches to functions
// POST /api/inngest — Inngest platform sends events here
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [pingFunction],
  signingKey: process.env["INNGEST_SIGNING_KEY"],
})
