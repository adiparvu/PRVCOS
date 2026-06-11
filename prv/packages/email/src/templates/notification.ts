import { baseTemplate, emailStyles } from "./base"

export interface NotificationEmailProps {
  title: string
  body?: string
  actionUrl?: string
  actionLabel?: string
  firstName?: string
}

export function notificationEmail({
  title,
  body,
  actionUrl,
  actionLabel,
  firstName,
}: NotificationEmailProps): { subject: string; html: string } {
  const subject = title

  const greeting = firstName ? `<p style="${emailStyles.body}">Hi ${firstName},</p>` : ""

  const bodyHtml = body ? `<p style="${emailStyles.body}">${body}</p>` : ""

  const ctaHtml =
    actionUrl && actionLabel
      ? `<div style="text-align:center;margin:32px 0;">
           <a href="${actionUrl}" style="${emailStyles.button}">${actionLabel}</a>
         </div>`
      : ""

  const html = baseTemplate(
    `
    ${greeting}
    <h1 style="${emailStyles.h1}">${title}</h1>
    ${bodyHtml}
    ${ctaHtml}
    <hr style="${emailStyles.divider}" />
    <p style="${emailStyles.muted}">
      You received this notification because you have email notifications enabled in PRV.
    </p>
  `,
    title
  )

  return { subject, html }
}
