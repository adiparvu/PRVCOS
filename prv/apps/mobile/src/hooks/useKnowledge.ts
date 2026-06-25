import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type ArticleType = "sop" | "policy" | "guide" | "faq"
export type ArticleCategory = "operations" | "hr" | "finance" | "procurement" | "fleet" | "projects"

export interface KnowledgeArticle {
  id: string
  title: string
  type: ArticleType
  typeLabel: string
  category: ArticleCategory
  categoryLabel: string
  author: string
  updatedDate: string
  readMinutes: number
  views: number
  version: string | null
  isPinned: boolean
  readProgress: number
}

export interface KnowledgeMeta {
  total: number
  sopCount: number
  recentlyUpdated: number
}

export interface KnowledgeData {
  meta: KnowledgeMeta
  articles: KnowledgeArticle[]
}

export interface KnowledgeArticleDetail extends KnowledgeArticle {
  content: string | null
  relatedArticles: Array<{
    id: string
    title: string
    typeLabel: string
    categoryLabel: string
    readMinutes: number
  }>
}

export function useKnowledge(params?: { type?: ArticleType; category?: ArticleCategory }) {
  const search = new URLSearchParams()
  if (params?.type) search.set("type", params.type)
  if (params?.category) search.set("category", params.category)
  const qs = search.toString()

  return useQuery<KnowledgeData>({
    queryKey: ["knowledge", params],
    queryFn: () => api.get<KnowledgeData>(`/api/mobile/knowledge${qs ? `?${qs}` : ""}`),
    staleTime: 120_000,
    retry: 2,
  })
}

export function useKnowledgeArticle(articleId: string) {
  return useQuery<KnowledgeArticleDetail>({
    queryKey: ["knowledge-article", articleId],
    queryFn: () => api.get<KnowledgeArticleDetail>(`/api/mobile/knowledge/${articleId}`),
    staleTime: 60_000,
    retry: 2,
    enabled: !!articleId,
  })
}
