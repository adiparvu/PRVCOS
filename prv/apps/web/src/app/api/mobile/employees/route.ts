import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { withMobileAuth } from "@/lib/mobile/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { db } from "@prv/db"
import { users } from "@prv/db/schema"
import { eq, and } from "drizzle-orm"
import { writeAuditLog } from "@prv/auth"
import { sendEmail } from "@prv/email"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ROLE_TO_SCOPE: Record<string, string> = {
  worker: "SCOPE_TEAM",
  team_leader: "SCOPE_TEAM",
  oms: "SCOPE_DEPARTMENT",
  operations_manager: "SCOPE_DEPARTMENT",
  department_head: "SCOPE_DEPARTMENT",
  hr_payroll: "SCOPE_DEPARTMENT",
  project_worker: "SCOPE_TEAM",
  project_team_leader: "SCOPE_TEAM",
  project_oms: "SCOPE_DEPARTMENT",
  project_operations_manager: "SCOPE_DEPARTMENT",
  project_director: "SCOPE_COMPANY",
  store_manager: "SCOPE_STORE",
  shop_director: "SCOPE_COMPANY",
  seller: "SCOPE_STORE",
  data_analyst: "SCOPE_COMPANY",
  app_support_specialist: "SCOPE_COMPANY",
  qa_tester: "SCOPE_COMPANY",
}

const bodySchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(254),
  jobTitle: z.string().max(150).optional(),
  phone: z.string().max(32).optional(),
  role: z
    .enum([
      "worker",
      "team_leader",
      "oms",
      "operations_manager",
      "department_head",
      "hr_payroll",
      "project_worker",
      "project_team_leader",
      "project_oms",
      "project_operations_manager",
      "project_director",
      "store_manager",
      "shop_director",
      "seller",
      "data_analyst",
      "app_support_specialist",
      "qa_tester",
    ])
    .default("worker"),
})

function generateInviteToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  )
}

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { firstName, lastName, email, jobTitle, phone, role } = parsed.data
  const normalizedEmail = email.toLowerCase()

  // Verify no existing user with this email in the company
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, normalizedEmail), eq(users.companyId, ctx.companyId)))
    .limit(1)

  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists in this company.", code: "USER_EXISTS" },
      { status: 409 }
    )
  }

  const inviteToken = generateInviteToken()
  const admin = await createSupabaseAdminClient()

  // Create Supabase auth record with invite token stored in metadata
  const { data: newSupaUser, error: createError } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: false,
    user_metadata: {
      invite_token: inviteToken,
      company_id: ctx.companyId,
      first_name: firstName,
      last_name: lastName,
      invited_by: ctx.userId,
      invited_via: "mobile",
    },
  })

  if (createError) {
    if (createError.message?.includes("already been registered")) {
      // Supabase user exists but no PRV record — update invite token
      const { data: userList } = await admin.auth.admin.listUsers()
      const existingSupaUser = userList?.users?.find(
        (u: { email?: string }) => u.email?.toLowerCase() === normalizedEmail
      )
      if (existingSupaUser) {
        await admin.auth.admin.updateUserById(existingSupaUser.id, {
          user_metadata: {
            ...existingSupaUser.user_metadata,
            invite_token: inviteToken,
            company_id: ctx.companyId,
          },
        })
      } else {
        return NextResponse.json({ error: "Failed to create invitation." }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: "Failed to create invitation." }, { status: 500 })
    }
  }

  // Pre-provision the PRV user record so it appears in the people list immediately
  const scopeLevel = (ROLE_TO_SCOPE[role] ?? "SCOPE_TEAM") as
    | "SCOPE_TEAM"
    | "SCOPE_DEPARTMENT"
    | "SCOPE_STORE"
    | "SCOPE_COMPANY"

  const supabaseId = newSupaUser?.user?.id
  if (supabaseId) {
    await db
      .insert(users)
      .values({
        supabaseId,
        companyId: ctx.companyId,
        email: normalizedEmail,
        firstName,
        lastName,
        jobTitle: jobTitle ?? null,
        phone: phone ?? null,
        role,
        scopeLevel,
        status: "onboarding",
        isActive: false,
        locale: "ro-RO",
        timezone: "Europe/Bucharest",
      })
      .onConflictDoNothing()
  }

  // Send invite email (non-blocking)
  const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000"
  const signupUrl = `${appUrl}/auth/signup?email=${encodeURIComponent(normalizedEmail)}&token=${inviteToken}&company=${ctx.companyId}`

  void sendEmail({
    to: normalizedEmail,
    subject: "You've been invited to PRV",
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#000;color:#fff;padding:40px;max-width:480px;margin:0 auto">
  <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:32px">
    <h1 style="font-size:24px;font-weight:600;margin:0 0 8px">Welcome to PRV</h1>
    <p style="color:rgba(255,255,255,0.6);margin:0 0 24px;font-size:15px">
      ${firstName}, you've been invited to join your company's workspace.
    </p>
    <a href="${signupUrl}"
       style="display:inline-block;background:#fff;color:#000;font-weight:600;font-size:15px;padding:12px 24px;border-radius:12px;text-decoration:none">
      Accept invitation
    </a>
    <p style="color:rgba(255,255,255,0.3);margin:24px 0 0;font-size:12px">
      This invitation expires in 7 days. If you didn't expect this, you can safely ignore this email.
    </p>
  </div>
</body>
</html>`,
  }).catch(() => {
    // Non-blocking — admin can resend manually
  })

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.employee.invite",
    entityType: "user_invitation",
    entityId: supabaseId ?? normalizedEmail,
    payload: { email: normalizedEmail, firstName, lastName, role },
    method: "POST",
    path: "/api/mobile/employees",
    ipAddress: getIp(req),
    userAgent: req.headers.get("user-agent") ?? "",
  })

  return NextResponse.json(
    { success: true, message: `Invitation sent to ${normalizedEmail}` },
    { status: 201 }
  )
})
