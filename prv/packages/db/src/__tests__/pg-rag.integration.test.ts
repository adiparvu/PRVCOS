/**
 * Real-pgvector integration tests for the RAG retrieval layer (audit #11).
 * Verifies what mocks cannot: the `<=>` cosine operator orders correctly on
 * the real vector(1536) column, and retrieval never crosses tenants.
 * Skipped unless TEST_DATABASE_URL points at a fully provisioned schema.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import postgres from "postgres"

const TEST_URL = process.env["TEST_DATABASE_URL"]
const DIM = 1536

/** Unit vector concentrated on one axis — cosine distances are exact. */
function axisVec(axis: number): string {
  const v = new Array(DIM).fill(0)
  v[axis] = 1
  return `[${v.join(",")}]`
}
/** Unit vector between axis 0 and the given axis (45°). */
function diagVec(axis: number): string {
  const v = new Array(DIM).fill(0)
  const c = Math.SQRT1_2
  v[0] = c
  v[axis] = c
  return `[${v.join(",")}]`
}

describe.skipIf(!TEST_URL)("pgvector retrieval on document_embeddings", () => {
  let sql: postgres.Sql
  let companyA: string
  let companyB: string

  beforeAll(async () => {
    sql = postgres(TEST_URL!, { max: 2, prepare: false, onnotice: () => {} })
    const rows = await sql<{ id: string }[]>`
      INSERT INTO companies (name, slug) VALUES
        ('RAG Probe A', ${`rag-a-${Date.now()}`}),
        ('RAG Probe B', ${`rag-b-${Date.now()}`})
      RETURNING id`
    companyA = rows[0]!.id
    companyB = rows[1]!.id

    const doc = (company: string, src: string, chunk: number, content: string, vec: string) =>
      sql`INSERT INTO document_embeddings
            (company_id, source_type, source_id, chunk_index, content, embedding)
          VALUES (${company}, 'knowledge_article', ${src}, ${chunk}, ${content}, ${vec}::vector)`

    const A1 = "aaaaaaaa-0000-4000-8000-000000000001"
    const A2 = "aaaaaaaa-0000-4000-8000-000000000002"
    const B1 = "bbbbbbbb-0000-4000-8000-000000000001"
    await doc(companyA, A1, 0, "exact match", axisVec(0))
    await doc(companyA, A2, 0, "close match", diagVec(1))
    await doc(companyA, A2, 1, "far match", axisVec(2))
    // Tenant B holds the closest possible vector — it must never appear for A.
    await doc(companyB, B1, 0, "other tenant exact", axisVec(0))
  })

  afterAll(async () => {
    await sql`DELETE FROM companies WHERE id IN (${companyA}, ${companyB})`.catch(() => {})
    await sql.end()
  })

  it("orders by cosine similarity and scopes to the company", async () => {
    const query = axisVec(0)
    const rows = await sql<{ content: string; similarity: number }[]>`
      SELECT content, 1 - (embedding <=> ${query}::vector) AS similarity
      FROM document_embeddings
      WHERE company_id = ${companyA} AND source_type = 'knowledge_article'
      ORDER BY embedding <=> ${query}::vector
      LIMIT 5`

    expect(rows.map((r) => r.content)).toEqual(["exact match", "close match", "far match"])
    expect(Number(rows[0]!.similarity)).toBeCloseTo(1, 5)
    expect(Number(rows[1]!.similarity)).toBeCloseTo(Math.SQRT1_2, 5)
    expect(Number(rows[2]!.similarity)).toBeCloseTo(0, 5)
    // The other tenant's identical vector did not leak in.
    expect(rows.some((r) => r.content.includes("other tenant"))).toBe(false)
  })

  it("company deletion cascades to its embeddings", async () => {
    const [probe] = await sql<{ id: string }[]>`
      INSERT INTO companies (name, slug) VALUES ('RAG Cascade', ${`rag-c-${Date.now()}`})
      RETURNING id`
    await sql`INSERT INTO document_embeddings
        (company_id, source_type, source_id, chunk_index, content, embedding)
      VALUES (${probe!.id}, 'knowledge_article', 'cccccccc-0000-4000-8000-000000000001', 0, 'x', ${axisVec(3)}::vector)`
    await sql`DELETE FROM companies WHERE id = ${probe!.id}`
    const [count] = await sql<{ n: string }[]>`
      SELECT count(*)::text AS n FROM document_embeddings WHERE company_id = ${probe!.id}`
    expect(count!.n).toBe("0")
  })
})
