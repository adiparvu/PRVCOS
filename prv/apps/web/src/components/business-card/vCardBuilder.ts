export interface VCardData {
  firstName: string
  lastName: string
  fullName: string
  jobTitle?: string | null
  company?: string | null
  phone?: string | null
  email?: string | null
  linkedInUrl?: string | null
  websiteUrl?: string | null
  avatarUrl?: string | null
  publicCardUrl?: string | null
}

/** Assembles a vCard 4.0 string suitable for QR code or .vcf download */
export function buildVCard(data: VCardData): string {
  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:4.0",
    `FN:${escape(data.fullName)}`,
    `N:${escape(data.lastName)};${escape(data.firstName)};;;`,
  ]

  if (data.jobTitle) lines.push(`TITLE:${escape(data.jobTitle)}`)
  if (data.company) lines.push(`ORG:${escape(data.company)}`)
  if (data.phone) lines.push(`TEL;TYPE=CELL:${data.phone}`)
  if (data.email) lines.push(`EMAIL:${data.email}`)
  if (data.linkedInUrl) lines.push(`URL;TYPE=linkedin:${data.linkedInUrl}`)
  else if (data.websiteUrl) lines.push(`URL:${data.websiteUrl}`)
  else if (data.publicCardUrl) lines.push(`URL:${data.publicCardUrl}`)

  lines.push("END:VCARD")
  return lines.join("\r\n")
}

/** Triggers a browser download of the vCard file */
export function downloadVCard(data: VCardData): void {
  const content = buildVCard(data)
  const blob = new Blob([content], { type: "text/vcard;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${data.firstName}-${data.lastName}.vcf`
  a.click()
  URL.revokeObjectURL(url)
}

function escape(str: string): string {
  return str.replace(/[\\,;]/g, (c) => `\\${c}`)
}
