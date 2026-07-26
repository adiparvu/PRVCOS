import { createClient } from "@supabase/supabase-js"
import postgres from "postgres"

// Provision a LOGIN-ABLE account.
//
// Seeding (and normal onboarding) writes rows into the application `users`
// table, but sign-in goes through Supabase Auth (`auth.users`). A row in one
// without a matching account in the other cannot log in — which is why a freshly
// provisioned database has no usable credentials at all.
//
// This script closes that gap: it creates (or reuses) the Supabase Auth account
// and links it to the application row via users.supabase_id.
//
// Usage:
//   pnpm --filter @prv/db db:provision:user <email> <password> [--create-app-row]
//
// Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DATABASE_DIRECT_URL.
// Intended for bootstrapping the first admin and for the demo account Apple
// review requires — never ship a shared password to real users.

interface Args {
  email: string
  password: string
  createAppRow: boolean
}

function parseArgs(argv: string[]): Args {
  const positional = argv.filter((a) => !a.startsWith("--"))
  const [email, password] = positional
  if (!email || !password) {
    throw new Error(
      "Usage: db:provision:user <email> <password> [--create-app-row]\n" +
        "  --create-app-row  also insert an application users row if none exists"
    )
  }
  if (password.length < 12) {
    throw new Error("Refusing a password shorter than 12 characters.")
  }
  return { email, password, createAppRow: argv.includes("--create-app-row") }
}

export async function provisionAuthUser(args: Args): Promise<void> {
  const supabaseUrl = process.env["SUPABASE_URL"]
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]
  const directUrl = process.env["DATABASE_DIRECT_URL"]

  if (!supabaseUrl) throw new Error("SUPABASE_URL is required")
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required")
  if (!directUrl) throw new Error("DATABASE_DIRECT_URL is required")

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const sql = postgres(directUrl, { max: 1 })

  try {
    const [appUser] = await sql<{ id: string; company_id: string; supabase_id: string | null }[]>`
      SELECT id, company_id, supabase_id FROM users WHERE email = ${args.email} LIMIT 1
    `

    if (!appUser && !args.createAppRow) {
      throw new Error(
        `No application user with email ${args.email}. ` +
          `Seed one first, or pass --create-app-row to attach this login to a new row.`
      )
    }

    // Create the auth account. If it already exists, reuse it rather than failing
    // so the script is safe to re-run.
    let authUserId: string
    const created = await admin.auth.admin.createUser({
      email: args.email,
      password: args.password,
      email_confirm: true,
    })

    if (created.error) {
      const existing = await admin.auth.admin.listUsers()
      if (existing.error)
        throw new Error(`Could not create or look up auth user: ${created.error.message}`)
      const match = existing.data.users.find((u) => u.email === args.email)
      if (!match) throw new Error(`Auth user creation failed: ${created.error.message}`)
      // Reset the password so the documented credentials always work.
      const updated = await admin.auth.admin.updateUserById(match.id, { password: args.password })
      if (updated.error) throw new Error(`Could not reset password: ${updated.error.message}`)
      authUserId = match.id
      console.log(`  ↻ Reused existing auth account for ${args.email}`)
    } else {
      authUserId = created.data.user.id
      console.log(`  ✓ Created auth account for ${args.email}`)
    }

    if (appUser) {
      await sql`UPDATE users SET supabase_id = ${authUserId} WHERE id = ${appUser.id}`
      console.log(`  ✓ Linked auth account to application user ${appUser.id}`)
    } else {
      const [company] = await sql<
        { id: string }[]
      >`SELECT id FROM companies ORDER BY created_at LIMIT 1`
      if (!company)
        throw new Error("No company exists — seed a company before provisioning a user.")
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO users (company_id, supabase_id, email, first_name, last_name, role, is_active)
        VALUES (${company.id}, ${authUserId}, ${args.email}, 'PRV', 'Admin', 'system_administrator', true)
        RETURNING id
      `
      console.log(`  ✓ Created application user ${row?.id} in company ${company.id}`)
    }

    console.log(`✓ ${args.email} can now sign in.`)
  } finally {
    await sql.end()
  }
}

const isMain =
  process.argv[1]?.endsWith("provision-auth-user.ts") ||
  process.argv[1]?.endsWith("provision-auth-user.js")

if (isMain) {
  Promise.resolve()
    .then(() => provisionAuthUser(parseArgs(process.argv.slice(2))))
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Provisioning failed:", err instanceof Error ? err.message : err)
      process.exit(1)
    })
}
