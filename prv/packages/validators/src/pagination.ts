import { z } from "zod"

export const MAX_PAGE_SIZE = 100

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
})

export type PaginationInput = z.infer<typeof paginationSchema>

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export function paginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit)
  return {
    items,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  }
}

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
  direction: z.enum(["forward", "backward"]).default("forward"),
})

export type CursorPaginationInput = z.infer<typeof cursorPaginationSchema>

export interface CursorPaginatedResult<T> {
  items: T[]
  nextCursor: string | null
  prevCursor: string | null
  hasMore: boolean
}
