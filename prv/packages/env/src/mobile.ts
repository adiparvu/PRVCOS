import { z } from "zod"

// Mobile env — loaded via Expo Constants / app.config.ts
export const mobileEnvSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  EXPO_PUBLIC_API_URL: z.string().url().default("http://localhost:3000"),
})

export type MobileEnv = z.infer<typeof mobileEnvSchema>
