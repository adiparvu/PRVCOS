import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export interface SessionInfo {
  sessionId: string
  deviceId: string
  createdAt: number
  lastActiveAt: number
  expiresAt: number
  isCurrent: boolean
}

export interface ActivityEntry {
  id: string
  action: string
  ipAddress: string | null
  createdAt: string | null
}

export interface SecurityData {
  mfa: {
    enabled: boolean
    backupCodesRemaining: number
  }
  sessions: SessionInfo[]
  recentActivity: ActivityEntry[]
}

export function useSecuritySettings() {
  return useQuery<SecurityData>({
    queryKey: ["security-settings"],
    queryFn: () => api.get<SecurityData>("/api/mobile/security"),
    staleTime: 30_000,
    retry: 2,
  })
}

export function useRevokeSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) =>
      api.del<{ success: boolean }>(`/api/mobile/security/sessions/${sessionId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["security-settings"] })
    },
  })
}

export function useRevokeAllSessions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.del<{ revokedCount: number }>("/api/mobile/security/sessions"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["security-settings"] })
    },
  })
}
