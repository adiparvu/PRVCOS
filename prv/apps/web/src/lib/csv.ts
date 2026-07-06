// CSV serialization (roadmap 15.4 — report export). Pure + unit-tested.
//
// RFC 4180 style: fields containing a comma, double-quote, or line break are
// wrapped in double-quotes with internal quotes doubled. Rows are joined with
// CRLF so the output opens cleanly in Excel as well as Numbers/Sheets.

export interface CsvColumn {
  key: string
  label: string
}

const EOL = "\r\n"

function cell(value: unknown): string {
  if (value === null || value === undefined) return ""
  const s = typeof value === "string" ? value : String(value)
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * Serialize `rows` to a CSV string using the given `columns` for order and
 * headers. Values are read by column key; missing keys become empty cells.
 */
export function toCsv(rows: Record<string, unknown>[], columns: CsvColumn[]): string {
  const header = columns.map((c) => cell(c.label)).join(",")
  const body = rows.map((row) => columns.map((c) => cell(row[c.key])).join(","))
  return [header, ...body].join(EOL)
}
