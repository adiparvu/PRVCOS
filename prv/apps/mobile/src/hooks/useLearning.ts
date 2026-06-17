import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type CourseStatus = "in_progress" | "completed" | "new" | "saved"
export type CourseCategory =
  | "safety"
  | "leadership"
  | "digital"
  | "finance"
  | "renovation"
  | "compliance"

export interface CourseItem {
  id: string
  title: string
  subtitle: string
  category: CourseCategory
  categoryLabel: string
  status: CourseStatus
  progress: number
  currentModule: number
  totalModules: number
  durationLabel: string
  hasCert: boolean
  isFeatured: boolean
  instructorName: string
  updatedDate: string
  rating: number
  reviewCount: number
}

export interface Achievement {
  id: string
  label: string
  detail: string
  date: string
  colorType: "amber" | "green"
}

export interface LearningMeta {
  completedCount: number
  inProgressCount: number
  monthlyHours: number
  avgScore: number
}

export interface LearningData {
  courses: CourseItem[]
  count: number
  meta: LearningMeta
  achievements: Achievement[]
  nextCursor: string | null
}

export interface CourseModuleItem {
  id: string
  index: number
  title: string
  durationLabel: string
  status: "done" | "active" | "locked"
}

export interface CourseDetailData {
  course: {
    id: string
    title: string
    subtitle: string
    category: CourseCategory
    categoryLabel: string
    status: CourseStatus
    progress: number
    currentModule: number
    totalModules: number
    durationLabel: string
    hasCert: boolean
    isFeatured: boolean
    instructorName: string
    updatedDate: string
    rating: number
    reviewCount: number
    modules: CourseModuleItem[]
  }
}

export function useLearning(params?: { status?: CourseStatus; category?: CourseCategory }) {
  const search = new URLSearchParams()
  if (params?.status) search.set("status", params.status)
  if (params?.category) search.set("category", params.category)
  const qs = search.toString()

  return useQuery<LearningData>({
    queryKey: ["learning", params],
    queryFn: () => api.get<LearningData>(`/api/mobile/learning${qs ? `?${qs}` : ""}`),
    staleTime: 60_000,
    retry: 2,
  })
}

export function useCourseDetail(courseId: string) {
  return useQuery<CourseDetailData>({
    queryKey: ["course-detail", courseId],
    queryFn: () => api.get<CourseDetailData>(`/api/mobile/learning/${courseId}`),
    staleTime: 30_000,
    retry: 2,
    enabled: !!courseId,
  })
}

export function useEnrollCourse(courseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post<{ courseId: string; status: CourseStatus }>(`/api/mobile/learning/${courseId}/enroll`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["learning"] })
      void qc.invalidateQueries({ queryKey: ["course-detail", courseId] })
    },
  })
}

export function useUpdateCourseProgress(courseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      progressPct,
      currentModule,
      status,
    }: {
      progressPct: number
      currentModule?: number
      status?: "in_progress" | "completed" | "saved"
    }) =>
      api.patch<{ courseId: string; progressPct: number }>(
        `/api/mobile/learning/${courseId}/enroll`,
        { progressPct, currentModule, status }
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["learning"] })
      void qc.invalidateQueries({ queryKey: ["course-detail", courseId] })
    },
  })
}
