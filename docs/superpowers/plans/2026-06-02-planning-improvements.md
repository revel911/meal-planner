# Planning Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add category spacing (no back-to-back), deal-day pinning, a week-at-a-glance strip, a distinct "Either" icon, and a one-tap "Reload from Sheet" — by turning week generation from "pick 7 meals" into "fill 7 day-slots."

**Architecture:** `model.js` derives a `dealDay` index from `Special / Sale`. `generator.js` is rewritten to backtrack over Mon–Sun slots enforcing adjacency + deal pins. `render.js` gains a week strip, a `pot` badge for Either, and an adjacency-based override warning. `app.js`/`index.html` wire the strip and a reload button.

**Tech Stack:** Vanilla ES modules, no build; `node:test` unit tests.

**Spec:** `docs/superpowers/specs/2026-06-02-meal-planner-planning-improvements-design.md`

---

### Task 1: `dealDay` parsing (`model.js`)

**Files:**
- Modify: `src/model.js`
- Test: `tests/model.test.js`

- [ ] **Step 1: Add failing tests**

Append to `tests/model.test.js`:

```js
test('parseMeals derives dealDay from Special/Sale weekday text', () => {
  const rows = [
    ['Dinner', 'Tacos', 'Empanadas', 'Spaghetti', 'Sushi'],
    ['Special / Sale', 'Tuesdays', 'Wednesday', '', 'BOGO'],
  ];
  const meals = parseMeals(rows);
  assert.equal(meals[0].dealDay, 1); // Tuesday
  assert.equal(meals[1].dealDay, 2); // Wednesday
  assert.equal(meals[2].dealDay, null); // blank
  assert.equal(meals[3].dealDay, null); // non-weekday text
  // raw special text is still kept for the pill
  assert.equal(meals[0].special, 'Tuesdays');
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `node --test tests/model.test.js`
Expected: FAIL — `dealDay` is `undefined`.

- [ ] **Step 3: Implement**

In `src/model.js`, add this import-free helper near the top (after `normalizeWhere`):

```js
import { DAYS } from './config.js';

// Parse a Special/Sale cell into a weekday index (0=Mon..6=Sun), or null.
// Tolerates a trailing "s" ("Tuesdays") and any case.
function parseDealDay(special) {
  const v = special.trim().toLowerCase();
  if (!v) return null;
  const i = DAYS.findIndex((d) => v.startsWith(d.toLowerCase()));
  return i === -1 ? null : i;
}
```

Then in the meal object built inside `parseMeals`, add the field right after `special`:

```js
      special: cell('special / sale', col),      // display only
      dealDay: parseDealDay(cell('special / sale', col)),
```

- [ ] **Step 4: Run, verify pass**

Run: `node --test tests/model.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/model.js tests/model.test.js
git commit -m "feat(model): derive dealDay weekday index from Special/Sale

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Slot-filling generator with adjacency + deal pins (`generator.js`)

**Files:**
- Modify: `src/generator.js`
- Test: `tests/generator.test.js`

- [ ] **Step 1: Rewrite the generator tests**

Replace the ENTIRE contents of `tests/generator.test.js` with:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateWeek, rerollDay, countHealthy, ratingWeight, recencyWeight } from '../src/generator.js';

// 8 distinct categories, 1 eat-out, 1 healthy.
const MEALS = [
  { meal: 'Spaghetti', category: 'Italian', ingredients: ['pasta'], where: 'Home', healthy: true },
  { meal: 'Tikka', category: 'Indian', ingredients: ['chicken'], where: 'Home', healthy: false },
  { meal: 'Tacos', category: 'Mexican', ingredients: ['pork'], where: 'Either', healthy: false },
  { meal: 'Pad Thai', category: 'Thai', ingredients: ['noodles'], where: 'Either', healthy: false },
  { meal: 'Burgers', category: 'American', ingredients: ['beef'], where: 'Either', healthy: false },
  { meal: 'Sushi', category: 'Japanese', ingredients: ['rice'], where: 'Eat Out', healthy: false },
  { meal: 'Beef Broccoli', category: 'Chinese', ingredients: ['steak'], where: 'Home', healthy: false },
  { meal: 'Gyros', category: 'Greek', ingredients: ['pita'], where: 'Either', healthy: false },
];

