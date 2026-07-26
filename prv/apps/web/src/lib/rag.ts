import { db } from "@prv/db"
import { documentEmbeddings } from "@prv/db/schema"
import { and, eq, sql } from "drizzle-orm"
import { chunkText, embedTexts, isEmbeddingConfigured } from "@prv/ai-engine"

// Retrieval layer over document_embeddings (pgvector). Company-scoped at
// every entry point — the embedding table carries companyId and both the
// writer and the reader filter on it, same tenancy discipline as every route.

export interface RetrievedChunk {
  sourceId: string
  chunkIndex: number
  content: string
  /** cosine similarity in [0, 1] — 1 is identical direction */
  similarity: number
}

function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`
}

/**
 * (Re)embed one source document: delete its previous chunks, chunk the text,
 * embed, insert. Idempotent per (companyId, sourceType, sourceId).
 * Returns the number of chunks written (0 when unconfigured or empty).
 */
export async function upsertSourceEmbeddings(
  companyId: string,
  sourceType: "knowledge_article" | "project" | "document" | "insight",
  sourceId: string,
  text: string
): Promise<number> {
  if (!isEmbeddingConfigured()) return 0

  const chunks = chunkText(text)
  const vectors = chunks.length > 0 ? await embedTexts(chunks.map((c) => c.content)) : []

  await db
    .delete(documentEmbeddings)
    .where(
      and(
        eq(documentEmbeddings.companyId, companyId),
        eq(documentEmbeddings.sourceType, sourceType),
        eq(documentEmbeddings.sourceId, sourceId)
      )
    )

  if (chunks.length === 0) return 0

  await db.insert(documentEmbeddings).values(
    chunks.map((chunk, i) => ({
      companyId,
      sourceType,
      sourceId,
      chunkIndex: chunk.index,
      content: chunk.content,
      embedding: vectors[i]!,
    }))
  )
  return chunks.length
}

/**
 * Top-k chunks by cosine similarity for one company (optionally one source
 * type). Uses pgvector's `<=>` cosine-distance operator; similarity = 1 - d.
 */
export async function searchChunks(
  companyId: string,
  queryEmbedding: number[],
  opts: { k?: number; sourceType?: "knowledge_article" | "project" | "document" | "insight" } = {}
): Promise<RetrievedChunk[]> {
  const k = Math.min(Math.max(opts.k ?? 5, 1), 20)
  const vec = toVectorLiteral(queryEmbedding)

  const rows = (await db
    .select({
      sourceId: documentEmbeddings.sourceId,
      chunkIndex: documentEmbeddings.chunkIndex,
      content: documentEmbeddings.content,
      similarity: sql<number>`1 - (${documentEmbeddings.embedding} <=> ${vec}::vector)`,
    })
    .from(documentEmbeddings)
    .where(
      and(
        eq(documentEmbeddings.companyId, companyId),
        ...(opts.sourceType ? [eq(documentEmbeddings.sourceType, opts.sourceType)] : [])
      )
    )
    .orderBy(sql`${documentEmbeddings.embedding} <=> ${vec}::vector`)
    .limit(k)) as RetrievedChunk[]

  return rows.map((r) => ({ ...r, similarity: Number(r.similarity) }))
}
