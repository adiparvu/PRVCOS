import { z } from "zod"

export const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, "Phone must be in E.164 format (+XXXXXXXXXXX)")

export const emailSchema = z.string().email().max(254).toLowerCase()

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128)
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")

export const isoDateTimeSchema = z.string().datetime({ offset: true })

export const nonEmptyString = z.string().min(1).max(1000)

export const shortTextSchema = z.string().min(1).max(255)

export const longTextSchema = z.string().min(1).max(10_000)

export const currencyAmountSchema = z.number().nonnegative().multipleOf(0.01).max(999_999_999.99)

export const percentSchema = z.number().min(0).max(100)

export const localeSchema = z.enum(["ro-RO", "en-US", "en-GB"])

export const timezoneSchema = z
  .string()
  .min(1)
  .refine(
    (tz) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz })
        return true
      } catch {
        return false
      }
    },
    { message: "Invalid IANA timezone identifier" }
  )