// 5 categories x 2 meals = forces categories to repeat across 7 days.
const FEW_CAT = ['Italian', 'Mexican', 'Seafood', 'American', 'Asian'].flatMap((c, k) =>
  [1, 2].map((n) => ({ meal: `${c}${n}`, category: c, ingredients: [], where: 'Home', healthy: false })));

const noShuffle = () => 0;
// Seeded LCG for multi-draw tests.
function lcg(seed) { let s = seed; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }

function noBackToBack(plan) {
  for (let i = 1; i < plan.days.length; i++) {
    if (plan.days[i].meal.category === plan.days[i - 1].meal.category) return false;
  }
  return true;
}

test('generates a 7-day Mon-Sun week with distinct meals and no back-to-back category', () => {
  const plan = generateWeek(MEALS, [], { rng: noShuffle });
  assert.equal(plan.days.length, 7);
  assert.deepEqual(plan.days.map((d) => d.day),
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
  assert.equal(new Set(plan.days.map((d) => d.meal.meal)).size, 7, 'meals are distinct');
  assert.ok(noBackToBack(plan), 'no two consecutive days share a category');
});

test('avoids back-to-back categories even when categories must repeat', () => {
  for (let s = 0; s < 30; s++) {
    const plan = generateWeek(FEW_CAT, [], { rng: lcg(s + 1), healthyTarget: 0 });
    assert.equal(plan.days.length, 7);
    assert.ok(noBackToBack(plan), `back-to-back found for seed ${s}`);
    // categories necessarily repeat (only 5 exist)
    assert.ok(new Set(plan.days.map((d) => d.meal.category)).size < 7);
  }
});

test('respects the eat-out cap (<= 2 eatout days)', () => {
  const plan = generateWeek(MEALS, [], { rng: noShuffle });
  assert.ok(plan.days.filter((d) => d.mode === 'eatout').length <= 2);
});

test('relaxes the healthy rule (lowest priority) when target is unreachable', () => {
  const plan = generateWeek(MEALS, [], { rng: noShuffle, healthyTarget: 3 });
  assert.deepEqual(plan.relaxations, ['healthy']);
  assert.equal(plan.healthyCount, countHealthy(plan));
});

test('excludes the most-recent week unless repeat must be relaxed', () => {
  const history = [['Spaghetti', 'Tikka']];
  const plan = generateWeek(MEALS, history, { rng: noShuffle, healthyTarget: 0 });
  assert.ok(plan.relaxations.includes('repeat'));
});

test('a deal meal only ever lands on its deal day', () => {
  const meals = FEW_CAT.map((m) => (m.meal === 'Mexican1' ? { ...m, dealDay: 1 } : m));
  for (let s = 0; s < 50; s++) {
    const plan = generateWeek(meals, [], { rng: lcg(s + 1), healthyTarget: 0 });
    const idx = plan.days.findIndex((d) => d.meal.meal === 'Mexican1');
    if (idx >= 0) assert.equal(idx, 1, `Mexican1 at day ${idx} for seed ${s}`);
  }
});

test('a deal pin may break back-to-back (deals win over spacing)', () => {
  const meals = [
    { meal: 'TacoTue', category: 'Mexican', where: 'Home', healthy: false, ingredients: [], dealDay: 1 },
    { meal: 'EmpWed', category: 'Mexican', where: 'Home', healthy: false, ingredients: [], dealDay: 2 },
    { meal: 'A', category: 'Italian', where: 'Home', healthy: false, ingredients: [] },
    { meal: 'B', category: 'Seafood', where: 'Home', healthy: false, ingredients: [] },
    { meal: 'C', category: 'American', where: 'Home', healthy: false, ingredients: [] },
    { meal: 'D', category: 'Asian', where: 'Home', healthy: false, ingredients: [] },
    { meal: 'E', category: 'Greek', where: 'Home', healthy: false, ingredients: [] },
    { meal: 'F', category: 'Thai', where: 'Home', healthy: false, ingredients: [] },
    { meal: 'G', category: 'French', where: 'Home', healthy: false, ingredients: [] },
  ];
  const plan = generateWeek(meals, [], { rng: noShuffle, healthyTarget: 0 });
  assert.equal(plan.days[1].meal.meal, 'TacoTue');
  assert.equal(plan.days[2].meal.meal, 'EmpWed');
  assert.equal(plan.days[1].meal.category, plan.days[2].meal.category); // adjacent Mexican, allowed
});

test('rerollDay swaps one day for an eligible different meal, keeping others', () => {
  const plan = generateWeek(MEALS, [], { rng: noShuffle, healthyTarget: 0 });
  const before = plan.days[2].meal.meal;
  const next = rerollDay(plan, 2, MEALS, { rng: () => 0.5 });
  assert.notEqual(next.days[2].meal.meal, before);
  assert.equal(next.days[0].meal.meal, plan.days[0].meal.meal);
});

test('ratingWeight boosts up, penalizes down, neutral is 1', () => {
  assert.equal(ratingWeight('Tacos', { Tacos: 'up' }), 2.5);
  assert.equal(ratingWeight('Tacos', { Tacos: 'down' }), 0.25);
  assert.equal(ratingWeight('Tacos', {}), 1);
  assert.equal(ratingWeight('Tacos', undefined), 1);
});

test('recencyWeight fades meals seen 2-3 weeks ago, full for unseen', () => {
  const history = [['Recent'], ['TwoAgo'], ['ThreeAgo']];
  assert.equal(recencyWeight('TwoAgo', history), 0.25);
  assert.equal(recencyWeight('ThreeAgo', history), 0.5);
  assert.equal(recencyWeight('Unseen', history), 1);
  assert.equal(recencyWeight('Recent', history), 1);
});

test('thumbs-up meals are chosen more often than thumbs-down over many draws', () => {
  const rng = lcg(1);
  const ratings = { Spaghetti: 'up', Gyros: 'down' };
  let up = 0, down = 0;
  for (let i = 0; i < 200; i++) {
    const names = generateWeek(MEALS, [], { rng, ratings, healthyTarget: 0 }).days.map((d) => d.meal.meal);
    if (names.includes('Spaghetti')) up++;
    if (names.includes('Gyros')) down++;
  }
  assert.ok(up > down, `expected up(${up}) > down(${down})`);
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `node --test tests/generator.test.js`
Expected: FAIL — `regenerateUnlocked` import gone but old code still exports it / new behavior (adjacency, dealDay, no back-to-back) not implemented.

- [ ] **Step 3: Rewrite `src/generator.js`**

Replace the ENTIRE contents of `src/generator.js` with:

```js
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

  const pick = candidates[0] || meals.find((m) => m.meal !== current) || plan.days[dayIndex].meal;
  const days = plan.days.map((d, i) => i === dayIndex
    ? { ...d, meal: pick, mode: modeFor(pick) }
    : d);
  const next = { ...plan, days };
  next.healthyCount = countHealthy(next);
  return next;
}
```

This removes `regenerateUnlocked` and the old `select`/`d_mode` helpers.

- [ ] **Step 4: Run, verify pass**

Run: `node --test tests/generator.test.js`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/generator.js tests/generator.test.js
git commit -m "feat(generator): slot-fill with no-back-to-back category + deal-day pins; drop regenerateUnlocked

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Week strip, Either badge, adjacency warning (`render.js`)

**Files:**
- Modify: `src/render.js`
- Test: `tests/render.test.js`

- [ ] **Step 1: Update render tests**

In `tests/render.test.js`, add `where` to the existing fixtures and add an Either fixture. Replace the `COOK_DAY`/`EATOUT_DAY` consts with:

```js
const COOK_DAY = { day: 'Monday', mode: 'cook', locked: false,
  meal: { meal: 'Spaghetti', category: 'Italian', where: 'Home', healthy: true, speed: 'Quick', cost: '$', special: '' } };
const EATOUT_DAY = { day: 'Tuesday', mode: 'eatout', locked: false,
  meal: { meal: 'Sushi', category: 'Asian', where: 'Eat Out', healthy: false, speed: 'N/A', cost: '$$$', special: 'Tuesdays' } };
const EITHER_DAY = { day: 'Wednesday', mode: 'cook', locked: false,
  meal: { meal: 'Burgers', category: 'American', where: 'Either', healthy: false, speed: 'Quick', cost: '$$', special: '' } };
```

Add these tests (and update the import line to include `weekStripHTML`):

```js
test('dayCardHTML badge reflects where: home / pot(either) / utensils(bought)', () => {
  assert.match(dayCardHTML(COOK_DAY, 0), /badge-cook/);
  assert.match(dayCardHTML(EITHER_DAY, 2), /badge-either/);
  assert.match(dayCardHTML(EATOUT_DAY, 1), /badge-eatout/);
});

test('weekStripHTML lists every day with a goto-day control', () => {
  const plan = { days: [COOK_DAY, EATOUT_DAY, EITHER_DAY], relaxations: [], healthyCount: 0 };
  const html = weekStripHTML(plan);
  assert.match(html, /data-action="goto-day"/);
  assert.match(html, /data-day="0"/);
  assert.match(html, /data-day="2"/);
  assert.match(html, /Spaghetti/);
  assert.match(html, /MON/i);
  assert.equal(weekStripHTML({ days: [] }), '');
});

test('evaluateOverride flags back-to-back category and bought overflow', () => {
  const plan = { days: [
    { day: 'Monday', mode: 'cook', meal: { meal: 'A', category: 'Italian', where: 'Home' } },
    { day: 'Tuesday', mode: 'eatout', meal: { meal: 'B', category: 'Asian', where: 'Eat Out' } },
    { day: 'Wednesday', mode: 'eatout', meal: { meal: 'C', category: 'Mexican', where: 'Eat Out' } },
  ], relaxations: [], healthyCount: 0 };
  // Replace Monday with an Asian meal -> clashes with adjacent Tuesday.
  assert.match(evaluateOverride(plan, 0, { meal: 'D', category: 'Asian', where: 'Home' }), /back-to-back|adjacent/i);
  // Replace Monday with a 3rd bought -> exceeds cap of 2.
  assert.match(evaluateOverride(plan, 0, { meal: 'E', category: 'Greek', where: 'Eat Out' }), /bought/i);
  // A clean pick whose category is not adjacent -> empty.
  assert.equal(evaluateOverride(plan, 0, { meal: 'F', category: 'Greek', where: 'Home' }), '');
});
```

Remove the old `evaluateOverride flags a duplicate category and eat-out overflow` test (replaced above).

- [ ] **Step 2: Run, verify it fails**

Run: `node --test tests/render.test.js`
Expected: FAIL — `weekStripHTML` undefined; badge not keyed on `where`; override warning still week-wide.

- [ ] **Step 3: Update `src/render.js`**

Change the imports line at the top to add `DAYS`:

```js
import { RULE_DEFAULTS, DAYS } from './config.js';
```

Replace the `badge` assignment block inside `dayCardHTML` (the `const badge = isEat ? ... : ...;` lines) with:

```js
  const badge = m.where === 'Either'
    ? `<span class="badge badge-either" aria-hidden="true">${ICONS.pot}</span>`
    : isEat
      ? `<span class="badge badge-eatout" aria-hidden="true">${ICONS.utensils}</span>`
      : `<span class="badge badge-cook" aria-hidden="true">${ICONS.home}</span>`;
```

Add `weekStripHTML` (place it after `dayCardHTML`):

```js
// Compact Mon-Sun strip shown above the detail cards. Each chip jumps to its card.
export function weekStripHTML(plan) {
  if (!plan || !plan.days || plan.days.length === 0) return '';
  const short = (s) => { const t = String(s); return esc(t.length > 11 ? `${t.slice(0, 10)}…` : t); };
  const chips = plan.days.map((d, i) => `
    <button class="ws-chip" data-action="goto-day" data-day="${i}">
      <span class="ws-day">${esc(d.day.slice(0, 3))}</span>
      <span class="ws-meal">${short(d.meal.meal)}</span>
      <span class="ws-cat">${esc(d.meal.category)}</span>
    </button>`).join('');
  return `<div class="week-strip" aria-label="Week overview">${chips}</div>`;
}
```

Replace `evaluateOverride` with the adjacency-based version:

```js
// Inline warning string (empty = no warning) for replacing day `dayIndex` with `meal`.
export function evaluateOverride(plan, dayIndex, meal) {
  const prev = plan.days[dayIndex - 1];
  const next = plan.days[dayIndex + 1];
  const pinned = meal.dealDay === dayIndex;
  if (!pinned && ((prev && prev.meal.category === meal.category)
                  || (next && next.meal.category === meal.category))) {
    return `Heads up: ${meal.category} is on a back-to-back night.`;
  }
  if (meal.where === 'Eat Out') {
    const others = plan.days.filter((_, i) => i !== dayIndex);
    const bought = others.filter((d) => d.mode === 'eatout').length;
    if (bought + 1 > RULE_DEFAULTS.maxEatOut) {
      return `Heads up: that's more than ${RULE_DEFAULTS.maxEatOut} bought nights.`;
    }
  }
  if (meal.dealDay != null && meal.dealDay !== dayIndex) {
    return `Note: ${meal.meal} has a ${DAYS[meal.dealDay]} deal.`;
  }
  return '';
}
```

- [ ] **Step 4: Run, verify pass**

Run: `node --test tests/render.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render.js tests/render.test.js
git commit -m "feat(render): week strip, pot badge for Either, back-to-back override warning

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Markup + styles (`index.html`)

