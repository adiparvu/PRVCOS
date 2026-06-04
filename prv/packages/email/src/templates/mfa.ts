import { baseTemplate, emailStyles } from "./base"

export interface MfaCodeEmailProps {
  firstName: string
  code: string
  expiresInMinutes?: number
  ipAddress?: string
  userAgent?: string
}

export function mfaCodeEmail({
  firstName,
  code,
  expiresInMinutes = 10,
  ipAddress,
  userAgent,
}: MfaCodeEmailProps): { subject: string; html: string } {
  const subject = `Your PRV verification code: ${code}`

  const contextInfo =
    ipAddress || userAgent
      ? `
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;margin-top:24px;">
      <p style="margin:0 0 4px;font-size:12px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.05em;">Sign-in context</p>
      ${ipAddress ? `<p style="margin:4px 0;font-size:13px;color:rgba(255,255,255,0.50);">IP: ${ipAddress}</p>` : ""}
      ${userAgent ? `<p style="margin:4px 0;font-size:13px;color:rgba(255,255,255,0.50);">Device: ${userAgent}</p>` : ""}
    </div>
  `
      : ""

  const html = baseTemplate(
    `
    <h1 style="${emailStyles.h1}">Verification code</h1>
    <p style="${emailStyles.body}">
      Hi ${firstName}, use the code below to complete your sign-in.
    </p>

    <div style="text-align:center;margin:32px 0;">
      <div style="display:inline-block;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.16);border-radius:16px;padding:24px 48px;">
        <span style="font-size:40px;font-weight:700;letter-spacing:0.2em;color:#ffffff;font-variant-numeric:tabular-nums;">${code}</span>
      </div>
    </div>

    <p style="${emailStyles.muted};text-align:center;">
      This code expires in ${expiresInMinutes} minutes. Do not share it with anyone.
    </p>

    ${contextInfo}

    <hr style="${emailStyles.divider}" />
    <p style="${emailStyles.muted}">
      If you did not attempt to sign in, your account may be at risk.
      Contact support immediately.
    </p>
  `,
    `Your PRV verification code is ${code}`
  )

  return { subject, html }
}
