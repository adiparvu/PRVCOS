import { baseTemplate, emailStyles } from "./base"

export type LeaveDecision = "approved" | "rejected"
export type LeaveType = "annual" | "medical" | "unpaid" | "other"

export interface LeaveDecisionEmailProps {
  employeeName: string
  decision: LeaveDecision
  leaveType: LeaveType
  startDate: string
  endDate: string
  approverName: string
  notes?: string
  dashboardUrl?: string
}

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: "Annual Leave",
  medical: "Medical Leave",
  unpaid: "Unpaid Leave",
  other: "Leave",
}

export function leaveDecisionEmail({
  employeeName,
  decision,
  leaveType,
  startDate,
  endDate,
  approverName,
  notes,
  dashboardUrl,
}: LeaveDecisionEmailProps): { subject: string; html: string } {
  const typeLabel = LEAVE_TYPE_LABELS[leaveType] ?? "Leave"
  const isApproved = decision === "approved"

  const subject = isApproved
    ? `Your ${typeLabel} request has been approved`
    : `Your ${typeLabel} request has been declined`

  const decisionColor = isApproved ? "#30d158" : "#ff453a"
  const decisionLabel = isApproved ? "Approved" : "Declined"
  const decisionBg = isApproved ? "rgba(48,209,88,0.12)" : "rgba(255,69,58,0.12)"
  const decisionBorder = isApproved ? "rgba(48,209,88,0.30)" : "rgba(255,69,58,0.30)"

  const notesHtml = notes
    ? `<div style="margin-top:16px;padding:12px 16px;background:rgba(255,255,255,0.05);border-radius:8px;border-left:3px solid rgba(255,255,255,0.15);">
         <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.50);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Note from ${approverName}</p>
         <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.75);">${notes}</p>
       </div>`
    : ""

  const ctaHtml = dashboardUrl
    ? `<div style="text-align:center;margin:32px 0;">
         <a href="${dashboardUrl}" style="${emailStyles.button}">View in PRV</a>
       </div>`
    : ""

  const html = baseTemplate(
    `
    <h1 style="${emailStyles.h1}">Leave Request ${decisionLabel}</h1>

    <p style="${emailStyles.body}">Hi ${employeeName},</p>

    <p style="${emailStyles.body}">
      Your <strong style="color:#fff;">${typeLabel}</strong> request
      has been <strong style="color:${decisionColor};">${decisionLabel.toLowerCase()}</strong>
      by <strong style="color:#fff;">${approverName}</strong>.
    </p>

    <div style="margin:24px 0;padding:16px;background:${decisionBg};border:1px solid ${decisionBorder};border-radius:12px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,0.45);width:40%;">Type</td>
          <td style="padding:6px 0;font-size:14px;color:rgba(255,255,255,0.90);font-weight:500;">${typeLabel}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,0.45);">From</td>
          <td style="padding:6px 0;font-size:14px;color:rgba(255,255,255,0.90);font-weight:500;">${startDate}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,0.45);">To</td>
          <td style="padding:6px 0;font-size:14px;color:rgba(255,255,255,0.90);font-weight:500;">${endDate}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,0.45);">Decision</td>
          <td style="padding:6px 0;font-size:14px;color:${decisionColor};font-weight:600;">${decisionLabel}</td>
        </tr>
      </table>
    </div>

    ${notesHtml}
    ${ctaHtml}

    <hr style="${emailStyles.divider}" />
    <p style="${emailStyles.muted}">
      ${isApproved
        ? "Your leave has been registered. Contact HR if you need to make any changes."
        : "If you have questions about this decision, please contact your manager or HR."}
    </p>
  `,
    subject
  )

  return { subject, html }
}
