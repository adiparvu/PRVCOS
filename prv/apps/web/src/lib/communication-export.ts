// Communication compliance export (Phase 13.6) — pure + unit-tested.
//
// Normalises the requested date range for a legal/compliance export. Both bounds
// are optional: `from` defaults to one year before `to`, and `to` defaults to
// now. An invalid or inverted range collapses to an empty window rather than
// silently returning everything, so a malformed request never over-exports.

export interface ExportBounds {
  fromMs: number
  toMs: number
  /** True when the caller supplied no usable range and defaults were applied. */
  defaulted: boolean
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

function parseMs(v: string | null | undefined): number | null {
  if (!v) return null
  const ms = Date.parse(v)
  return Number.isFinite(ms) ? ms : null
}

export function exportDateBounds(
  from: string | null | undefined,
  to: string | null | undefined,
  now: Date
): ExportBounds {
  const toMs = parseMs(to) ?? now.getTime()
  const fromParsed = parseMs(from)
  const fromMs = fromParsed ?? toMs - ONE_YEAR_MS
  const defaulted = fromParsed === null || parseMs(to) === null

  // An inverted range (from after to) yields an empty window, never everything.
  if (fromMs > toMs) return { fromMs: toMs, toMs, defaulted: true }
  return { fromMs, toMs, defaulted }
}

export interface ExportSummary {
  channels: number
  channelMessages: number
  announcements: number
  truncated: boolean
}

export function summarizeExport(
  channelCount: number,
  channelMessages: number,
  announcements: number,
  truncated: boolean
): ExportSummary {
  return { channels: channelCount, channelMessages, announcements, truncated }
}
