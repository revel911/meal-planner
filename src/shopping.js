// Display order of aisles (from DESIGN-SYSTEM.md).
export const AISLE_ORDER = ['Produce', 'Meat & Seafood', 'Pantry', 'Dairy', 'Other'];

// Keyword -> aisle. Checked in this order so specific buckets win over 'Produce'
// (e.g. "canned tomatoes" should land in Pantry, not Produce on the word "tomato").
const AISLE_KEYWORDS = [
  ['Meat & Seafood', ['beef', 'chicken', 'pork', 'salmon', 'tuna', 'shrimp', 'steak', 'lamb', 'fish', 'sausage']],
  ['Dairy', ['cheese', 'parmesan', 'mozzarella', 'yogurt', 'cream', 'feta', 'butter', 'milk', 'egg']],
  ['Pantry', ['pasta', 'noodle', 'rice', 'tortilla', 'bun', 'bean', 'soy sauce', 'flour', 'oil', 'chili powder',
    'cornmeal', 'masala', 'tamarind', 'peanut', 'achiote', 'wasabi', 'nori', 'dough', 'sauce', 'dressing',
    'tzatziki', 'pita', 'canned', 'san marzano', 'sugar', 'vinegar', 'broth', 'stock', 'spice']],
  ['Produce', ['onion', 'garlic', 'tomato', 'lettuce', 'cilantro', 'lime', 'lemon', 'avocado', 'broccoli',
    'asparagus', 'potato', 'cucumber', 'basil', 'pineapple', 'romaine', 'ginger', 'sprout', 'pepper',
    'carrot', 'spinach', 'mushroom']],
];

export function classifyAisle(ingredient) {
  const s = ingredient.toLowerCase();
  for (const [aisle, words] of AISLE_KEYWORDS) {
    if (words.some((w) => s.includes(w))) return aisle;
  }
  return 'Other';
}

export function buildShoppingList(plan, staples = []) {
  const stapleSet = new Set(staples.map((s) => s.toLowerCase()));
  const byKey = new Map(); // key -> { name, key, meals:Set, aisle }

  for (const day of plan.days) {
    if (day.mode !== 'cook') continue;
    for (const ing of day.meal.ingredients) {
      const key = ing.trim().toLowerCase();
      if (!key) continue;
      if (!byKey.has(key)) {
        byKey.set(key, { name: ing.trim(), key, meals: new Set(), aisle: classifyAisle(ing) });
      }
      byKey.get(key).meals.add(day.meal.meal);
    }
  }

  // Bucket by aisle.
  const buckets = new Map();
  for (const item of byKey.values()) {
    if (!buckets.has(item.aisle)) buckets.set(item.aisle, []);
    buckets.get(item.aisle).push({
      name: item.name,
      key: item.key,
      meals: [...item.meals],
      staple: stapleSet.has(item.key),
    });
  }

  // Emit in display order, alphabetized within a group, skipping empty aisles.
  return AISLE_ORDER
    .filter((a) => buckets.has(a))
    .map((aisle) => ({
      aisle,
      items: buckets.get(aisle).sort((a, b) => a.name.localeCompare(b.name)),
    }));
}
