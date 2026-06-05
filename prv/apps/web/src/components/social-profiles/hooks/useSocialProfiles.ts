"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { SocialProfile } from "../SocialProfilesRenderer"

async function fetchProfiles(userId: string): Promise<SocialProfile[]> {
  const res = await fetch(`/api/people/${userId}/social`)
  if (!res.ok) throw new Error("Failed to fetch social profiles")
  const data = await res.json()
  return data.profiles as SocialProfile[]
}

async function upsertProfile(payload: {
  platform: string
  url: string
  displayName?: string
  isPublic?: boolean
  consentGiven?: boolean
}): Promise<void> {
  const res = await fetch("/api/me/social", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error("Failed to save social profile")
}

async function deleteProfile(platform: string): Promise<void> {
  const res = await fetch("/api/me/social", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ platform }),
  })
  if (!res.ok) throw new Error("Failed to delete social profile")
}

export function useSocialProfiles(userId: string) {
  return useQuery({
    queryKey: ["social-profiles", userId],
    queryFn: () => fetchProfiles(userId),
    staleTime: 60_000,
    retry: 1,
  })
}

export function useUpsertSocialProfile(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: upsertProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["social-profiles", userId] }),
  })
}

export function useDeleteSocialProfile(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["social-profiles", userId] }),
  })
}
