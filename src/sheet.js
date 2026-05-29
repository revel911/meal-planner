import { MEALS_CSV_URL, DEALS_CSV_URL } from './config.js';
import { parseCSV } from './csv.js';
import { parseMeals, parseDeals } from './model.js';

async function fetchCSV(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
  return res.text();
}

export async function fetchMeals() {
  return parseMeals(parseCSV(await fetchCSV(MEALS_CSV_URL)));
}

// The Deals tab may not exist yet. If gviz falls back to the meals tab, the rows
// won't have a 'Day' column header -> parseDeals returns []. Network errors also -> [].
export async function fetchDeals() {
  try {
    const rows = parseCSV(await fetchCSV(DEALS_CSV_URL));
    const header = (rows[0] || []).map((h) => h.trim().toLowerCase());
    if (!header.includes('day')) return []; // fell back to a non-deals tab
    return parseDeals(rows);
  } catch {
    return [];
  }
}
