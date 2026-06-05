"use client"

import { useQuery } from "@tanstack/react-query"
import type { EntityType, PreviewPayload } from "../types"

async function fetchPreviewPayload(
  entityType: EntityType,
  entityId: string
): Promise<PreviewPayload> {
  const res = await fetch(`/api/preview/${entityType}/${entityId}`, {
    credentials: "include",
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `Failed to load ${entityType}`)
  }
  return res.json() as Promise<PreviewPayload>
}

export function useEntityData(entityType: EntityType | null, entityId: string | null) {
  return useQuery({
    queryKey: ["preview", entityType, entityId],
    queryFn: () => fetchPreviewPayload(entityType!, entityId!),
    enabled: !!entityType && !!entityId,
    staleTime: 30_000, // 30 s — matches API cache TTL
    retry: 1,
  })
}
