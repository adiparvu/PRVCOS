import { db } from "@prv/db"
import {
  documents,
  invoices,
  portalAccounts,
  projectMessages,
  projects,
  renovationContracts,
  renovationProjects,
  renovationSiteReports,
} from "@prv/db/schema"
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm"

// Derived client-notification feed (preview approved 2026-07). Portal clients
// have no rows in `users` (RA-01), so the business notifications table cannot
// address them. Instead of a parallel event table needing plumbing in every
// producer, the feed is COMPUTED from the client-visible entities themselves —
// it cannot miss an event, and each item mirrors the filter of the portal
// route that would display it.

export interface ClientNotification {
  id: string
  kind: "site_report" | "quote" | "invoice" | "contract" | "document" | "message"
  title: string
  body: string
  date: string
  unread: boolean
}

const FEED_LIMIT = 30
const PER_SOURCE = 12

interface FeedCtx {
  companyId: string
  clientId: string
  accountId: string
}

export async function getClientNotifications(
  ctx: FeedCtx
): Promise<{ items: ClientNotification[]; unreadCount: number }> {
  const [account] = await db
    .select({ seenAt: portalAccounts.notificationsSeenAt })
    .from(portalAccounts)
    .where(eq(portalAccounts.id, ctx.accountId))
    .limit(1)
  const seenAt = account?.seenAt ?? null

  const [reports, quoteRows, invoiceRows, contractRows, docRows, messageRows] = await Promise.all([
    // Client-visible site reports — same join as the portal contracts route.
    db
      .select({
        id: renovationSiteReports.id,
        date: renovationSiteReports.createdAt,
        photos: renovationSiteReports.photos,
      })
      .from(renovationSiteReports)
      .innerJoin(renovationProjects, eq(renovationSiteReports.projectId, renovationProjects.id))
      .where(
        and(
          eq(renovationProjects.companyId, ctx.companyId),
          eq(renovationProjects.clientId, ctx.clientId),
          eq(renovationSiteReports.clientVisible, true)
        )
      )
      .orderBy(desc(renovationSiteReports.createdAt))
      .limit(PER_SOURCE),
    // Quotes awaiting the client's decision (portal quotes route: status sent,
    // no clientDecision recorded yet).
    db
      .select({
        id: invoices.id,
        number: invoices.invoiceNumber,
        date: invoices.updatedAt,
        metadata: invoices.metadata,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, ctx.companyId),
          eq(invoices.clientId, ctx.clientId),
          eq(invoices.status, "sent")
        )
      )
      .orderBy(desc(invoices.updatedAt))
      .limit(PER_SOURCE),
    // Invoices the client can see beyond quotes: overdue and recently paid.
    db
      .select({
        id: invoices.id,
        number: invoices.invoiceNumber,
        status: invoices.status,
        date: invoices.updatedAt,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, ctx.companyId),
          eq(invoices.clientId, ctx.clientId),
          inArray(invoices.status, ["overdue", "paid"])
        )
      )
      .orderBy(desc(invoices.updatedAt))
      .limit(PER_SOURCE),
    // Contracts awaiting the client's signature (portal contracts route join).
    db
      .select({
        id: renovationContracts.id,
        title: renovationContracts.contractNumber,
        date: renovationContracts.updatedAt,
      })
      .from(renovationContracts)
      .innerJoin(renovationProjects, eq(renovationContracts.projectId, renovationProjects.id))
      .where(
        and(
          eq(renovationProjects.companyId, ctx.companyId),
          eq(renovationProjects.clientId, ctx.clientId),
          eq(renovationContracts.status, "sent"),
          isNull(renovationContracts.signedByClientAt)
        )
      )
      .orderBy(desc(renovationContracts.updatedAt))
      .limit(PER_SOURCE),
    // Documents shared with the client — excluding the client's own uploads
    // (metadata.uploadedVia = client_portal), which would be self-noise.
    db
      .select({ id: documents.id, title: documents.title, date: documents.createdAt })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, ctx.companyId),
          eq(documents.clientId, ctx.clientId),
          isNull(documents.deletedAt),
          sql`coalesce(${documents.metadata}->>'uploadedVia', '') <> 'client_portal'`
        )
      )
      .orderBy(desc(documents.createdAt))
      .limit(PER_SOURCE),
    // Team messages on the client's projects (staff-authored only).
    db
      .select({
        id: projectMessages.id,
        body: projectMessages.body,
        date: projectMessages.createdAt,
        projectName: projects.name,
      })
      .from(projectMessages)
      .innerJoin(projects, eq(projectMessages.projectId, projects.id))
      .where(
        and(
          eq(projectMessages.companyId, ctx.companyId),
          eq(projects.clientId, ctx.clientId),
          isNull(projectMessages.authorPortalAccountId)
        )
      )
      .orderBy(desc(projectMessages.createdAt))
      .limit(PER_SOURCE),
  ])

  const items: Omit<ClientNotification, "unread">[] = [
    ...reports.map((r) => {
      const photoCount = Array.isArray(r.photos) ? (r.photos as unknown[]).length : 0
      return {
        id: `report-${r.id}`,
        kind: "site_report" as const,
        title: "New progress update",
        body:
          photoCount > 0
            ? `Site report published — ${photoCount} new photos`
            : "Site report published",
        date: r.date.toISOString(),
      }
    }),
    ...quoteRows
      .filter((q) => {
        const meta = (q.metadata ?? {}) as Record<string, unknown>
        return !meta["clientDecision"]
      })
      .map((q) => ({
        id: `quote-${q.id}`,
        kind: "quote" as const,
        title: "Quote awaiting your decision",
        body: `Quote ${q.number} — review and accept or reject in Quotes`,
        date: q.date.toISOString(),
      })),
    ...invoiceRows.map((i) => ({
      id: `invoice-${i.id}`,
      kind: "invoice" as const,
      title: i.status === "overdue" ? "Invoice overdue" : "Payment recorded",
      body: `Invoice ${i.number}`,
      date: i.date.toISOString(),
    })),
    ...contractRows.map((c) => ({
      id: `contract-${c.id}`,
      kind: "contract" as const,
      title: "Contract ready to sign",
      body: `Contract ${c.title} awaits your signature`,
      date: c.date.toISOString(),
    })),
    ...docRows.map((d) => ({
      id: `document-${d.id}`,
      kind: "document" as const,
      title: "Document shared with you",
      body: `"${d.title}" added to your documents`,
      date: d.date.toISOString(),
    })),
    ...messageRows.map((m) => ({
      id: `message-${m.id}`,
      kind: "message" as const,
      title: `Message on ${m.projectName}`,
      body: m.body.slice(0, 140),
      date: m.date.toISOString(),
    })),
  ]

  items.sort((a, b) => b.date.localeCompare(a.date))
  const top = items.slice(0, FEED_LIMIT)
  const withUnread: ClientNotification[] = top.map((i) => ({
    ...i,
    unread: seenAt ? i.date > seenAt.toISOString() : true,
  }))
  return { items: withUnread, unreadCount: withUnread.filter((i) => i.unread).length }
}

export async function markClientNotificationsSeen(accountId: string): Promise<void> {
  await db
    .update(portalAccounts)
    .set({ notificationsSeenAt: new Date(), updatedAt: new Date() })
    .where(eq(portalAccounts.id, accountId))
}
