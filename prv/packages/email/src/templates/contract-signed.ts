import { baseTemplate, emailStyles } from "./base"

export interface ContractSignedEmailProps {
  recipientName: string
  clientName: string
  contractNumber: string
  projectTitle: string
  contractValue: string
  currency?: string
  signedDate: string
  dashboardUrl?: string
}

export function contractSignedEmail({
  recipientName,
  clientName,
  contractNumber,
  projectTitle,
  contractValue,
  currency = "RON",
  signedDate,
  dashboardUrl,
}: ContractSignedEmailProps): { subject: string; html: string } {
  const subject = `Contract Signed — ${contractNumber}`

  const ctaHtml = dashboardUrl
    ? `<div style="text-align:center;margin:32px 0;">
         <a href="${dashboardUrl}" style="${emailStyles.button}">View Contract</a>
       </div>`
    : ""

  const html = baseTemplate(
    `
    <h1 style="${emailStyles.h1}">Contract Signed</h1>

    <p style="${emailStyles.body}">Hi ${recipientName},</p>

    <p style="${emailStyles.body}">
      Contract <strong style="color:#fff;">${contractNumber}</strong> for project
      <strong style="color:#fff;">${projectTitle}</strong> has been signed by
      <strong style="color:#fff;">${clientName}</strong>.
    </p>

    <div style="margin:24px 0;padding:16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:12px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.45);width:45%;">Contract No.</td>
          <td style="padding:8px 0;font-size:14px;color:rgba(255,255,255,0.90);font-weight:500;">${contractNumber}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.45);border-top:1px solid rgba(255,255,255,0.08);">Project</td>
          <td style="padding:8px 0;font-size:14px;color:rgba(255,255,255,0.90);font-weight:500;border-top:1px solid rgba(255,255,255,0.08);">${projectTitle}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.45);border-top:1px solid rgba(255,255,255,0.08);">Client</td>
          <td style="padding:8px 0;font-size:14px;color:rgba(255,255,255,0.90);font-weight:500;border-top:1px solid rgba(255,255,255,0.08);">${clientName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.45);border-top:1px solid rgba(255,255,255,0.08);">Contract Value</td>
          <td style="padding:8px 0;font-size:15px;color:#fff;font-weight:700;border-top:1px solid rgba(255,255,255,0.08);">${contractValue} ${currency}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.45);border-top:1px solid rgba(255,255,255,0.08);">Signed</td>
          <td style="padding:8px 0;font-size:14px;color:rgba(255,255,255,0.90);font-weight:500;border-top:1px solid rgba(255,255,255,0.08);">${signedDate}</td>
        </tr>
      </table>
    </div>

    ${ctaHtml}

    <hr style="${emailStyles.divider}" />
    <p style="${emailStyles.muted}">
      The project can now move to the active phase. Ensure all onboarding steps are completed.
    </p>
  `,
    subject
  )

  return { subject, html }
}
