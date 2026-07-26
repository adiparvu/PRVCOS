import { redactPii } from "./pii"

// Embeddings for semantic search / RAG (audit area #11).
//
// Anthropic does not offer an embeddings endpoint, so this is the one place
// the platform calls a non-Anthropic model API. The document_embeddings
// schema fixes the dimension at 1536 — the native size of OpenAI's
// text-embedding-3-small — which makes that the provider of least change.
// The client is raw fetch (no SDK dependency) behind an env gate: without
// OPENAI_API_KEY the feature reports itself unconfigured and every consumer
// degrades gracefully (empty search results, chat without retrieved context).
//
// Policy: PII is redacted before ANY text leaves for an external model API
// (Phase 17.8), embeddings included. Redaction slightly perturbs the vector
// of a PII-bearing chunk; that is the accepted cost of the policy.

export const EMBEDDING_DIM = 1536
export const EMBEDDING_MODEL = "text-embedding-3-small"

/** Max texts per API call — the endpoint accepts far more, but bounded
 *  batches keep request bodies and failure blast-radius small. */
const BATCH_SIZE = 64

export function isEmbeddingConfigured(): boolean {
  return !!process.env["OPENAI_API_KEY"]
}

export interface TextChunk {
  index: number
  content: string
}

/**
 * Paragraph-aware chunker. Splits on blank lines and packs paragraphs into
 * chunks of at most `maxChars`, carrying `overlapChars` of trailing context
 * into the next chunk so a sentence cut at a boundary is still retrievable.
 * A single paragraph longer than `maxChars` is hard-split.
 */
export function chunkText(text: string, maxChars = 1800, overlapChars = 200): TextChunk[] {
  const clean = text.replace(/\r\n/g, "\n").trim()
  if (!clean) return []
  if (clean.length <= maxChars) return [{ index: 0, content: clean }]

  const paragraphs = clean
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((p) => {
      if (p.length <= maxChars) return [p]
      const parts: string[] = []
      for (let i = 0; i < p.length; i += maxChars) parts.push(p.slice(i, i + maxChars))
      return parts
    })

  const chunks: TextChunk[] = []
  let current = ""
  for (const para of paragraphs) {
    if (current && current.length + para.length + 2 > maxChars) {
      chunks.push({ index: chunks.length, content: current })
      current = current.slice(Math.max(0, current.length - overlapChars))
    }
    current = current ? `${current}\n\n${para}` : para
  }
  if (current.trim()) chunks.push({ index: chunks.length, content: current })
  return chunks
}

/**
 * Embed a list of texts. Returns one 1536-dim vector per input, in order.
 * Throws when the provider is not configured or the API answers non-2xx —
 * callers decide whether that is fatal (a job retry) or soft (empty search).
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = process.env["OPENAI_API_KEY"]
  if (!apiKey) throw new Error("Embeddings not configured: OPENAI_API_KEY is missing")
  if (texts.length === 0) return []

  const out: number[][] = []
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE).map((t) => redactPii(t))
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: batch }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      throw new Error(`Embedding request failed (${res.status}): ${detail.slice(0, 300)}`)
    }
    const json = (await res.json()) as { data: Array<{ index: number; embedding: number[] }> }
    // The API documents order preservation, but sort by index defensively —
    // a silently shuffled batch would attach vectors to the wrong chunks.
    const sorted = [...json.data].sort((a, b) => a.index - b.index)
    for (const item of sorted) {
      if (item.embedding.length !== EMBEDDING_DIM) {
        throw new Error(
          `Embedding dimension mismatch: got ${item.embedding.length}, schema requires ${EMBEDDING_DIM}`
        )
      }
      out.push(item.embedding)
    }
  }
  return out
}

/** Convenience: embed one query string. */
export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text])
  if (!vec) throw new Error("Embedding provider returned no vector")
  return vec
}
