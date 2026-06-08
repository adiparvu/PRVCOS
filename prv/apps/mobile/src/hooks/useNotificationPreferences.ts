import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export interface NotificationPreferences {
  inApp: boolean
  push: boolean
  email: boolean
  sms: boolean
  quietHoursStart: string | null
  quietHoursEnd: string | null
}

export function useNotificationPreferences() {
  return useQuery<NotificationPreferences>({
    queryKey: ["notification-preferences"],
    queryFn: () => api.get<NotificationPreferences>("/api/mobile/notifications/preferences"),
    staleTime: 60_000,
  })
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (updates: Partial<NotificationPreferences>) =>
      api.patch<{ success: boolean }>("/api/mobile/notifications/preferences", updates),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["notification-preferences"] })
      const prev = queryClient.getQueryData<NotificationPreferences>(["notification-preferences"])
      if (prev) {
        queryClient.setQueryData<NotificationPreferences>(["notification-preferences"], {
          ...prev,
          ...updates,
        })
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(["notification-preferences"], ctx.prev)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] })
    },
  })
}
