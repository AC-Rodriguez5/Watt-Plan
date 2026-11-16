/** True when `text` contains `query`, ignoring case and surrounding spaces. An empty query matches everything. */
export function matchesQuery(text: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return needle === '' || text.toLowerCase().includes(needle);
}
