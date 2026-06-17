import { baseTemplate, emailStyles } from "./base"

export interface LearningCertificateEmailProps {
  employeeName: string
  courseTitle: string
  courseCategory: string
  completedDate: string
  instructorName?: string
  dashboardUrl?: string
}

export function learningCertificateEmail({
  employeeName,
  courseTitle,
  courseCategory,
  completedDate,
  instructorName,
  dashboardUrl,
}: LearningCertificateEmailProps): { subject: string; html: string } {
  const subject = `Certificate of Completion — ${courseTitle}`

  const ctaHtml = dashboardUrl
    ? `<div style="text-align:center;margin:32px 0;">
         <a href="${dashboardUrl}" style="${emailStyles.button}">View Certificate</a>
       </div>`
    : ""

  const instructorHtml = instructorName
    ? `<tr>
         <td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,0.45);width:40%;">Instructor</td>
         <td style="padding:6px 0;font-size:14px;color:rgba(255,255,255,0.90);font-weight:500;">${instructorName}</td>
       </tr>`
    : ""

  const html = baseTemplate(
    `
    <h1 style="${emailStyles.h1}">Course Completed</h1>

    <p style="${emailStyles.body}">Congratulations, ${employeeName}!</p>

    <p style="${emailStyles.body}">
      You have successfully completed
      <strong style="color:#fff;">${courseTitle}</strong>.
      Your certificate of completion is now available.
    </p>

    <div style="margin:24px 0;padding:16px;background:rgba(48,209,88,0.10);border:1px solid rgba(48,209,88,0.25);border-radius:12px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,0.45);width:40%;">Course</td>
          <td style="padding:6px 0;font-size:14px;color:rgba(255,255,255,0.90);font-weight:500;">${courseTitle}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,0.45);">Category</td>
          <td style="padding:6px 0;font-size:14px;color:rgba(255,255,255,0.90);font-weight:500;">${courseCategory}</td>
        </tr>
        ${instructorHtml}
        <tr>
          <td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,0.45);">Completed</td>
          <td style="padding:6px 0;font-size:14px;color:#30d158;font-weight:600;">${completedDate}</td>
        </tr>
      </table>
    </div>

    ${ctaHtml}

    <hr style="${emailStyles.divider}" />
    <p style="${emailStyles.muted}">
      Keep learning — your growth matters. Check PRV for more courses and achievements.
    </p>
  `,
    subject
  )

  return { subject, html }
}
