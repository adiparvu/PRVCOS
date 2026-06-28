"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { EntityResult } from "./types"

const DEBOUNCE_MS = 280
const MIN_QUERY_LEN = 2

interface SearchState {
  results: EntityResult[]
  loading: boolean
}

export function useEntitySearch(query: string): SearchState {
  const [state, setState] = useState<SearchState>({ results: [], loading: false })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const run = useCallback(async (q: string) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setState((prev) => ({ ...prev, loading: true }))

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=6`, {
        signal: abortRef.current.signal,
      })
      if (!res.ok) throw new Error("search_error")
      const data = (await res.json()) as { results?: EntityResult[] }
      setState({ results: data.results ?? [], loading: false })
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return
      setState({ results: [], loading: false })
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const trimmed = query.trim()
    if (trimmed.length < MIN_QUERY_LEN) {
      abortRef.current?.abort()
      // Debounced search: clear results immediately for short queries.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ results: [], loading: false })
      return
    }

    timerRef.current = setTimeout(() => run(trimmed), DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, run])

  return state
}
