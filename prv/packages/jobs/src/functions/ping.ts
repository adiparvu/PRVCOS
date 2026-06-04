import { inngest } from "../client"

// Health-check function — verifies Inngest connectivity
export const pingFunction = inngest.createFunction(
  {
    id: "prv-ping",
    name: "PRV Health Ping",
    retries: 1,
    concurrency: { limit: 1 },
  },
  { event: "prv/ping" },
  async ({ event, step }) => {
    const received = await step.run("acknowledge", () => ({
      message: event.data.message,
      receivedAt: new Date().toISOString(),
      inngestRunId: event.id,
    }))

    return {
      ok: true,
      echo: received,
    }
  }
)
