import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export interface ProjectItem {
  id: string
  name: string
  clientName: string | null
  status: string
  value: string | null
  dueDate: string | null
  progress: number
}

export interface OrderItem {
  id: string
  orderNumber: string
  status: string
  amount: string
  createdAt: string
}

export interface TaskItem {
  id: string
  title: string
  projectName: string
  dueDate: string | null
  isComplete: boolean
  isOverdue: boolean
  completedAt: string | null
}

export interface OperationsData {
  projectsKpi: {
    active: number
    onHold: number
    avgProgress: number
    pipeline: string
  }
  projects: ProjectItem[]
  ordersKpi: {
    thisWeek: number
    pending: number
    revenue: string
    refunded: number
  }
  orders: OrderItem[]
  tasksKpi: {
    open: number
    overdue: number
    doneToday: number
  }
  tasks: TaskItem[]
}

export function useOperations() {
  return useQuery<OperationsData>({
    queryKey: ["operations"],
    queryFn: () => api.get<OperationsData>("/api/mobile/operations"),
    staleTime: 30_000,
    retry: 2,
  })
}
