export function formatCurrency(amount: number, currency = "RON", locale = "ro-RO"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date, locale = "ro-RO"): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" })
}

export function formatDateShort(date: string | Date, locale = "ro-RO"): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function formatNumber(n: number, decimals = 2): string {
  return n.toLocaleString("ro-RO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function vatLabel(rate: number): string {
  return `TVA ${(rate * 100).toFixed(0)}%`
}
