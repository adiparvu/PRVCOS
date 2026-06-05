"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { BusinessCardData } from "../BusinessCard"

async function fetchCard(userId: string): Promise<BusinessCardData | null> {
  const res = await fetch(`/api/people/${userId}/card`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error("Failed to fetch business card")
  const data = await res.json()
  return data.card as BusinessCardData
}

async function fetchMyCard(): Promise<BusinessCardData | null> {
  const res = await fetch("/api/me/card")
  if (res.status === 404) return null
  if (!res.ok) throw new Error("Failed to fetch business card")
  const data = await res.json()
  return data.card as BusinessCardData
}

async function updateMyCard(
  patch: Partial<Omit<BusinessCardData, "id" | "userId">>
): Promise<BusinessCardData> {
  const res = await fetch("/api/me/card", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error("Failed to update business card")
  const data = await res.json()
  return data.card as BusinessCardData
}

export function useBusinessCard(userId: string) {
  return useQuery({
    queryKey: ["business-card", userId],
    queryFn: () => fetchCard(userId),
    staleTime: 60_000,
    retry: 1,
  })
}

export function useMyBusinessCard() {
  return useQuery({
    queryKey: ["business-card", "me"],
    queryFn: fetchMyCard,
    staleTime: 60_000,
    retry: 1,
  })
}

export function useUpdateMyBusinessCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateMyCard,
    onSuccess: (updated) => {
      qc.setQueryData(["business-card", "me"], updated)
      qc.invalidateQueries({ queryKey: ["business-card", updated.userId] })
    },
  })
}
