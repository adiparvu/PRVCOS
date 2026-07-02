import { db } from "@prv/db"
import { payrollRuns, payrollItems } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"

function n(v: string | null): number {
  const x = Number(v ?? 0)
  return Number.isFinite(x) ? x : 0
}

// Recompute a payroll run's header totals (employeeCount / totalGross / netPaid)
// from its line items. Called after any item write so the run stays in sync.
export async function recomputeRunTotals(runId: string, companyId: string): Promise<void> {
  const rows = await db
    .select({ gross: payrollItems.grossAmount, net: payrollItems.netAmount })
    .from(payrollItems)
    .where(eq(payrollItems.runId, runId))
  const totalGross = rows.reduce((s, r) => s + n(r.gross), 0)
  const totalNet = rows.reduce((s, r) => s + n(r.net), 0)
  await db
    .update(payrollRuns)
    .set({
      employeeCount: rows.length,
      totalGross: totalGross.toFixed(2),
      netPaid: totalNet.toFixed(2),
      updatedAt: new Date(),
    })
    .where(and(eq(payrollRuns.id, runId), eq(payrollRuns.companyId, companyId)))
}
