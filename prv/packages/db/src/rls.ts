import postgres from "postgres"

export interface RLSContext {
  companyId: string
  userId: string
}

// withRLS wraps a callback in a transaction that sets the RLS session variables
// required by all company-scoped policies:
//   SET LOCAL app.company_id = '<uuid>';
//   SET LOCAL app.user_id   = '<uuid>';
//
// This works in PgBouncer transaction mode because SET LOCAL is scoped to the
// current transaction — exactly one transaction per request.
export async function withRLS<T>(
  sql: postgres.Sql,
  ctx: RLSContext,
  callback: (tx: postgres.TransactionSql) => Promise<T>
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx.unsafe(
      `SET LOCAL app.company_id = '${ctx.companyId}'; SET LOCAL app.user_id = '${ctx.userId}';`
    )
    return callback(tx)
  })
}
