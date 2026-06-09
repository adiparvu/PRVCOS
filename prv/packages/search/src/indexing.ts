import { getTypesenseClient } from "./client"

export function isTypesenseAvailable(): boolean {
  return !!(process.env["TYPESENSE_ADMIN_API_KEY"] && process.env["TYPESENSE_HOST"])
}

export async function upsertDocument(
  collection: string,
  doc: Record<string, unknown>
): Promise<void> {
  if (!isTypesenseAvailable()) return
  try {
    const client = getTypesenseClient()
    await client.collections(collection).documents().upsert(doc)
  } catch {
    // non-fatal — search index is best-effort
  }
}

export async function deleteDocument(collection: string, id: string): Promise<void> {
  if (!isTypesenseAvailable()) return
  try {
    const client = getTypesenseClient()
    await client.collections(collection).documents(id).delete()
  } catch {
    // document may not exist — non-fatal
  }
}

export async function bulkUpsert(
  collection: string,
  docs: Record<string, unknown>[]
): Promise<void> {
  if (!isTypesenseAvailable() || docs.length === 0) return
  try {
    const client = getTypesenseClient()
    await client.collections(collection).documents().import(docs, { action: "upsert" })
  } catch {
    // non-fatal
  }
}
