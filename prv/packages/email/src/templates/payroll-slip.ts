import { baseTemplate, emailStyles } from "./base"

export interface PayrollSlipEmailProps {
  recipientName: string
  payrollRef: string
  periodStart: string
  periodEnd: string
  employeeCount: number
  totalGross: string
  netPaid: string
  currency?: string
  dashboardUrl?: string
}

export function payrollSlipEmail({
  recipientName,
  payrollRef,
  periodStart,
  periodEnd,
  employeeCount,
  totalGross,
  netPaid,
  currency = "RON",
  dashboardUrl,
}: PayrollSlipEmailProps): { subject: string; html: string } {
  const subject = `Payroll Run Completed — ${payrollRef}`

  const ctaHtml = dashboardUrl
    ? `<div style="text-align:center;margin:32px 0;">
         <a href="${dashboardUrl}" style="${emailStyles.button}">View Payroll Run</a>
       </div>`
    : ""

  const html = baseTemplate(
    `
    <h1 style="${emailStyles.h1}">Payroll Completed</h1>

    <p style="${emailStyles.body}">Hi ${recipientName},</p>

    <p style="${emailStyles.body}">
      Payroll run <strong style="color:#fff;">${payrollRef}</strong> has been
      processed successfully for the period
      <strong style="color:#fff;">${periodStart} – ${periodEnd}</strong>.
    </p>

    <div style="margin:24px 0;padding:16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:12px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.45);width:50%;">Reference</td>
          <td style="padding:8px 0;font-size:14px;color:rgba(255,255,255,0.90);font-weight:500;">${payrollRef}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.45);border-top:1px solid rgba(255,255,255,0.08);">Period</td>
          <td style="padding:8px 0;font-size:14px;color:rgba(255,255,255,0.90);font-weight:500;border-top:1px solid rgba(255,255,255,0.08);">${periodStart} – ${periodEnd}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.45);border-top:1px solid rgba(255,255,255,0.08);">Employees</td>
          <td style="padding:8px 0;font-size:14px;color:rgba(255,255,255,0.90);font-weight:500;border-top:1px solid rgba(255,255,255,0.08);">${employeeCount}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.45);border-top:1px solid rgba(255,255,255,0.08);">Total Gross</td>
          <td style="padding:8px 0;font-size:14px;color:rgba(255,255,255,0.90);font-weight:600;border-top:1px solid rgba(255,255,255,0.08);">${totalGross} ${currency}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.45);border-top:1px solid rgba(255,255,255,0.08);">Net Paid</td>
          <td style="padding:8px 0;font-size:15px;color:#fff;font-weight:700;border-top:1px solid rgba(255,255,255,0.08);">${netPaid} ${currency}</td>
        </tr>
      </table>
    </div>

    ${ctaHtml}

    <hr style="${emailStyles.divider}" />
    <p style="${emailStyles.muted}">
      This is an automated payroll summary. Please review and archive for your records.
    </p>
  `,
    subject
  )

  return { subject, html }
}
