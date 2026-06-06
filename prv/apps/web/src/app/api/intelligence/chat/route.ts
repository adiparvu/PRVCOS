import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  message: z.string().min(1).max(500),
})

function buildResponse(message: string): string {
  const q = message.toLowerCase()

  if (q.includes("cash flow") || q.includes("cashflow")) {
    return `Cash flow is currently down 8% vs last week due to three factors:\n\n1. Payroll run of €28,400 processed on Jun 2\n2. Two overdue receivables totalling €3,240 (Andronic Group & Biroul Construct)\n3. Romstal SRL invoice of €1,840 still pending payment\n\nPositive recovery is expected within ~4 days once Invoice #208 is collected. I recommend contacting Andronic Group today — the probability of default increases to 78% after 10 days overdue.`
  }

  if (q.includes("revenue") || q.includes("venit")) {
    return `Revenue for June 2026 is tracking at €482K, up 12.4% month-over-month. The breakdown by division:\n\n• Shop: €193K (40%)\n• Renovations: €121K (25%)\n• Projects: €96K (20%)\n• Other: €72K (15%)\n\nThe AI forecast for July projects €519K with 87% confidence, driven primarily by 4 active projects entering their billing milestone phase.`
  }

  if (q.includes("expense") || q.includes("cheltuial")) {
    return `Total expenses for June stand at €344K, down 4.2% vs May — a positive signal. However, 3 unapproved procurement purchases were detected this week (€4,620 combined from Romstal SRL, BricoStore, and Leroy Merlin).\n\nThe largest expense category remains Payroll at €28,400 (June Week 1 run). Fixed costs (rent, utilities) account for €8,200.`
  }

  if (q.includes("payroll") || q.includes("salar")) {
    return `The June Week 1 payroll run of €28,400 was processed on Jun 2 for 142 employees. The next scheduled run (Week 2) is pending approval and must be authorised by 14:00 today to avoid delays.\n\nPayroll breakdown:\n• Full-time employees: €24,800\n• Part-time & contractors: €3,600\n\nYTD payroll efficiency is tracking within 2.1% of budget.`
  }

  if (q.includes("invoice") || q.includes("factur")) {
    return `There are currently 5 open invoices in the system:\n\n• INV-208 — Andronic Group SRL — €2,100 (OVERDUE since May 28)\n• INV-207 — Biroul Construct — €1,140 (OVERDUE since May 31)\n• INV-206 — Mihai Popescu — €540 (due Jun 10)\n• INV-205 — Radu Construct — €3,800 (Paid ✓)\n• INV-204 — Ana Ionescu — €760 (Paid ✓)\n\nTotal outstanding: €3,240. I recommend contacting Andronic Group immediately.`
  }

  if (q.includes("project") || q.includes("proiect")) {
    return `There are 38 active projects across PRV, with 4 new projects added this week. Two projects are at risk of slipping their deadlines due to understaffing:\n\n• Parcoseală Comerciala Brașov — 2 days behind schedule\n• Baie Modernă Cluj — resource conflict with Timișoara team\n\nI recommend reallocating 3 workers from Cluj to Timișoara on Thursday to prevent timeline slippage.`
  }

  if (
    q.includes("staff") ||
    q.includes("angajat") ||
    q.includes("employee") ||
    q.includes("team")
  ) {
    return `142 of 145 registered employees are currently active. Three are absent today:\n\n• 1 sick leave (approved)\n• 1 personal day (approved)\n• 1 unexplained absence — Ion Popa (3rd incident this week)\n\nI recommend initiating an HR review for Ion Popa before escalating to formal disciplinary proceedings.`
  }

  if (q.includes("store") || q.includes("magazin") || q.includes("profitable")) {
    return `Based on June 2026 data, Floreasca is your most profitable store with a 39% gross margin and 8% efficiency improvement week-on-week. Customer satisfaction sits at 4.9/5 with zero overdue tasks.\n\nBottom performer this month is Iași, where foot traffic dropped 23%. A targeted promotion campaign before Jun 15 is recommended — AI confidence: 87%.`
  }

  if (q.includes("forecast") || q.includes("prognoz")) {
    return `The AI revenue forecast for the next 3 months:\n\n• July 2026: €519K (±5% · confidence: 87%)\n• August 2026: €557K (±8% · confidence: 81%)\n• September 2026: €591K (±10% · confidence: 74%)\n\nKey assumptions: 4 active projects billing on schedule, no significant staff disruption, procurement costs stabilise below €90K/month.`
  }

  return `Based on your company data, here's what I found:\n\n• Revenue this month: €482K (↑12.4%)\n• Profit: €138K (↑8.1%)\n• Active projects: 38\n• Staff operational: 142/145\n\nI detected 3 signals requiring attention today: 2 overdue invoices (€3,240), a pending payroll approval (€28,400), and a procurement anomaly (+18% vs last week).\n\nCould you be more specific? For example: "Why is cash flow tight?", "Which store is most profitable?", or "Show invoice status".`
}

export const POST = withGates(
  { action: "intelligence.chat", endpointClass: "api_write" },
  async (req: NextRequest, _ctx: GateContext): Promise<Response> => {
    const raw = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const text = buildResponse(parsed.data.message)
    const words = text.split(" ")

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder()
        for (const word of words) {
          controller.enqueue(enc.encode(word + " "))
          await new Promise((r) => setTimeout(r, 18))
        }
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Content-Type-Options": "nosniff",
      },
    })
  }
)
