import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the Redis client before importing cache modules
const mockGet = vi.fn()
const mockSet = vi.fn()
const mockDel = vi.fn()
const mockScan = vi.fn()
const mockPipeline = vi.fn()

vi.mock("../client", () => ({
  getRedis: () => ({
    get: mockGet,
    set: mockSet,
    del: mockDel,
    scan: mockScan,
    pipeline: mockPipeline,
  }),
  CacheTTL: {
    COMPANY_CONTEXT: 300,
    TYPESENSE_KEY: 3600,
    QUERY_SHORT: 60,
    QUERY_MEDIUM: 300,
    QUERY_LONG: 3600,
  },
  cacheKey: {
    query: (ns: string, k: string) => `query:${ns}:${k}`,
  },
}))

import {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheMemo,
  getCompanyContext,
  setCompanyContext,
  invalidateCompanyContext,
} from "../query"
import type { CompanyContext } from "../query"

const MOCK_CTX: CompanyContext = {
  id: "cmp-1",
  slug: "prv-renovations",
  name: "PRV Renovations",
  type: "renovations",
  status: "active",
  settings: {},
  locale: "ro-RO",
  timezone: "Europe/Bucharest",
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("cacheGet", () => {
  it("returns parsed value on hit", async () => {
    mockGet.mockResolvedValue({ foo: "bar" })
    const result = await cacheGet("test", "key1")
    expect(result).toEqual({ foo: "bar" })
    expect(mockGet).toHaveBeenCalledWith("query:test:key1")
  })

  it("returns null on miss", async () => {
    mockGet.mockResolvedValue(null)
    const result = await cacheGet("test", "missing")
    expect(result).toBeNull()
  })
})

describe("cacheSet", () => {
  it("uses QUERY_MEDIUM TTL by default", async () => {
    mockSet.mockResolvedValue("OK")
    await cacheSet("test", "key1", { x: 1 })
    expect(mockSet).toHaveBeenCalledWith("query:test:key1", { x: 1 }, { ex: 300 })
  })

  it("respects custom TTL", async () => {
    mockSet.mockResolvedValue("OK")
    await cacheSet("test", "key2", "value", { ttl: 3600 })
    expect(mockSet).toHaveBeenCalledWith("query:test:key2", "value", { ex: 3600 })
  })
})

describe("cacheDel", () => {
  it("deletes the correct key", async () => {
    mockDel.mockResolvedValue(1)
    await cacheDel("test", "key1")
    expect(mockDel).toHaveBeenCalledWith("query:test:key1")
  })
})

describe("cacheMemo", () => {
  it("returns cached value without calling fetcher", async () => {
    mockGet.mockResolvedValue({ cached: true })
    const fetcher = vi.fn()
    const result = await cacheMemo("ns", "k", fetcher)
    expect(result).toEqual({ cached: true })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it("calls fetcher on miss and caches result", async () => {
    mockGet.mockResolvedValue(null)
    mockSet.mockResolvedValue("OK")
    const fetcher = vi.fn().mockResolvedValue({ fresh: true })
    const result = await cacheMemo("ns", "k", fetcher)
    expect(result).toEqual({ fresh: true })
    expect(fetcher).toHaveBeenCalledOnce()
    expect(mockSet).toHaveBeenCalled()
  })
})

describe("company context cache", () => {
  it("getCompanyContext returns null on miss", async () => {
    mockGet.mockResolvedValue(null)
    const result = await getCompanyContext("cmp-1")
    expect(result).toBeNull()
  })

  it("setCompanyContext stores with COMPANY_CONTEXT TTL", async () => {
    mockSet.mockResolvedValue("OK")
    await setCompanyContext(MOCK_CTX)
    expect(mockSet).toHaveBeenCalledWith(expect.stringContaining("cmp-1"), MOCK_CTX, { ex: 300 })
  })

  it("invalidateCompanyContext deletes correct key", async () => {
    mockDel.mockResolvedValue(1)
    await invalidateCompanyContext("cmp-1")
    expect(mockDel).toHaveBeenCalledWith(expect.stringContaining("cmp-1"))
  })
})
