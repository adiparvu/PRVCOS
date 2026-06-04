import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // setAll called from a Server Component — ignored, middleware refreshes cookies
          }
        },
      },
    }
  )
}

// Admin client — uses service role key, only for server-side privileged operations
export async function createSupabaseAdminClient() {
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin operations")

  const cookieStore = await cookies()

  return createServerClient(process.env["NEXT_PUBLIC_SUPABASE_URL"]!, serviceKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // intentional
        }
      },
    },
  })
}
