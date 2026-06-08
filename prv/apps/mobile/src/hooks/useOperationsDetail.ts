import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export interface TaskDetail {
  task: {
    id: string
    title: string
    description: string | null
    dueDate: string | null
    isComplete: boolean
    completedAt: string | null
    createdAt: string
    isOverdue: boolean
  }
  project: {
    id: string
    name: string
    status: string
  }
}

export function useTaskDetail(taskId: string) {
  return useQuery<TaskDetail>({
    queryKey: ["task-detail", taskId],
    queryFn: () => api.get<TaskDetail>(`/api/mobile/tasks/${taskId}`),
    staleTime: 30_000,
    retry: 2,
    enabled: !!taskId,
  })
}

export function useToggleTask(taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (isComplete: boolean) =>
      api.patch<{ id: string; isComplete: boolean }>(`/api/mobile/tasks/${taskId}`, {
        isComplete,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["task-detail", taskId] })
      void qc.invalidateQueries({ queryKey: ["operations"] })
    },
  })
}
