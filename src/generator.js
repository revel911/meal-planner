import { DAYS, RULE_DEFAULTS } from './config.js';

export function countHealthy(plan) {
  return plan.days.filter((d) => d.meal.healthy).length;
}

// Fisher-Yates using an injectable rng (defaults to Math.random).
function shuffled(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function modeFor(meal) {
  return meal.where === 'Eat Out' ? 'eatout' : 'cook';
}

// Try to pick `need` distinct meals from `pool` satisfying the active rules.
// `relaxed` is a Set of tokens currently switched off. Returns Meal[] or null.
function select(pool, need, cfg, relaxed, rng, fixed = []) {
  // Healthy-first ordering biases greedy solutions toward the target.
  const order = shuffled(pool, rng).sort((a, b) => Number(b.healthy) - Number(a.healthy));
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

export function generateWeek(meals, lastWeek = [], opts = {}) {
  const cfg = { ...RULE_DEFAULTS, ...opts };
  const rng = opts.rng || Math.random;

  for (const relaxedList of LADDER) {
    const relaxed = new Set(relaxedList);
    const pool = relaxed.has('repeat')
      ? meals.slice()
      : meals.filter((m) => !lastWeek.includes(m.meal));
    if (pool.length < 7) continue; // not enough eligible meals at this relaxation level
    const picks = select(pool, 7, cfg, relaxed, rng);
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

  const candidates = shuffled(meals, rng).filter((m) =>
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

  let picks = null;
  for (const relaxedList of LADDER) {
    const relaxed = new Set(relaxedList);
    picks = select(pool, need, cfg, relaxed, rng, fixed);
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
