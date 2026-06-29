import { db } from "../client"
import { companyGroups, groupMemberships, groupKpiSnapshots } from "../schema"
import { eq } from "drizzle-orm"

// Seeds the "PRV Group" holding company, links the demo company as a member,
// and back-fills a week of nightly KPI snapshots so the CEO group-rollup view
// has a visible trend on a fresh database. Idempotent (safe to re-run).
export async function seedGroup({
  companyId,
  ceoId,
}: {
  companyId: string
  ceoId: string
}): Promise<{ groupId: string }> {
  const [created] = await db
    .insert(companyGroups)
    .values({
      name: "PRV Group",
      slug: "prv-group",
      description: "Holding group across PRV Renovations, Projects and Shop.",
      ownerId: ceoId,
    })
    .onConflictDoNothing({ target: companyGroups.slug })
    .returning({ id: companyGroups.id })

  let groupId = created?.id
  if (!groupId) {
    const [existing] = await db
      .select({ id: companyGroups.id })
      .from(companyGroups)
      .where(eq(companyGroups.slug, "prv-group"))
      .limit(1)
    groupId = existing!.id
  }

  await db
    .insert(groupMemberships)
    .values({ groupId, companyId, addedBy: ceoId, isActive: true })
    .onConflictDoNothing({ target: [groupMemberships.groupId, groupMemberships.companyId] })

  // Seven days of snapshots with a gently rising revenue trend.
  const today = new Date()
  const snapshots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getTime() - (6 - i) * 86_400_000)
    const date = d.toISOString().slice(0, 10)
    const revenue = 38000 + i * 2600
    return {
      groupId: groupId!,
      snapshotDate: date,
      totalRevenue: String(revenue),
      totalActiveProjects: "12",
      totalActiveEmployees: "6",
      totalOpenAlerts: "2",
      companyBreakdown: [{ companyId, revenue: String(revenue) }],
      companiesIncluded: "1",
    }
  })

  await db
    .insert(groupKpiSnapshots)
    .values(snapshots)
    .onConflictDoNothing({ target: [groupKpiSnapshots.groupId, groupKpiSnapshots.snapshotDate] })

  console.log(`    ✓ Group: ${groupId} (+ ${snapshots.length} snapshots)`)
  return { groupId }
}
