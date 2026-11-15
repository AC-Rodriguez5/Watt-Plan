/** Presentation-only helpers. Money math lives in src/optimizer. */

function groupThousands(value: number): string {
  return Math.round(Math.abs(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 1985 -> "1,985" (a peso amount without the symbol, for layouts that draw ₱ separately) */
export function formatWhole(value: number): string {
  return `${value < 0 ? '-' : ''}${groupThousands(value)}`;
}

/** 12.014 -> "₱12.01 / kWh" */
export function formatRate(ratePerKwh: number): string {
  return `₱${ratePerKwh.toFixed(2)} / kWh`;
}

/** 246.04 -> "246.0 kWh" */
export function formatKwh(value: number): string {
  const [whole, fraction] = Math.abs(value).toFixed(1).split('.');
  return `${value < 0 ? '-' : ''}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction} kWh`;
}

/** 1985 -> "₱1,985" */
export function formatPeso(value: number): string {
  return `${value < 0 ? '-' : ''}₱${groupThousands(value)}`;
}

/** 3400 -> "3,400.00" (a peso amount to the centavo, without the symbol) */
export function formatAmount(value: number): string {
  const [whole, fraction] = Math.abs(value).toFixed(2).split('.');
  return `${value < 0 ? '-' : ''}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction}`;
}

/** 3400 -> "₱3,400.00" */
export function formatPesoExact(value: number): string {
  return `${value < 0 ? '-' : ''}₱${formatAmount(Math.abs(value))}`;
}

/** 1050 -> "-₱1,050" (shows an amount as a deduction) */
export function formatPesoCut(value: number): string {
  return `-₱${groupThousands(value)}`;
}

/** A timestamp as "10:14 AM" (device local time). */
export function formatClock(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours % 12 === 0 ? 12 : hours % 12}:${minutes} ${hours < 12 ? 'AM' : 'PM'}`;
}
