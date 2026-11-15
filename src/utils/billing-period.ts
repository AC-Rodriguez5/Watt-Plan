/** Billing-period labels. Dates are ISO (YYYY-MM-DD) and read as calendar dates, not instants. */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MS_PER_DAY = 86_400_000;

function parseIso(iso: string): { month: number; day: number; utc: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return { month, day, utc: Date.UTC(year, month - 1, day) };
}

/** ("2024-10-01", "2024-10-31") -> "Oct 1 – Oct 31". Empty when either date is invalid. */
export function formatPeriod(startIso: string, endIso: string): string {
  const start = parseIso(startIso);
  const end = parseIso(endIso);
  if (!start || !end) return '';
  return `${MONTHS[start.month - 1]} ${start.day} – ${MONTHS[end.month - 1]} ${end.day}`;
}

/** Which day of the billing period `today` is, counting the first day as 1 and clamped to the period. */
export function billingDay(startIso: string, endIso: string, today: Date = new Date()): number | null {
  const start = parseIso(startIso);
  const end = parseIso(endIso);
  if (!start || !end) return null;
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const length = Math.round((end.utc - start.utc) / MS_PER_DAY) + 1;
  const day = Math.round((todayUtc - start.utc) / MS_PER_DAY) + 1;
  return Math.min(Math.max(day, 1), Math.max(length, 1));
}
