/**
 * Trade hours (matrix L3.2.2.40). Pure.
 *
 * A campaign never sends during the reader's working day. Lead's decision
 * (2026-11-28; Pax may overrule): trade hours are a per-tenant setting
 * (start, end, time zone), UNSET by default. While unset, a campaign may be
 * approved and is marked "waits for trade hours to be set"; nothing sends
 * anyway because the sales gate is shut.
 *
 * No column holds the setting yet, so every firm reads as unset. The
 * architect adds the column; until then this reader is the one door.
 */

export interface TradeHours { start: string; end: string; timeZone: string }

export const TRADE_HOURS_UNSET_SAYS = 'Waits for trade hours to be set.'

/** The firm's trade hours. Null for every firm until the setting has a column. */
export const tradeHoursOf = (_companyId: string): TradeHours | null => null

const minutes = (hhmm: string): number | null => {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm)
  if (!m) return null
  const h = Number(m[1]); const mm = Number(m[2])
  return h < 24 && mm < 60 ? h * 60 + mm : null
}

/** The clock time in a zone, in minutes after midnight. */
function clockIn(timeZone: string, now: Date): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
    const h = Number(parts.find((p) => p.type === 'hour')?.value); const m = Number(parts.find((p) => p.type === 'minute')?.value)
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null
  } catch { return null }
}

/** Whether a campaign may send now: never while unset, never inside trade hours, never on a setting that does not read. */
export function outsideTradeHours(th: TradeHours | null, now: Date): boolean {
  if (!th) return false
  const s = minutes(th.start); const e = minutes(th.end); const c = clockIn(th.timeZone, now)
  if (s === null || e === null || c === null || s === e) return false
  const inside = s < e ? c >= s && c < e : c >= s || c < e
  return !inside
}
