import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { readRealtimeEvents, realtimeChannel } from "@prv/cache"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const HEARTBEAT_INTERVAL_MS = 25_000
const POLL_INTERVAL_MS = 2_000

export const GET = withGates(
  { action: "realtime.stream.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { userId, companyId } = ctx.session

    const channelsParam = new URL(req.url).searchParams.get("channels") ?? ""
    const requestedChannels = channelsParam.split(",").filter(Boolean).slice(0, 5)

    const channels =
      requestedChannels.length > 0
        ? requestedChannels
        : [
            realtimeChannel.kpis(companyId),
            realtimeChannel.notifications(userId),
            realtimeChannel.activity(companyId),
          ]

    const sinceHeader = req.headers.get("last-event-id")
    let since = sinceHeader ? parseInt(sinceHeader, 10) : Date.now() - 5_000

    let closed = false
    req.signal.addEventListener("abort", () => {
      closed = true
    })

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder()

        function enqueue(id: string, event: string, data: string) {
          controller.enqueue(enc.encode(`id: ${id}\nevent: ${event}\ndata: ${data}\n\n`))
        }

        enqueue(String(Date.now()), "connected", JSON.stringify({ channels }))

        const heartbeat = setInterval(() => {
          if (closed) return
          controller.enqueue(enc.encode(`:heartbeat\n\n`))
        }, HEARTBEAT_INTERVAL_MS)

        const poll = setInterval(async () => {
          if (closed) return
          for (const ch of channels) {
            try {
              const events = await readRealtimeEvents(ch, since)
              for (const e of events) {
                enqueue(String(e.ts), e.eventType, JSON.stringify(e))
                if (e.ts > since) since = e.ts
              }
            } catch {}
          }
        }, POLL_INTERVAL_MS)

        req.signal.addEventListener("abort", () => {
          clearInterval(heartbeat)
          clearInterval(poll)
          controller.close()
        })
      },
    })

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    })
  }
)
