import { baseTemplate, emailStyles } from "./base"

export interface PasswordResetEmailProps {
  firstName: string
  resetUrl: string
  expiresInMinutes?: number
  ipAddress?: string
}

export function passwordResetEmail({
  firstName,
  resetUrl,
  expiresInMinutes = 30,
  ipAddress,
}: PasswordResetEmailProps): { subject: string; html: string } {
  const subject = "Reset your PRV password"

  const html = baseTemplate(
    `
    <h1 style="${emailStyles.h1}">Reset your password</h1>
    <p style="${emailStyles.body}">
      Hi ${firstName}, we received a request to reset the password for your PRV account.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}" style="${emailStyles.button}">Reset password</a>
    </div>
    <p style="${emailStyles.muted};text-align:center;">
      This link expires in ${expiresInMinutes} minutes.
    </p>
    ${
      ipAddress
        ? `
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;margin-top:24px;">
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.50);">
        Request originated from IP: ${ipAddress}
      </p>
    </div>`
        : ""
    }
    <hr style="${emailStyles.divider}" />
    <p style="${emailStyles.muted}">
      If you did not request a password reset, your account may be at risk.
      Contact support immediately.
    </p>
  `,
    "Reset your PRV account password"
  )

  return { subject, html }
}
