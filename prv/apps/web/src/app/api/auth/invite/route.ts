import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { RoleSets, writeAuditLog } from "@prv/auth"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { users } from "@prv/db/schema"
import { eq, and } from "drizzle-orm"
import { z } from "zod"
import { sendEmail } from "@prv/email"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const inviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.string().min(1).optional(),
})

function generateInviteToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// POST /api/auth/invite — Admin creates an invitation for a new user.
// Creates a Supabase user with an invite token in metadata.
// The token is required to complete signup at /api/auth/signup.
export const POST = withGates(
  {
    action: "users.invite",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
    requiredScope: "SCOPE_COMPANY",
    requireReauth: true,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = inviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { email, firstName, lastName } = parsed.data

    // Check: user with this email must not already exist in this company
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email.toLowerCase()), eq(users.companyId, ctx.session.companyId)))
      .limit(1)

    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists in this company.", code: "USER_EXISTS" },
        { status: 409 }
      )
    }

    const inviteToken = generateInviteToken()
    const admin = await createSupabaseAdminClient()

    // Create or update Supabase user with invite token
    const { data: newSupaUser, error: createError } = await admin.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: false,
      user_metadata: {
        invite_token: inviteToken,
        company_id: ctx.session.companyId,
        first_name: firstName,
        last_name: lastName,
        invited_by: ctx.session.userId,
      },
    })

    if (createError) {
      if (createError.message?.includes("already been registered")) {
        // User exists in Supabase but not in PRV DB — update their invite token
        const { data: userList } = await admin.auth.admin.listUsers()
        const existingSupaUser = userList?.users?.find(
          (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
        )
        if (existingSupaUser) {
          await admin.auth.admin.updateUserById(existingSupaUser.id, {
            user_metadata: {
              ...existingSupaUser.user_metadata,
              invite_token: inviteToken,
              company_id: ctx.session.companyId,
            },
          })
        } else {
          return NextResponse.json(
            { error: "Failed to create invitation.", code: "INVITE_FAILED" },
            { status: 500 }
          )
        }
      } else {
        return NextResponse.json(
          { error: "Failed to create invitation.", code: "INVITE_FAILED" },
          { status: 500 }
        )
      }
    }

    const supabaseUserId = newSupaUser?.user?.id

    // Send invitation email
    const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000"
    const signupUrl = `${appUrl}/auth/signup?email=${encodeURIComponent(email)}&token=${inviteToken}&company=${ctx.session.companyId}`

    try {
      await sendEmail({
        to: email,
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
      })
    } catch {
      // Email failure is non-blocking — admin can resend manually
    }

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "users.invite",
      entityType: "user_invitation",
      entityId: supabaseUserId ?? email,
      payload: { email, firstName, lastName },
      method: "POST",
      path: "/api/auth/invite",
      ipAddress:
        req.headers.get("x-real-ip") ??
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "unknown",
      userAgent: req.headers.get("user-agent") ?? "",
    })

    return NextResponse.json(
      {
        success: true,
        message: `Invitation sent to ${email}`,
        inviteToken: process.env["NODE_ENV"] === "development" ? inviteToken : undefined,
      },
      { status: 201 }
    )
  }
)
