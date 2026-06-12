import { baseTemplate, emailStyles } from "./base"

export interface PortalMagicLinkEmailProps {
  name: string
  magicUrl: string
  portalType: "client" | "supplier" | "subcontractor" | "employee"
  companyName: string
  expiresInMinutes?: number
  ipAddress?: string
}

const PORTAL_LABELS: Record<PortalMagicLinkEmailProps["portalType"], string> = {
  client: "Client Portal",
  supplier: "Supplier Portal",
  subcontractor: "Subcontractor Portal",
  employee: "Employee Portal",
}

export function portalMagicLinkEmail({
  name,
  magicUrl,
  portalType,
  companyName,
  expiresInMinutes = 15,
  ipAddress,
}: PortalMagicLinkEmailProps): { subject: string; html: string } {
  const portalLabel = PORTAL_LABELS[portalType]
  const subject = `Your ${companyName} portal access link`

  const html = baseTemplate(
    `
    <h1 style="${emailStyles.h1}">Sign in to ${portalLabel}</h1>
    <p style="${emailStyles.body}">
      Hi ${name}, here is your one-time sign-in link for the <strong style="color:#ffffff;">${companyName}</strong> ${portalLabel}.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${magicUrl}" style="${emailStyles.button}">Access Portal</a>
    </div>
    <p style="${emailStyles.muted};text-align:center;">
      This link expires in ${expiresInMinutes} minutes and can only be used once.
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
      If you did not request access to this portal, you can safely ignore this email.
    </p>
  `,
    `Your one-time sign-in link for ${companyName} ${portalLabel}`
  )

  return { subject, html }
}
