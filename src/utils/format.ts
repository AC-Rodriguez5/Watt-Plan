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

/** 1050 -> "-₱1,050" (shows an amount as a deduction) */
export function formatPesoCut(value: number): string {
  return `-₱${groupThousands(value)}`;
}
