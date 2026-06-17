import { baseTemplate, emailStyles } from "./base"

export interface QuoteSentEmailProps {
  recipientName: string
  clientName: string
  estimateNumber: string
  projectTitle: string
  totalAmount: string
  currency?: string
  validUntil: string
  dashboardUrl?: string
}

export function quoteSentEmail({
  recipientName,
  clientName,
  estimateNumber,
  projectTitle,
  totalAmount,
  currency = "RON",
  validUntil,
  dashboardUrl,
}: QuoteSentEmailProps): { subject: string; html: string } {
  const subject = `Quote Sent to Client — ${estimateNumber}`

  const ctaHtml = dashboardUrl
    ? `<div style="text-align:center;margin:32px 0;">
         <a href="${dashboardUrl}" style="${emailStyles.button}">View Quote</a>
       </div>`
    : ""

  const html = baseTemplate(
    `
    <h1 style="${emailStyles.h1}">Quote Sent</h1>

    <p style="${emailStyles.body}">Hi ${recipientName},</p>

    <p style="${emailStyles.body}">
      Estimate <strong style="color:#fff;">${estimateNumber}</strong> for project
      <strong style="color:#fff;">${projectTitle}</strong> has been sent to
      <strong style="color:#fff;">${clientName}</strong>.
    </p>

    <div style="margin:24px 0;padding:16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:12px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.45);width:45%;">Estimate No.</td>
          <td style="padding:8px 0;font-size:14px;color:rgba(255,255,255,0.90);font-weight:500;">${estimateNumber}</td>
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
          <td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.45);border-top:1px solid rgba(255,255,255,0.08);">Total Amount</td>
          <td style="padding:8px 0;font-size:15px;color:#fff;font-weight:700;border-top:1px solid rgba(255,255,255,0.08);">${totalAmount} ${currency}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.45);border-top:1px solid rgba(255,255,255,0.08);">Valid Until</td>
          <td style="padding:8px 0;font-size:14px;color:rgba(255,255,255,0.90);font-weight:500;border-top:1px solid rgba(255,255,255,0.08);">${validUntil}</td>
        </tr>
      </table>
    </div>

    ${ctaHtml}

    <hr style="${emailStyles.divider}" />
    <p style="${emailStyles.muted}">
      Monitor the quote status in PRV. You will be notified when the client views or responds.
    </p>
  `,
    subject
  )

  return { subject, html }
}