**Files:**
- Modify: `index.html`

No unit test; verified by the manual smoke test in Task 7.

- [ ] **Step 1: Add the week-strip container to the Plan screen**

In `index.html`, inside `#screen-plan`, add a strip container between the `action-row` div and `<div class="cards" id="plan-cards">`:

```html
      <div id="week-strip"></div>
      <div class="cards" id="plan-cards"></div>
```

- [ ] **Step 2: Add a Reload button to the Meals screen**

Replace the Meals screen header block with one that includes a reload button:

```html
    <!-- MEALS -->
    <section id="screen-meals" class="screen" hidden>
      <h1 class="screen-title">Meals</h1>
      <p class="sub">From the shared Google Sheet (read-only)</p>
      <div class="action-row">
        <button class="btn-soft" id="btn-reload-meals">Reload from Sheet</button>
        <span class="reload-note" id="reload-note"></span>
      </div>
      <div id="meals-list"></div>
    </section>
```

- [ ] **Step 3: Add CSS**

Find the `.pill-where{...}` rule and add, immediately after the badge rules (near `.badge-eatout`), an Either badge style. Locate `.badge-eatout{...}` and add on the next line:

```css
    .badge-either{border:1.5px solid rgba(169,185,140,.55); color:var(--sage-leaf)}
```

