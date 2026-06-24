import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChannelType = "public" | "private" | "announcement"
export type MessageType = "text" | "file" | "image" | "system"
export type AnnouncementAudience = "all" | "managers" | "employees" | "department" | "team"

export interface Channel {
  id: string
  name: string
  description: string | null
  type: ChannelType
  isArchived: boolean
  lastMessageAt: string | null
  lastMessagePreview: string | null
  createdAt: string
}

export interface MessageAuthor {
  authorId: string | null
  authorFirstName: string | null
  authorLastName: string | null
  authorAvatarUrl: string | null
  authorJobTitle: string | null
}

export interface ChannelMessage extends MessageAuthor {
  id: string
  content: string
  type: MessageType
  parentId: string | null
  threadCount: number
  reactions: Record<string, number>
  metadata: Record<string, unknown>
  mentionedUserIds: string[]
  editedAt: string | null
  createdAt: string
}

export interface DmParticipant {
  userId: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  jobTitle: string | null
}

export interface DmConversation {
  id: string
  lastMessageAt: string | null
  lastMessagePreview: string | null
  createdAt: string
  participants: DmParticipant[]
}

export interface DmMessage extends MessageAuthor {
  id: string
  content: string
  type: MessageType
  metadata: Record<string, unknown>
  editedAt: string | null
  createdAt: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  audience: AnnouncementAudience
  audienceTargetId: string | null
  isPinned: boolean
  sendEmail: boolean
  publishedAt: string | null
  scheduledAt: string | null
  readCount: number
  totalAudience: number
  createdAt: string
  updatedAt: string
  authorId: string | null
  authorFirstName: string | null
  authorLastName: string | null
  authorAvatarUrl: string | null
  isRead: boolean
}

// ─── Channels ─────────────────────────────────────────────────────────────────

export function useChannels(type?: ChannelType) {
  return useQuery<{ channels: Channel[] }>({
    queryKey: ["communications", "channels", type ?? "all"],
    queryFn: () =>
      api.get<{ channels: Channel[] }>(
        `/api/mobile/communications/channels${type ? `?type=${type}` : ""}`
      ),
    staleTime: 30_000,
  })
}

export function useChannelMessages(channelId: string) {
  return useInfiniteQuery<{
    messages: ChannelMessage[]
    hasMore: boolean
    nextCursor: string | null
  }>({
    queryKey: ["communications", "channels", channelId, "messages"],
    queryFn: ({ pageParam }) =>
      api.get(
        `/api/mobile/communications/channels/${channelId}/messages${pageParam ? `?cursor=${pageParam}` : ""}`
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 10_000,
  })
}

export function useCreateChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name: string
      description?: string
      type?: ChannelType
      memberIds?: string[]
    }) => api.post("/api/mobile/communications/channels", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["communications", "channels"] })
    },
  })
}

export function useSendChannelMessage(channelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      content: string
      type?: MessageType
      parentId?: string
      mentionedUserIds?: string[]
      metadata?: Record<string, unknown>
    }) => api.post(`/api/mobile/communications/channels/${channelId}/messages`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["communications", "channels", channelId, "messages"] })
      qc.invalidateQueries({ queryKey: ["communications", "channels"] })
    },
  })
}

// ─── DMs ──────────────────────────────────────────────────────────────────────

export function useDmConversations() {
  return useQuery<{ conversations: DmConversation[] }>({
    queryKey: ["communications", "dms"],
    queryFn: () => api.get("/api/mobile/communications/dms"),
    staleTime: 20_000,
  })
}

export function useDmMessages(conversationId: string) {
  return useInfiniteQuery<{ messages: DmMessage[]; hasMore: boolean; nextCursor: string | null }>({
    queryKey: ["communications", "dms", conversationId, "messages"],
    queryFn: ({ pageParam }) =>
      api.get(
        `/api/mobile/communications/dms/${conversationId}/messages${pageParam ? `?cursor=${pageParam}` : ""}`
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 10_000,
  })
}

export function useStartDm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (participantIds: string[]) =>
      api.post<{ conversation: DmConversation; existing: boolean }>(
        "/api/mobile/communications/dms",
        {
          participantIds,
        }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["communications", "dms"] })
    },
  })
}

export function useSendDmMessage(conversationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      content: string
      type?: MessageType
      metadata?: Record<string, unknown>
    }) => api.post(`/api/mobile/communications/dms/${conversationId}/messages`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["communications", "dms", conversationId, "messages"] })
      qc.invalidateQueries({ queryKey: ["communications", "dms"] })
    },
  })
}

// ─── Announcements ────────────────────────────────────────────────────────────

export function useAnnouncements(pinned?: boolean) {
  return useQuery<{ announcements: Announcement[] }>({
    queryKey: ["communications", "announcements", pinned ?? "all"],
    queryFn: () =>
      api.get(`/api/mobile/communications/announcements${pinned ? "?pinned=true" : ""}`),
    staleTime: 60_000,
  })
}

export function useAnnouncement(id: string) {
  return useQuery<{ announcement: Announcement & { readAt: string | null } }>({
    queryKey: ["communications", "announcements", id],
    queryFn: () => api.get(`/api/mobile/communications/announcements/${id}`),
    staleTime: 60_000,
    enabled: !!id,
  })
}

export function useCreateAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      title: string
      body: string
      audience?: AnnouncementAudience
      audienceTargetId?: string
      isPinned?: boolean
      sendEmail?: boolean
      publishedAt?: string
      scheduledAt?: string
    }) => api.post("/api/mobile/communications/announcements", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["communications", "announcements"] })
    },
  })
}

export function useMarkAnnouncementRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (announcementId: string) =>
      api.post(`/api/mobile/communications/announcements/${announcementId}/read`, {}),
    onSuccess: (_data, announcementId) => {
      qc.invalidateQueries({ queryKey: ["communications", "announcements"] })
      qc.invalidateQueries({ queryKey: ["communications", "announcements", announcementId] })
    },
  })
}

export function useUpdateAnnouncement(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      data: Partial<{
        title: string
        body: string
        audience: AnnouncementAudience
        audienceTargetId: string | null
        isPinned: boolean
        sendEmail: boolean
        publishedAt: string | null
        scheduledAt: string | null
      }>
    ) => api.patch(`/api/mobile/communications/announcements/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["communications", "announcements"] })
      qc.invalidateQueries({ queryKey: ["communications", "announcements", id] })
    },
  })
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (announcementId: string) =>
      api.delete(`/api/mobile/communications/announcements/${announcementId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["communications", "announcements"] })
    },
  })
}
