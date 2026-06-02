import { MEALS_CSV_URL } from './config.js';
import { parseCSV } from './csv.js';
import { parseMeals } from './model.js';

async function fetchCSV(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
  return res.text();
}

export async function fetchMeals() {
  return parseMeals(parseCSV(await fetchCSV(MEALS_CSV_URL)));
}
