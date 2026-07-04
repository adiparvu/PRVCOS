import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { announcements } from "@prv/db/schema"
import { and, desc, eq, isNull } from "drizzle-orm"
import {
  computeReceipt,
  announcementLifecycle,
  type AnnouncementPriority,
  type AnnouncementLifecycle,
  type Receipt,
} from "@/lib/announcement-receipts"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface AnnouncementReceiptRow {
  id: string
  title: string
  priority: AnnouncementPriority
  audience: string
  acknowledgmentRequired: boolean
  lifecycle: AnnouncementLifecycle
  publishedAt: string | null
  expiresAt: string | null
  receipt: Receipt
}

export interface ReceiptsResponse {
  announcements: AnnouncementReceiptRow[]
  meta: { total: number; needsAttention: number; critical: number }
}

// GET /api/communications/announcements/receipts — read/acknowledgment coverage
// across the company's announcements, most recent first.
export const GET = withGates(
  { action: "communications.announcements.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select({
        id: announcements.id,
        title: announcements.title,
        priority: announcements.priority,
        audience: announcements.audience,
        acknowledgmentRequired: announcements.acknowledgmentRequired,
        totalAudience: announcements.totalAudience,
        readCount: announcements.readCount,
        ackCount: announcements.ackCount,
        publishedAt: announcements.publishedAt,
        scheduledAt: announcements.scheduledAt,
        expiresAt: announcements.expiresAt,
      })
      .from(announcements)
      .where(
        and(eq(announcements.companyId, ctx.session.companyId), isNull(announcements.deletedAt))
      )
      .orderBy(desc(announcements.createdAt))

    const now = Date.now()
    const list: AnnouncementReceiptRow[] = rows.map((r) => {
      const receipt = computeReceipt({
        totalAudience: r.totalAudience,
        readCount: r.readCount,
        ackCount: r.ackCount,
        acknowledgmentRequired: r.acknowledgmentRequired,
      })
      return {
        id: r.id,
        title: r.title,
        priority: r.priority as AnnouncementPriority,
        audience: r.audience,
        acknowledgmentRequired: r.acknowledgmentRequired,
        lifecycle: announcementLifecycle(
          r.publishedAt ? r.publishedAt.toISOString() : null,
          r.scheduledAt ? r.scheduledAt.toISOString() : null,
          r.expiresAt ? r.expiresAt.toISOString() : null,
          now
        ),
        publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
        expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
        receipt,
      }
    })

    const meta = {
      total: list.length,
      needsAttention: list.filter(
        (a) => a.lifecycle === "active" && a.acknowledgmentRequired && a.receipt.unacked > 0
      ).length,
      critical: list.filter((a) => a.priority === "critical" && a.lifecycle === "active").length,
    }

    return NextResponse.json({ announcements: list, meta })
  }
)
