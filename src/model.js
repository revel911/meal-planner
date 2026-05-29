// Header-driven row mapping so column order in the Sheet doesn't matter.
function indexer(headerRow) {
  const idx = {};
  headerRow.forEach((h, i) => { idx[h.trim().toLowerCase()] = i; });
  return (row, name) => {
    const i = idx[name];
    return (i === undefined || row[i] === undefined) ? '' : row[i].trim();
  };
}

function normalizeWhere(raw) {
  const v = raw.trim().toLowerCase();
  if (v === 'home') return 'Home';
  if (v === 'eat out' || v === 'eatout') return 'Eat Out';
  if (v === 'either') return 'Either';
  return 'Either'; // sensible default for blank/unknown
}

export function parseMeals(rows) {
  if (!rows || rows.length < 2) return [];
  const get = indexer(rows[0]);
  return rows.slice(1)
    .filter((r) => get(r, 'meal') !== '')
    .map((r) => ({
      meal: get(r, 'meal'),
      category: get(r, 'category') || 'Other',
      ingredients: get(r, 'ingredients')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      where: normalizeWhere(get(r, 'where')),
      healthy: get(r, 'healthy').toLowerCase() === 'yes',
      notes: get(r, 'notes'),
    }));
}

export function parseDeals(rows) {
  if (!rows || rows.length < 2) return [];
  const get = indexer(rows[0]);
  return rows.slice(1)
    .filter((r) => get(r, 'day') !== '')
    .map((r) => ({
      day: get(r, 'day'),
      restaurant: get(r, 'restaurant'),
      deal: get(r, 'deal'),
      notes: get(r, 'notes'),
    }));
}