Then add the week-strip + reload styles near the `.pill` rules (anywhere inside the `<style>` block):

```css
    .week-strip{display:flex; gap:6px; overflow-x:auto; padding:2px 0 12px; -webkit-overflow-scrolling:touch}
    .ws-chip{flex:0 0 auto; min-width:74px; display:flex; flex-direction:column; gap:2px; align-items:flex-start;
      background:var(--surface); border:1px solid var(--surface-line); border-radius:12px; padding:6px 9px;
      color:var(--cream); text-align:left; cursor:pointer; font-family:var(--sans)}
    .ws-day{font-size:.54rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--gold-hi)}
    .ws-meal{font-size:.72rem; font-weight:600; color:var(--cream); white-space:nowrap}
    .ws-cat{font-size:.54rem; color:var(--cream-muted); text-transform:uppercase; letter-spacing:.08em}
    .card.is-flash{outline:2px solid var(--gold); outline-offset:2px}
    .reload-note{font-size:.7rem; color:var(--cream-muted); font-weight:600}
```

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(ui): week-strip container, Reload button, Either badge + strip styles

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: App wiring (`app.js`)

**Files:**
- Modify: `src/app.js`

No unit test; verified in Task 7.

- [ ] **Step 1: Import `weekStripHTML`**

Change the render import line to include `weekStripHTML`:

