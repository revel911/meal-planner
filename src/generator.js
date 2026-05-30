import { DAYS, RULE_DEFAULTS } from './config.js';

export function countHealthy(plan) {
  return plan.days.filter((d) => d.meal.healthy).length;
}

const RATING_WEIGHT = { up: 2.5, down: 0.25 };
// History is most-recent-first. Index 0 (the most recent week) is excluded by the
// pool filter, so it carries no extra penalty here; older weeks fade back in.
const RECENCY_WEIGHT = [1, 0.25, 0.5];

export function ratingWeight(mealName, ratings = {}) {
  return RATING_WEIGHT[(ratings || {})[mealName]] ?? 1;
}

export function recencyWeight(mealName, history = []) {
  for (let w = 1; w < history.length; w++) {
    if (history[w].includes(mealName)) return RECENCY_WEIGHT[w] ?? 1;
  }
  return 1;
}

// Efraimidis-Spirakis weighted shuffle: key = u^(1/weight); larger key sorts first,
// so higher-weight items tend to land earlier. With rng()===0 every key is 0 and the
// (stable) sort preserves input order, keeping the existing deterministic tests valid.
function weightedShuffle(arr, rng = Math.random, weightOf = () => 1) {
  return arr
    .map((item) => {
      const w = Math.max(weightOf(item), 1e-9);
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

// Try to pick `need` distinct meals from `pool` satisfying the active rules.
// `relaxed` is a Set of tokens currently switched off. `weightOf` biases pick order.
// Returns Meal[] or null.
function select(pool, need, cfg, relaxed, rng, fixed = [], weightOf = () => 1) {
  // Weighted ordering biases greedy solutions toward liked/less-recent meals;
  // the healthy target is still enforced below by backtracking.
  const order = weightedShuffle(pool, rng, weightOf);
  const chosen = [...fixed];
  const usedCats = new Set(fixed.map((m) => m.category));
  const usedNames = new Set(fixed.map((m) => m.meal));
  let eatOut = fixed.filter((m) => modeFor(m) === 'eatout').length;

  function ok(m) {
    if (usedNames.has(m.meal)) return false;
    if (!relaxed.has('category') && usedCats.has(m.category)) return false;
    if (!relaxed.has('eatout') && modeFor(m) === 'eatout' && eatOut + 1 > cfg.maxEatOut) return false;
    return true;
  }

  function backtrack(start) {
    if (chosen.length === need) {
      if (!relaxed.has('healthy')) {
        const h = chosen.filter((m) => m.healthy).length;
        if (h < cfg.healthyTarget) return false;
      }
      return true;
    }
    for (let j = start; j < order.length; j++) {
      const m = order[j];
      if (!ok(m)) continue;
      chosen.push(m); usedCats.add(m.category); usedNames.add(m.meal);
      const isEat = modeFor(m) === 'eatout'; if (isEat) eatOut++;
      if (backtrack(j + 1)) return true;
      chosen.pop(); usedCats.delete(m.category); usedNames.delete(m.meal);
      if (isEat) eatOut--;
    }
    return false;
  }

  return backtrack(0) ? chosen : null;
}

// Relaxation ladder, lowest-priority rule dropped first.
const LADDER = [
  [],
  ['healthy'],
  ['healthy', 'category'],
  ['healthy', 'category', 'eatout'],
  ['healthy', 'category', 'eatout', 'repeat'],
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
    if (pool.length < 7) continue; // not enough eligible meals at this relaxation level
    const picks = select(pool, 7, cfg, relaxed, rng, [], weightOf);
    if (picks) {
      const days = picks.map((m, i) => ({
        day: DAYS[i], meal: m, mode: modeFor(m), locked: false,
      }));
      const plan = { days, relaxations: relaxedList, healthyCount: 0 };
      plan.healthyCount = countHealthy(plan);
      return plan;
    }
  }
  // Even fully relaxed there are < 7 meals: signal "not enough data".
  return { days: [], relaxations: ['insufficient'], healthyCount: 0 };
}

// Replace the meal on one day with a different eligible meal; keep all other days.
export function rerollDay(plan, dayIndex, meals, opts = {}) {
  const cfg = { ...RULE_DEFAULTS, ...opts };
  const rng = opts.rng || Math.random;
  const current = plan.days[dayIndex].meal.meal;
  const otherNames = plan.days.filter((_, i) => i !== dayIndex).map((d) => d.meal.meal);
  const otherCats = plan.days.filter((_, i) => i !== dayIndex).map((d) => d.meal.category);
  const eatOutElsewhere = plan.days.filter((_, i) => i !== dayIndex && d_mode(plan, i) === 'eatout').length;

  const weightOf = weightFn(opts.history || [], opts.ratings);
  const candidates = weightedShuffle(meals, rng, weightOf).filter((m) =>
    m.meal !== current &&
    !otherNames.includes(m.meal) &&
    !otherCats.includes(m.category) &&
    !(modeFor(m) === 'eatout' && eatOutElsewhere + 1 > cfg.maxEatOut));

  const pick = candidates[0] || meals.find((m) => m.meal !== current) || plan.days[dayIndex].meal;
  const days = plan.days.map((d, i) => i === dayIndex
    ? { ...d, meal: pick, mode: modeFor(pick) }
    : d);
  const next = { ...plan, days };
  next.healthyCount = countHealthy(next);
  return next;
}

function d_mode(plan, i) { return plan.days[i].mode; }

// Re-roll every unlocked day, keeping locked days fixed.
export function regenerateUnlocked(plan, meals, opts = {}) {
  const cfg = { ...RULE_DEFAULTS, ...opts };
  const rng = opts.rng || Math.random;
  const locked = plan.days.filter((d) => d.locked);
  const fixed = locked.map((d) => d.meal);
  const need = 7;
  const pool = meals.slice();
  const weightOf = weightFn(opts.history || [], opts.ratings);

  let picks = null;
  for (const relaxedList of LADDER) {
    const relaxed = new Set(relaxedList);
    picks = select(pool, need, cfg, relaxed, rng, fixed, weightOf);
    if (picks) {
      // picks starts with the fixed (locked) meals; map back onto day positions.
      const unlockedPicks = picks.slice(fixed.length);
      let u = 0;
      const days = plan.days.map((d) => d.locked
        ? d
        : { ...d, meal: unlockedPicks[u], mode: modeFor(unlockedPicks[u++]), locked: false });
      const next = { ...plan, days, relaxations: relaxedList };
      next.healthyCount = countHealthy(next);
      return next;
    }
  }
  return plan; // could not improve; leave unchanged
}
