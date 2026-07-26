import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { mutateOrQueue } from "@/lib/offline-queue"

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
    // Offline-safe (P2.10): with no signal on a job site, the toggle is
    // queued durably and replayed on reconnect instead of being lost.
    mutationFn: (isComplete: boolean) =>
      mutateOrQueue<{ id: string; isComplete: boolean }>({
        path: `/api/mobile/tasks/${taskId}`,
        method: "PATCH",
        body: { isComplete },
        label: isComplete ? "Complete task" : "Reopen task",
      }),
    onSuccess: (result, isComplete) => {
      if (result.queued) {
        // No server truth yet — reflect the intent locally so the UI (and the
        // persisted cache) match what will be replayed.
        qc.setQueryData<TaskDetail>(["task-detail", taskId], (old) =>
          old ? { ...old, isComplete } : old
        )
        return
      }
      void qc.invalidateQueries({ queryKey: ["task-detail", taskId] })
      void qc.invalidateQueries({ queryKey: ["operations"] })
    },
  })
}
