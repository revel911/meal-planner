// The Sheet is transposed: row 0 is meal names ("Dinner", meal1, meal2, ...)
// and every other row is one attribute ("Type", val1, val2, ...). Rows are
// keyed by their first cell (the attribute label) so row order doesn't matter.

function normalizeWhere(raw) {
  const v = raw.trim().toLowerCase();
  if (v === 'homemade' || v === 'home') return 'Home';
  if (v === 'bought' || v === 'eat out' || v === 'eatout') return 'Eat Out';
  if (v === 'either') return 'Either';
  return 'Either'; // sensible default for blank/unknown
}

export function parseMeals(rows) {
  if (!rows || rows.length < 2) return [];

  // label (lowercased/trimmed) -> full row.
  const byLabel = {};
  for (const row of rows) {
    const label = (row[0] || '').trim().toLowerCase();
    if (label) byLabel[label] = row;
  }
  const names = byLabel['dinner'];
  if (!names) return [];

  const cell = (label, col) => {
    const row = byLabel[label];
    return (row && row[col] !== undefined) ? row[col].trim() : '';
  };

  const meals = [];
  for (let col = 1; col < names.length; col++) {
    const name = (names[col] || '').trim();
    if (!name) continue; // skip blank meal columns
    meals.push({
      meal: name,
      category: cell('type', col) || 'Other',
      where: normalizeWhere(cell('bought / made', col)),
      healthy: cell('healthy', col).toLowerCase() === 'yes',
      speed: cell('speed', col),                 // display only
      cost: cell('cost', col),                   // display only
      special: cell('special / sale', col),      // display only
      ingredients: cell('ingredients', col)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }
  return meals;
}
