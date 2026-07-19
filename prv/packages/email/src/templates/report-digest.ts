import { baseTemplate, emailStyles } from "./base"

export interface ReportDigestKpis {
  revenueMonth: string
  grossProfit: string
  activeProjects: number
  taskCompletionPct: number
  headcount: number
  presentToday: number
  activeClients: number
  pipelineValue: string
  shopOrders: number
  healthScore: number
}

export interface ReportDigestEmailProps {
  companyName: string
  scheduleName: string
  frequencyLabel: string
  periodLabel: string // e.g. "10 Mar 2026"
  kpis: ReportDigestKpis
  dashboardUrl?: string
}

function money(v: string): string {
  const n = Number(v)
  if (!isFinite(n)) return v
  return `${Math.round(n).toLocaleString("en-US")} RON`
}

function tile(label: string, value: string): string {
  return `<td width="50%" style="padding:6px;">
    <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:12px;padding:14px 16px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.40);font-weight:600;">${label}</div>
      <div style="font-size:22px;font-weight:700;color:#ffffff;margin-top:6px;letter-spacing:-0.02em;">${value}</div>
    </div>
  </td>`
}

export function reportDigestEmail({
  companyName,
  scheduleName,
  frequencyLabel,
  periodLabel,
  kpis,
  dashboardUrl,
}: ReportDigestEmailProps): { subject: string; html: string } {
  const subject = `${scheduleName} — ${companyName} (${periodLabel})`

  const rows = [
    [tile("Venit lună", money(kpis.revenueMonth)), tile("Profit brut", money(kpis.grossProfit))],
    [
      tile("Proiecte active", String(kpis.activeProjects)),
      tile("Task-uri finalizate", `${kpis.taskCompletionPct}%`),
    ],
    [
      tile("Personal", `${kpis.presentToday}/${kpis.headcount}`),
      tile("Clienți activi", String(kpis.activeClients)),
    ],
    [tile("Pipeline", money(kpis.pipelineValue)), tile("Comenzi shop", String(kpis.shopOrders))],
  ]
    .map((pair) => `<tr>${pair.join("")}</tr>`)
    .join("")

  const cta = dashboardUrl
    ? `<div style="text-align:center;margin-top:28px;">
         <a href="${dashboardUrl}" style="${emailStyles.button}">Deschide dashboard-ul</a>
       </div>`
    : ""

  const content = `
    <h1 style="${emailStyles.h1}">${scheduleName}</h1>
    <p style="${emailStyles.body}">
      Raport ${frequencyLabel.toLowerCase()} pentru <strong style="color:#ffffff;">${companyName}</strong> · ${periodLabel}
    </p>
    <div style="text-align:center;margin:8px 0 24px;">
      <div style="display:inline-block;background:rgba(48,209,88,0.12);border:1px solid rgba(48,209,88,0.30);border-radius:100px;padding:8px 20px;">
        <span style="font-size:13px;color:rgba(255,255,255,0.55);">Scor sănătate</span>
        <span style="font-size:20px;font-weight:700;color:#30d158;margin-left:8px;">${kpis.healthScore}/100</span>
      </div>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    ${cta}
  `

  return { subject, html: baseTemplate(content, `${scheduleName} — ${periodLabel}`) }
}
