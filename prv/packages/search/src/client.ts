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

// Generate a scoped search-only API key per company.
// Uses generateScopedSearchKey() — a client-side operation that embeds
// filter_by into the key itself. Typesense ANDs this filter with every query,
// enforcing company_id isolation without a round-trip to the server.
//
// Requires TYPESENSE_SEARCH_API_KEY — a search-only key (not the admin key).
// The admin key is never sent to clients.
export function getScopedSearchKey(companyId: string): string {
  const client = getTypesenseClient()
  const searchOnlyKey = process.env["TYPESENSE_SEARCH_API_KEY"]

  if (!searchOnlyKey) {
    throw new Error("TYPESENSE_SEARCH_API_KEY is required for scoped key generation")
  }

  // Embeds filter_by into the key — Typesense enforces this server-side on every query
  return client.keys().generateScopedSearchKey(searchOnlyKey, {
    filter_by: `company_id:${companyId}`,
  })
}