```js
import { dayCardHTML, shoppingRowHTML, mealRowHTML, evaluateOverride, pickerSheetHTML, weekStripHTML } from './render.js';
```

- [ ] **Step 2: Render the strip in `renderPlan`**

In `renderPlan`, in the empty-plan branch (where `cards.innerHTML` is set to the empty message), also clear the strip — add this line inside that `if` block:

```js
    document.querySelector('#week-strip').innerHTML = '';
```

And after the `cards.innerHTML = ...` line that renders the day cards, add:

```js
  document.querySelector('#week-strip').innerHTML = weekStripHTML(state.plan);
```

- [ ] **Step 3: Wire strip taps to scroll + flash the matching card**

In `wireEvents`, add a listener (next to the other `$('#...').addEventListener` calls):

```js
  $('#week-strip').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-action="goto-day"]');
    if (!chip) return;
    const card = document.querySelector(`.card[data-day="${chip.dataset.day}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('is-flash');
    setTimeout(() => card.classList.remove('is-flash'), 1200);
  });
```

- [ ] **Step 4: Wire the Reload button**

In `wireEvents`, add:

```js
  $('#btn-reload-meals').addEventListener('click', async () => {
    const note = $('#reload-note');
    note.textContent = 'Reloading…';
    try {
      state.meals = await fetchMeals();
      renderMeals();
      note.textContent = `Loaded ${state.meals.length} meals.`;
    } catch {
      note.textContent = 'Could not reach the Sheet.';
    }
  });
