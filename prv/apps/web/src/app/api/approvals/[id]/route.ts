import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { approvalRequests, users } from "@prv/db/schema"
import { alias } from "drizzle-orm/pg-core"
import { and, eq } from "drizzle-orm"
import type { ApprovalType, ApprovalStatus, ApprovalSummary } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ChainStepStatus = "done" | "current" | "pending"

export interface ChainStep {
  id: string
  name: string
  role: string
  status: ChainStepStatus
  timestamp: string | null
}

export interface ActivityEntry {
  id: string
  authorInitials: string
  authorName: string
  text: string
  timestamp: string
  isSystem: boolean
}

export interface ApprovalDetail extends ApprovalSummary {
  project: string | null
  supplier: string | null
  delivery: string | null
  paymentTerms: string | null
  neededBy: string | null
  itemCount: number | null
  chain: ChainStep[]
  activity: ActivityEntry[]
}

const MONTH_LABELS = [
  "Ian",
  "Feb",
  "Mar",
  "Apr",
  "Mai",
  "Iun",
  "Iul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

function fmtDate(d: Date): string {
  return `${d.getDate()} ${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`
}

function fmtShort(d: Date): string {
  return `${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`
}

function daysUntil(d: Date): number {
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000)
}

function dbStatusToApi(s: string, deadlineDate: Date): ApprovalStatus {
  if (s === "approved" || s === "rejected") return "Pending"
  if (s === "urgent") return "Urgent"
  if (s === "expired" || deadlineDate < new Date()) return "Expired"
  return "Pending"
}

export const GET = withGates(
  { action: "approvals.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

    const requester = alias(users, "requester")
    const approver = alias(users, "approver")

    const rows = await db
      .select({
        id: approvalRequests.id,
        type: approvalRequests.type,
        ref: approvalRequests.ref,
        title: approvalRequests.title,
        description: approvalRequests.description,
        value: approvalRequests.value,
        deadline: approvalRequests.deadline,
        status: approvalRequests.status,
        createdAt: approvalRequests.createdAt,
        resolvedAt: approvalRequests.resolvedAt,
        requesterFirstName: requester.firstName,
        requesterLastName: requester.lastName,
        approverFirstName: approver.firstName,
        approverLastName: approver.lastName,
      })
      .from(approvalRequests)
      .leftJoin(requester, eq(approvalRequests.requestedByUserId, requester.id))
      .leftJoin(approver, eq(approvalRequests.approvedByUserId, approver.id))
      .where(and(eq(approvalRequests.id, id), eq(approvalRequests.companyId, companyId)))
      .limit(1)

    const row = rows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const requestedBy = row.requesterFirstName
      ? `${row.requesterFirstName} ${row.requesterLastName}`
      : "—"
    const initials =
      requestedBy !== "—" ? `${row.requesterFirstName![0]}${row.requesterLastName![0]}` : "?"

    const apiStatus = dbStatusToApi(row.status, row.deadline)
    const daysLeft = daysUntil(row.deadline)

    const chain: ChainStep[] = [
      {
        id: "c1",
        name: requestedBy,
        role: `Solicitant · Creat ${fmtShort(row.createdAt)}`,
        status: "done",
        timestamp: fmtShort(row.createdAt),
      },
      {
        id: "c2",
        name: row.approverFirstName
          ? `${row.approverFirstName} ${row.approverLastName}`
          : "Manager",
        role: `Nivel 1 · Termen: ${fmtDate(row.deadline)}`,
        status: row.resolvedAt ? "done" : "current",
        timestamp: row.resolvedAt ? fmtShort(row.resolvedAt) : null,
      },
    ]

    const activity: ActivityEntry[] = [
      {
        id: "ac1",
        authorInitials: initials,
        authorName: requestedBy,
        text: row.description ?? "Cerere înaintată spre aprobare.",
        timestamp: `${fmtShort(row.createdAt)} · ${row.createdAt.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}`,
        isSystem: false,
      },
      {
        id: "ac2",
        authorInitials: "SY",
        authorName: "System",
        text: "Cerere trimisă spre aprobare",
        timestamp: `${fmtShort(row.createdAt)} · ${row.createdAt.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}`,
        isSystem: true,
      },
    ]

    const approval: ApprovalDetail = {
      id: row.id,
      type: row.type as ApprovalType,
      ref: row.ref,
      title: row.title,
      requestedBy,
      description: row.description ?? "",
      value: row.value ? Number(row.value) : null,
      deadline: fmtDate(row.deadline),
      daysUntilDeadline: daysLeft,
      status: apiStatus,
      project: null,
      supplier: null,
      delivery: null,
      paymentTerms: null,
      neededBy: null,
      itemCount: null,
      chain,
      activity,
    }

    return NextResponse.json({ approval })
  }
)
