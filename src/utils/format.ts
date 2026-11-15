/** Presentation-only helpers. Money math lives in src/optimizer. */

function groupThousands(value: number): string {
  return Math.round(Math.abs(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 1985 -> "₱1,985" */
export function formatPeso(value: number): string {
  return `${value < 0 ? '-' : ''}₱${groupThousands(value)}`;
}

/** 1050 -> "-₱1,050" (shows an amount as a deduction) */
export function formatPesoCut(value: number): string {
  return `-₱${groupThousands(value)}`;
}
