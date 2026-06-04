import { baseTemplate, emailStyles } from "./base"

export interface WelcomeEmailProps {
  firstName: string
  companyName: string
  role: string
  loginUrl: string
}

export function welcomeEmail({ firstName, companyName, role, loginUrl }: WelcomeEmailProps): {
  subject: string
  html: string
} {
  const subject = `Welcome to PRV — ${companyName}`

  const html = baseTemplate(
    `
    <h1 style="${emailStyles.h1}">Welcome, ${firstName}.</h1>
    <p style="${emailStyles.body}">
      Your account has been created for <strong style="color:#fff;">${companyName}</strong>.
      You have been assigned the role <strong style="color:#fff;">${role}</strong>.
    </p>
    <p style="${emailStyles.body}">
      PRV is your company operating system — everything you need to manage operations,
      attendance, projects, and more is available in one place.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${loginUrl}" style="${emailStyles.button}">Sign in to PRV</a>
    </div>
    <hr style="${emailStyles.divider}" />
    <p style="${emailStyles.muted}">
      If you did not expect this invitation, please ignore this email.
      This link expires in 72 hours.
    </p>
  `,
    `Welcome to PRV — ${companyName}`
  )

  return { subject, html }
}