```

- [ ] **Step 5: Verify the suite still passes (app.js isn't unit-tested, imports must resolve)**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app.js
git commit -m "feat(app): render week strip with tap-to-jump; Reload-from-Sheet button

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Service worker cache bump (`sw.js`)

**Files:**
- Modify: `sw.js`

- [ ] **Step 1: Bump the cache version**

In `sw.js`, change line 1:

```js
const CACHE = 'dinner-v5';
```

- [ ] **Step 2: Commit**

```bash
git add sw.js
git commit -m "chore(sw): bump cache to dinner-v5 for planning-improvements shell

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Full verification + docs

**Files:**
- Modify: `CHANGELOG.md`, `ROADMAP.md`

- [ ] **Step 1: Run the whole suite**

Run: `npm test`
Expected: PASS, zero failures.

- [ ] **Step 2: Manual smoke test**

Serve and open: `npx http-server -p 8080 .` → `http://localhost:8080/`
Verify:
- **Generate week** → no two consecutive day cards share a category (unless a deal forces it).
- If **Tacos**/**Empanadas** are in the week, they sit on **Tue/Wed** respectively.
- A **week strip** appears above the cards; tapping a chip scrolls to and flashes that card.
- An **Either** meal (e.g. Burgers, Brinner, Indian Chicken, Sushi=Bought…) shows the **pot** badge; Homemade shows the house; Bought shows utensils.
- **Meals tab → Reload from Sheet** re-pulls meals and shows the count; newly added sheet meals appear.

- [ ] **Step 3: Update docs**

In `CHANGELOG.md` `[Unreleased]`, under **Added** add bullets for: no-back-to-back category spacing, deal-day pinning (Special/Sale weekday), the week-at-a-glance strip, the distinct Either (pot) badge, and the Reload-from-Sheet button. Under **Changed** note the generator moved from set-selection to day-slot filling and the override warning is now back-to-back-based. Under **Removed** note `regenerateUnlocked` (dead code) was removed.

In `ROADMAP.md`, remove any now-shipped item this covers (none currently listed map exactly; leave the ingredient-backfill item).

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md ROADMAP.md
git commit -m "docs: record planning improvements (spacing, deal days, week strip, Either icon, reload)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** dealDay parse (T1), adjacency + deal pins + ladder rename + reroll + remove regenerateUnlocked (T2), week strip + pot badge + adjacency warning (T3), markup/CSS/reload button (T4), strip render + tap-to-jump + reload wiring (T5), SW bump (T6), verify + docs (T7). All spec sections mapped.
- **Placeholder scan:** none — every code step is complete.
- **Type consistency:** `Meal` gains `dealDay` (T1) consumed by `generator.js` and `evaluateOverride` (T2/T3). `weekStripHTML(plan)` defined T3, imported/called T5. Badge keyed on `meal.where` (T3) matches the `where` values produced by `model.js`. `goto-day` data-action emitted in T3, handled in T5.
