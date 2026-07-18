import { getPortalSession } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { renovationContracts, renovationProjects } from "@prv/db/schema"
import { and, desc, eq, isNull, ne } from "drizzle-orm"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { PortalContractsClient, type PortalContract } from "./PortalContractsClient"

export const metadata: Metadata = { title: "Contracts" }
export const dynamic = "force-dynamic"

export default async function PortalContractsPage() {
  const session = await getPortalSession()
  if (!session || !session.clientId) redirect("/portal/login")

  const rows = await db
    .select({
      id: renovationContracts.id,
      contractNumber: renovationContracts.contractNumber,
      status: renovationContracts.status,
      contractValue: renovationContracts.contractValue,
      currency: renovationContracts.currency,
      startDate: renovationContracts.startDate,
      endDate: renovationContracts.endDate,
      signedByClientAt: renovationContracts.signedByClientAt,
      signedByCompanyAt: renovationContracts.signedByCompanyAt,
      projectTitle: renovationProjects.title,
    })
    .from(renovationContracts)
    .innerJoin(renovationProjects, eq(renovationContracts.projectId, renovationProjects.id))
    .where(
      and(
        eq(renovationProjects.companyId, session.companyId),
        eq(renovationProjects.clientId, session.clientId),
        isNull(renovationContracts.deletedAt),
        ne(renovationContracts.status, "draft")
      )
    )
    .orderBy(desc(renovationContracts.createdAt))

  const contracts: PortalContract[] = rows.map((r) => ({
    id: r.id,
    contractNumber: r.contractNumber,
    status: r.status,
    value: Number(r.contractValue),
    currency: r.currency,
    startDate: r.startDate ? String(r.startDate) : null,
    endDate: r.endDate ? String(r.endDate) : null,
    signedByClient: r.signedByClientAt !== null,
    signedByCompany: r.signedByCompanyAt !== null,
    project: r.projectTitle,
    signable: r.status === "sent" && r.signedByClientAt === null,
  }))

  return <PortalContractsClient contracts={contracts} />
}
