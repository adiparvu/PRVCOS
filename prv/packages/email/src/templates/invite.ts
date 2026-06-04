import { baseTemplate, emailStyles } from "./base"

export interface TeamInviteEmailProps {
  inviteeName: string
  inviterName: string
  companyName: string
  role: string
  inviteUrl: string
  expiresInHours?: number
}

export function teamInviteEmail({
  inviteeName,
  inviterName,
  companyName,
  role,
  inviteUrl,
  expiresInHours = 72,
}: TeamInviteEmailProps): { subject: string; html: string } {
  const subject = `${inviterName} invited you to join ${companyName} on PRV`

  const html = baseTemplate(
    `
    <h1 style="${emailStyles.h1}">You've been invited.</h1>
    <p style="${emailStyles.body}">
      <strong style="color:#fff;">${inviterName}</strong> has invited you to join
      <strong style="color:#fff;">${companyName}</strong> on PRV as a
      <strong style="color:#fff;">${role}</strong>.
    </p>
    <p style="${emailStyles.body}">
      PRV is a Company Operating System — your single place for operations,
      attendance, projects, and more.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${inviteUrl}" style="${emailStyles.button}">Accept invitation</a>
    </div>
    <hr style="${emailStyles.divider}" />
    <p style="${emailStyles.muted}">
      This invitation was sent to ${inviteeName} and expires in ${expiresInHours} hours.
      If you did not expect this, you can safely ignore this email.
    </p>
  `,
    `You've been invited to join ${companyName} on PRV`
  )

  return { subject, html }
}
