import { z } from "zod"

// UUID v4 — matches Supabase / PostgreSQL gen_random_uuid()
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const uuidSchema = z.string().regex(UUID_RE, "Must be a valid UUID v4")

export const companyIdSchema = uuidSchema.brand<"CompanyId">()
export const userIdSchema = uuidSchema.brand<"UserId">()
export const approvalIdSchema = uuidSchema.brand<"ApprovalId">()
export const auditIdSchema = uuidSchema.brand<"AuditId">()
export const notificationIdSchema = uuidSchema.brand<"NotificationId">()
export const sessionIdSchema = uuidSchema.brand<"SessionId">()
export const deviceIdSchema = uuidSchema.brand<"DeviceId">()

export type CompanyId = z.infer<typeof companyIdSchema>
export type UserId = z.infer<typeof userIdSchema>
export type ApprovalId = z.infer<typeof approvalIdSchema>
export type AuditId = z.infer<typeof auditIdSchema>
export type NotificationId = z.infer<typeof notificationIdSchema>
export type SessionId = z.infer<typeof sessionIdSchema>
export type DeviceId = z.infer<typeof deviceIdSchema>
