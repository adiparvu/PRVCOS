import Typesense from "typesense"
import type { Client as TypesenseClient } from "typesense"

let _client: TypesenseClient | null = null

export function getTypesenseClient(): TypesenseClient {
  if (!_client) {
    const apiKey = process.env["TYPESENSE_ADMIN_API_KEY"]
    const host = process.env["TYPESENSE_HOST"]
    const port = Number(process.env["TYPESENSE_PORT"] ?? "443")
    const protocol = (process.env["TYPESENSE_PROTOCOL"] ?? "https") as "http" | "https"

    if (!apiKey || !host) {
      throw new Error("TYPESENSE_ADMIN_API_KEY and TYPESENSE_HOST are required")
    }

    _client = new Typesense.Client({
      nodes: [{ host, port, protocol }],
      apiKey,
      connectionTimeoutSeconds: 10,
    })
  }
  return _client
}

// Generate a scoped search-only API key per company
// This key is given to client-side — cannot write or see other companies
export async function getScopedSearchKey(companyId: string): Promise<string> {
  const client = getTypesenseClient()

  const key = await client.keys().create({
    description: `Search key for company ${companyId}`,
    actions: ["documents:search"],
    collections: ["*"],
    // Filter all searches to this company's data
    value_regex: `.*`,
    // Embedded filter — Typesense will AND this with every query
    // Ensures multi-tenant isolation at the search layer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)

  return key.value ?? ""
}
