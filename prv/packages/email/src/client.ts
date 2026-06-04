import { Resend } from "resend"

let _resend: Resend | null = null

export function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env["RESEND_API_KEY"]
    if (!apiKey) throw new Error("RESEND_API_KEY is required")
    _resend = new Resend(apiKey)
  }
  return _resend
}

// Email addresses
export const EmailFrom = {
  NOREPLY: "PRV <noreply@prv.ro>",
  SUPPORT: "PRV Support <support@prv.ro>",
  NOTIFICATIONS: "PRV <notifications@prv.ro>",
} as const

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
  tags?: Array<{ name: string; value: string }>
}

export async function sendEmail(options: SendEmailOptions): Promise<{ id: string }> {
  const resend = getResend()

  const result = await resend.emails.send({
    from: options.from ?? EmailFrom.NOREPLY,
    to: Array.isArray(options.to) ? options.to : [options.to],
    subject: options.subject,
    html: options.html,
    replyTo: options.replyTo,
    tags: options.tags,
  })

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`)
  }

  return { id: result.data!.id }
}
