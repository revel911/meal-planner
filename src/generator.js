import { DAYS, RULE_DEFAULTS } from './config.js';

export function countHealthy(plan) {
  return plan.days.filter((d) => d.meal.healthy).length;
}

const RATING_WEIGHT = { up: 2.5, down: 0.25 }; // ~10x spread; neutral/absent = 1
const RECENCY_WEIGHT = [1, 0.25, 0.5, 1]; // index = weeks-ago (0 unused; excluded by pool)

export function ratingWeight(mealName, ratings = {}) {
  return RATING_WEIGHT[(ratings || {})[mealName]] ?? 1;
}

export function recencyWeight(mealName, history = []) {
  for (let w = 1; w < history.length; w++) {
    if (history[w].includes(mealName)) return RECENCY_WEIGHT[w] ?? 1;
  }
  return 1;
}

// Efraimidis-Spirakis weighted shuffle: key = u^(1/weight). rng()===0 => stable order.
function weightedShuffle(arr, rng = Math.random, weightOf = () => 1) {
  return arr
    .map((item) => {
      const w = Math.max(weightOf(item) || 1e-9, 1e-9);
      return { item, key: Math.pow(rng(), 1 / w) };
    })
    .sort((a, b) => b.key - a.key)
    .map((x) => x.item);
}

function weightFn(history, ratings) {
  return (m) => recencyWeight(m.meal, history) * ratingWeight(m.meal, ratings);
}

function modeFor(meal) {
  return meal.where === 'Eat Out' ? 'eatout' : 'cook';
}

// Fill day-slots 0..6 (Mon..Sun) by backtracking over a weighted candidate order.
// `relaxed` is a Set of switched-off tokens. Returns Meal[] indexed by day, or null.
function fillWeek(pool, cfg, relaxed, rng, weightOf) {
  const order = weightedShuffle(pool, rng, weightOf);
  const chosen = [];
  const usedNames = new Set();
  let eatOut = 0;

  function canPlace(m, d) {
    if (usedNames.has(m.meal)) return false;
    // Deal meals are only eligible in their own day slot (never relaxed).
    if (m.dealDay != null && m.dealDay !== d) return false;
    // No same category as the previous day, unless this is a pinned deal placement
    // (deals win over spacing).
    if (!relaxed.has('adjacent') && d > 0 && m.dealDay !== d
        && chosen[d - 1] && chosen[d - 1].category === m.category) return false;
    if (!relaxed.has('eatout') && modeFor(m) === 'eatout' && eatOut + 1 > cfg.maxEatOut) return false;
    return true;
  }

  function backtrack(d) {
    if (d === 7) {
      if (!relaxed.has('healthy')) {
        const h = chosen.filter((m) => m.healthy).length;
        if (h < cfg.healthyTarget) return false;
      }
      return true;
    }
    for (let j = 0; j < order.length; j++) {
      const m = order[j];
      if (!canPlace(m, d)) continue;
      chosen[d] = m; usedNames.add(m.meal);
      const isEat = modeFor(m) === 'eatout'; if (isEat) eatOut++;
      if (backtrack(d + 1)) return true;
      usedNames.delete(m.meal); chosen[d] = undefined;
      if (isEat) eatOut--;
    }
    return false;
  }

  return backtrack(0) ? chosen.slice() : null;
}

// Relaxation ladder, lowest-priority rule dropped first. Deal pins are never relaxed.
const LADDER = [
  [],
  ['healthy'],
  ['healthy', 'adjacent'],
  ['healthy', 'adjacent', 'eatout'],
  ['healthy', 'adjacent', 'eatout', 'repeat'],
];

// `history` is most-recent-first string[][]; opts.ratings is { mealName -> 'up'|'down' }.
export function generateWeek(meals, history = [], opts = {}) {
  const cfg = { ...RULE_DEFAULTS, ...opts };
  const rng = opts.rng || Math.random;
  const recentWeek = history[0] || [];
  const weightOf = weightFn(history, opts.ratings);

  for (const relaxedList of LADDER) {
    const relaxed = new Set(relaxedList);
    const pool = relaxed.has('repeat')
      ? meals.slice()
      : meals.filter((m) => !recentWeek.includes(m.meal));
    if (pool.length < 7) continue;
    const picks = fillWeek(pool, cfg, relaxed, rng, weightOf);
    if (picks) {
      const days = picks.map((m, i) => ({
        day: DAYS[i], meal: m, mode: modeFor(m), locked: false,
      }));
      const plan = { days, relaxations: relaxedList, healthyCount: 0 };
      plan.healthyCount = countHealthy(plan);
      return plan;
    }
  }
  return { days: [], relaxations: ['insufficient'], healthyCount: 0 };
}

// Replace the meal on one day; keep others. Respects neighbor adjacency, the deal
// constraint, the bought cap, and distinct names.
export function rerollDay(plan, dayIndex, meals, opts = {}) {
  const cfg = { ...RULE_DEFAULTS, ...opts };
  const rng = opts.rng || Math.random;
  const current = plan.days[dayIndex].meal.meal;
  const others = plan.days.filter((_, i) => i !== dayIndex);
  const otherNames = others.map((d) => d.meal.meal);
  const eatOutElsewhere = others.filter((d) => d.mode === 'eatout').length;
  const prevCat = dayIndex > 0 ? plan.days[dayIndex - 1].meal.category : null;
  const nextCat = dayIndex < 6 ? plan.days[dayIndex + 1].meal.category : null;

  const weightOf = weightFn(opts.history || [], opts.ratings);
  const candidates = weightedShuffle(meals, rng, weightOf).filter((m) => {
    if (m.meal === current || otherNames.includes(m.meal)) return false;
    if (m.dealDay != null && m.dealDay !== dayIndex) return false;
    const pinned = m.dealDay === dayIndex;
    if (!pinned && (m.category === prevCat || m.category === nextCat)) return false;
    if (modeFor(m) === 'eatout' && eatOutElsewhere + 1 > cfg.maxEatOut) return false;
    return true;
  });

  // Fallbacks: prefer a fully-eligible candidate; else any distinct unused meal
  // (relaxes only adjacency/cap, never duplicates); else leave the day unchanged.
  const pick = candidates[0]
    || meals.find((m) => m.meal !== current && !otherNames.includes(m.meal))
    || plan.days[dayIndex].meal;
  const days = plan.days.map((d, i) => i === dayIndex
    ? { ...d, meal: pick, mode: modeFor(pick) }
    : d);
  const next = { ...plan, days };
  next.healthyCount = countHealthy(next);
  return next;
}
