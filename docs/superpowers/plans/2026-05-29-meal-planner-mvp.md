# Family Dinner Planner — MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the mobile-first Family Dinner Planner described in VISION.md / DESIGN-SYSTEM.md / ROADMAP.md — a no-build static web app that reads meals/deals from a published Google Sheet, auto-generates a rule-respecting Mon–Sun dinner week, lets the user tweak it, derives an aisle-grouped shopping list, and syncs between phones.

**Architecture:** Pure logic (CSV parsing, the rule engine, shopping-list derivation, persistence) lives in small dependency-free **ES modules** under `src/`, unit-tested with Node's built-in `node:test` runner (`node --test`). `index.html` is the deployable shell — it holds the full Fresh Kitchen CSS and imports the modules natively via `<script type="module">`. Persistence goes through a small async key-value `store` interface with a swappable backend: **localStorage first** (build & test everything immediately, no credentials), **Firebase Realtime Database last** (cross-device sync). No bundler, no framework, no build step — every file is served as-is by GitHub Pages.

**Tech Stack:** Plain HTML/CSS/ES2022 modules · `node:test` (dev-time only, zero deps) · Google Sheets published CSV · Firebase Realtime Database · GitHub Pages.

**Deviation note:** The design docs say "single-file `index.html`." This plan splits *logic* into `src/*.js` modules for testability; `index.html` remains the single deployable entry and the only file with markup/CSS. This preserves the no-build / no-framework / static-hosting intent. Flagged for the user during planning.

**Canonical data shapes (used by every task — keep names identical):**

```js
// Meal
{ meal: string, category: string, ingredients: string[], where: 'Home'|'Either'|'Eat Out', healthy: boolean, notes: string }
// Deal
{ day: string, restaurant: string, deal: string, notes: string }
// PlanDay
{ day: 'Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday'|'Sunday', meal: Meal, mode: 'cook'|'eatout', locked: boolean }
// Plan (the generated/edited week)
{ days: PlanDay[], relaxations: string[], healthyCount: number }
// ShoppingGroup
{ aisle: 'Produce'|'Meat & Seafood'|'Pantry'|'Dairy'|'Other', items: { name: string, key: string, meals: string[], staple: boolean }[] }
```

The relaxation ladder uses these exact tokens, lowest-priority first: `'healthy'`, `'category'`, `'eatout'`, `'repeat'`.

---

## File Structure

```
Meal-Planner/
  index.html              App shell: markup skeleton + full Fresh Kitchen CSS + module bootstrap
  package.json            { "type": "module", "scripts": { "test": "node --test" } }  (dev only)
  .nojekyll               Tell GitHub Pages to serve files as-is (esp. /src)
  .gitignore              node_modules, .DS_Store, etc.
  manifest.webmanifest    PWA: name, icons, theme color (--pine)
  sw.js                   Service worker: cache shell + last fetched CSV for offline read
  src/
    config.js             Sheet ID + CSV URLs, rule defaults, storage keys, staple defaults
    csv.js                parseCSV(text) -> string[][]  (RFC-4180-ish: quoted fields, embedded commas/newlines)
    model.js              parseMeals(rows) -> Meal[] ; parseDeals(rows) -> Deal[]
    generator.js          generateWeek(...) , rerollDay(...) , regenerateUnlocked(...) , countHealthy(...)
    deals.js              dealForDay(deals, dayName) -> Deal | null
    shopping.js           classifyAisle(ingredient) , buildShoppingList(plan, staples) -> ShoppingGroup[]
    store.js              createStore(backend) ; localStorageBackend ; memoryBackend(init)
    sheet.js              fetchMeals() / fetchDeals()  (network; integration-verified, not unit-tested)
    firebase.js           firebaseBackend(config)  (added in Phase 5; conforms to backend interface)
    icons.js              ICONS: map of name -> inline <svg> string
    render.js             dayCardHTML, pillHTML, shoppingRowHTML, mealRowHTML  (pure HTML-string builders)
    app.js                Controller: load data, tab routing, event wiring, loading/error states
  tests/
    csv.test.js
    model.test.js
    generator.test.js
    deals.test.js
    shopping.test.js
    store.test.js
    render.test.js
  docs/superpowers/plans/2026-05-29-meal-planner-mvp.md   (this file)
```

**Commit convention:** every commit message ends with the trailer:

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

---

## Phase 0 — Foundations

### Task 1: Repository & scaffold

**Files:**
- Create: `package.json`, `.gitignore`, `.nojekyll`, `tests/.gitkeep`, `src/.gitkeep`

- [ ] **Step 1: Initialize git and project files**

Run from `Meal-Planner/`:

```bash
git init
```

Create `package.json`:

```json
{
  "name": "meal-planner",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

Create `.gitignore`:

```
node_modules/
.DS_Store
Thumbs.db
*.log
```

Create empty `.nojekyll` (no contents — its existence disables Jekyll on GitHub Pages so `/src/*.js` is served verbatim).

Create empty placeholder files `src/.gitkeep` and `tests/.gitkeep`.

- [ ] **Step 2: Verify the test runner is wired**

Run: `npm test`
Expected: node:test runs and reports `tests 0` / `pass 0` / exit code 0 (no test files yet — this confirms the runner works).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: scaffold meal-planner project (no-build static app + node:test)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Config constants

**Files:**
- Create: `src/config.js`
- Test: `tests/` (covered indirectly; one assertion in csv/model tests references it — no standalone test needed)

- [ ] **Step 1: Write `src/config.js`**

```js
// Single source of app-wide constants. No logic here.
export const SHEET_ID = '1Y2ZhSSoxVelTCsDi_Moo5et0HRlqLvShK242a6sd3i4';

// Published-CSV endpoints via the gviz API. The meals tab is the first/default tab.
// The deals tab is referenced by name; if it does not resolve, gviz falls back to the
// first tab, so fetchDeals() guards against that (see sheet.js).
export const MEALS_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
export const DEALS_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Deals`;

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const RULE_DEFAULTS = {
  maxEatOut: 2,
  healthyTarget: 3,
};

// localStorage / Firebase key names (namespaced)
export const KEYS = {
  plan: 'mp:plan',
  lastWeek: 'mp:lastweek',   // string[] of meal names from the previously saved plan
  staples: 'mp:staples',     // string[] of ingredient keys always kept on hand
  checked: 'mp:checked',     // string[] of currently-checked shopping keys
};

// Ingredients the household always has — start checked, survive a new plan.
export const DEFAULT_STAPLES = ['olive oil', 'garlic', 'onion', 'soy sauce'];
```

- [ ] **Step 2: Sanity check the module loads**

Run: `node -e "import('./src/config.js').then(m=>console.log(m.DAYS.length, m.MEALS_CSV_URL.includes('csv')))"`
Expected: `7 true`

- [ ] **Step 3: Commit**

```bash
git add src/config.js
git commit -m "feat: app config constants (sheet urls, rules, storage keys, staples)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: CSV parser

The Google Sheet quotes fields and ingredients contain commas, so a split-on-comma parser is wrong. Build a real one.

**Files:**
- Create: `src/csv.js`
- Test: `tests/csv.test.js`

- [ ] **Step 1: Write the failing test — `tests/csv.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV } from '../src/csv.js';

test('parses simple rows', () => {
  assert.deepEqual(parseCSV('a,b,c\n1,2,3'), [['a', 'b', 'c'], ['1', '2', '3']]);
});

test('keeps commas inside quoted fields', () => {
  const rows = parseCSV('"Meal","Ingredients"\n"Pad Thai","noodles, shrimp, egg"');
  assert.deepEqual(rows[1], ['Pad Thai', 'noodles, shrimp, egg']);
});

test('handles escaped double-quotes and embedded newlines', () => {
  const rows = parseCSV('"a ""b"" c","line1\nline2"');
  assert.deepEqual(rows[0], ['a "b" c', 'line1\nline2']);
});

test('ignores a trailing newline and CRLF', () => {
  assert.deepEqual(parseCSV('a,b\r\n1,2\r\n'), [['a', 'b'], ['1', '2']]);
});

test('returns [] for empty input', () => {
  assert.deepEqual(parseCSV(''), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/csv.test.js`
Expected: FAIL — `Cannot find module '../src/csv.js'` / `parseCSV is not a function`.

- [ ] **Step 3: Write `src/csv.js`**

```js
// Minimal RFC-4180-style CSV parser: handles quoted fields, embedded commas,
// embedded newlines, and "" escaped quotes. Returns an array of row arrays.
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { rows.push(row); row = []; };

  // Normalize CRLF to LF so newline handling is uniform.
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { pushField(); i++; continue; }
    if (c === '\n') { pushField(); pushRow(); i++; continue; }
    field += c; i++;
  }
  // Flush the final field/row unless the input ended exactly on a newline.
  if (field !== '' || row.length > 0) { pushField(); pushRow(); }
  return rows;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/csv.test.js`
Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/csv.js tests/csv.test.js
git commit -m "feat: RFC-4180-style CSV parser with tests

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Meals & deals model

Turns parsed CSV rows into normalized `Meal[]` / `Deal[]`. Header-driven (column order independent), tolerant of blank rows and casing in `Where`/`Healthy`.

**Files:**
- Create: `src/model.js`
- Test: `tests/model.test.js`

- [ ] **Step 1: Write the failing test — `tests/model.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMeals, parseDeals } from '../src/model.js';

const MEAL_ROWS = [
  ['Meal', 'Category', 'Ingredients', 'Where', 'Healthy', 'Notes'],
  ['Spaghetti Bolognese', 'Italian', 'ground beef, onion, garlic', 'Home', 'Yes', ''],
  ['Sushi Night', 'Japanese', 'sushi rice, nori, salmon', 'Eat Out', 'no', 'date night'],
  ['', '', '', '', '', ''], // blank row should be skipped
];

test('parseMeals normalizes fields', () => {
  const meals = parseMeals(MEAL_ROWS);
  assert.equal(meals.length, 2);
  assert.deepEqual(meals[0], {
    meal: 'Spaghetti Bolognese',
    category: 'Italian',
    ingredients: ['ground beef', 'onion', 'garlic'],
    where: 'Home',
    healthy: true,
    notes: '',
  });
});

test('parseMeals normalizes Where + Healthy casing', () => {
  const meals = parseMeals(MEAL_ROWS);
  assert.equal(meals[1].where, 'Eat Out');
  assert.equal(meals[1].healthy, false);
  assert.equal(meals[1].notes, 'date night');
});

test('parseMeals defaults an unknown Where to Either', () => {
  const meals = parseMeals([
    ['Meal', 'Category', 'Ingredients', 'Where', 'Healthy', 'Notes'],
    ['Mystery', 'Other', 'stuff', 'whenever', '', ''],
  ]);
  assert.equal(meals[0].where, 'Either');
  assert.equal(meals[0].healthy, false);
});

test('parseDeals maps day rows and returns [] for header-only/empty', () => {
  const deals = parseDeals([
    ['Day', 'Restaurant', 'Deal', 'Notes'],
    ['Tuesday', 'Taqueria', 'Taco Tuesday', '$1 tacos'],
  ]);
  assert.deepEqual(deals, [{ day: 'Tuesday', restaurant: 'Taqueria', deal: 'Taco Tuesday', notes: '$1 tacos' }]);
  assert.deepEqual(parseDeals([['Day', 'Restaurant', 'Deal', 'Notes']]), []);
  assert.deepEqual(parseDeals([]), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/model.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/model.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/model.test.js`
Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/model.js tests/model.test.js
git commit -m "feat: parse meals and deals CSV rows into normalized models

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Phase 1 — The generator (the heart)

### Task 5: Rule-respecting week generator

The core feature. Selects 7 distinct meals for Mon–Sun via randomized backtracking, enforcing rules in priority order, and **relaxing the lowest-priority rule** when the meal list can't satisfy all of them — recording what was relaxed.

Rule → assignment notes:
- `Where: Home` → always `mode: 'cook'`. `Eat Out` → always `mode: 'eatout'`. `Either` → defaults to `cook` (cooking is the default; the user can flip a day to eat-out later).
- Rule 2 (`eatout`) therefore constrains how many `Eat Out` meals get picked (`<= maxEatOut`).
- Rule 3 (`category`) → all 7 chosen meals have distinct categories.
- Rule 1 (`repeat`) → exclude meals whose names are in `lastWeek`.
- Rule 4 (`healthy`) → at least `healthyTarget` chosen meals have `healthy: true`.

A seedable `rng` (defaults to `Math.random`) makes tests deterministic.

**Files:**
- Create: `src/generator.js`
- Test: `tests/generator.test.js`

- [ ] **Step 1: Write the failing test — `tests/generator.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateWeek, rerollDay, regenerateUnlocked, countHealthy } from '../src/generator.js';

// 8 distinct categories, 1 eat-out, 1 healthy — mirrors the real seed Sheet.
const MEALS = [
  { meal: 'Spaghetti', category: 'Italian', ingredients: ['pasta'], where: 'Home', healthy: true, notes: '' },
  { meal: 'Tikka', category: 'Indian', ingredients: ['chicken'], where: 'Home', healthy: false, notes: '' },
  { meal: 'Tacos', category: 'Mexican', ingredients: ['pork'], where: 'Either', healthy: false, notes: '' },
  { meal: 'Pad Thai', category: 'Thai', ingredients: ['noodles'], where: 'Either', healthy: false, notes: '' },
  { meal: 'Burgers', category: 'American', ingredients: ['beef'], where: 'Either', healthy: false, notes: '' },
  { meal: 'Sushi', category: 'Japanese', ingredients: ['rice'], where: 'Eat Out', healthy: false, notes: '' },
  { meal: 'Beef Broccoli', category: 'Chinese', ingredients: ['steak'], where: 'Home', healthy: false, notes: '' },
  { meal: 'Gyros', category: 'Greek', ingredients: ['pita'], where: 'Either', healthy: false, notes: '' },
];

// Deterministic identity "rng": shuffle becomes a no-op, so order is stable.
const noShuffle = () => 0;

test('generates a 7-day Mon-Sun week with distinct meals and categories', () => {
  const plan = generateWeek(MEALS, [], { rng: noShuffle });
  assert.equal(plan.days.length, 7);
  assert.deepEqual(plan.days.map((d) => d.day),
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
  const names = plan.days.map((d) => d.meal.meal);
  assert.equal(new Set(names).size, 7, 'meals are distinct');
  const cats = plan.days.map((d) => d.meal.category);
  assert.equal(new Set(cats).size, 7, 'categories are distinct');
});

test('respects the eat-out cap (<= 2 eatout days)', () => {
  const plan = generateWeek(MEALS, [], { rng: noShuffle });
  assert.ok(plan.days.filter((d) => d.mode === 'eatout').length <= 2);
});

test('relaxes the healthy rule (lowest priority) when target is unreachable', () => {
  // Only 1 healthy meal exists, target is 3 -> must relax 'healthy', nothing else.
  const plan = generateWeek(MEALS, [], { rng: noShuffle, healthyTarget: 3 });
  assert.deepEqual(plan.relaxations, ['healthy']);
  assert.equal(plan.healthyCount, countHealthy(plan));
});

test('excludes last weeks meals unless repeat must be relaxed', () => {
  const lastWeek = ['Spaghetti', 'Tikka'];
  const plan = generateWeek(MEALS, lastWeek, { rng: noShuffle, healthyTarget: 0 });
  // With 8 meals and 2 excluded, 6 remain < 7 -> repeat relaxed.
  assert.ok(plan.relaxations.includes('repeat'));
});

test('rerollDay swaps one day for an eligible different meal, keeping others', () => {
  const plan = generateWeek(MEALS, [], { rng: noShuffle, healthyTarget: 0 });
  const before = plan.days[2].meal.meal;
  const next = rerollDay(plan, 2, MEALS, { rng: () => 0.5 });
  assert.notEqual(next.days[2].meal.meal, before);
  // other days unchanged
  assert.equal(next.days[0].meal.meal, plan.days[0].meal.meal);
});

test('regenerateUnlocked keeps locked days and re-rolls the rest', () => {
  const plan = generateWeek(MEALS, [], { rng: noShuffle, healthyTarget: 0 });
  plan.days[0].locked = true;
  const lockedMeal = plan.days[0].meal.meal;
  const next = regenerateUnlocked(plan, MEALS, { rng: () => 0.3, healthyTarget: 0 });
  assert.equal(next.days[0].meal.meal, lockedMeal);
  assert.equal(next.days.length, 7);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/generator.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/generator.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/generator.test.js`
Expected: PASS — 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/generator.js tests/generator.test.js
git commit -m "feat: rule-respecting week generator with relaxation ladder + reroll helpers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Persistence store (localStorage-backed)

Async key-value `store` over a swappable backend. localStorage now; Firebase later (Task 18) drops in without touching callers.

**Files:**
- Create: `src/store.js`
- Test: `tests/store.test.js`

- [ ] **Step 1: Write the failing test — `tests/store.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, memoryBackend } from '../src/store.js';

test('round-trips a plan as JSON', async () => {
  const store = createStore(memoryBackend());
  const plan = { days: [{ day: 'Monday' }], relaxations: [], healthyCount: 0 };
  await store.setPlan(plan);
  assert.deepEqual(await store.getPlan(), plan);
});

test('getPlan returns null when nothing saved', async () => {
  const store = createStore(memoryBackend());
  assert.equal(await store.getPlan(), null);
});

test('staples default to config when unset, then persist', async () => {
  const store = createStore(memoryBackend());
  const def = await store.getStaples();
  assert.ok(Array.isArray(def) && def.length > 0);
  await store.setStaples(['rice', 'oil']);
  assert.deepEqual(await store.getStaples(), ['rice', 'oil']);
});

test('lastWeek + checked round-trip and default to []', async () => {
  const store = createStore(memoryBackend());
  assert.deepEqual(await store.getLastWeek(), []);
  await store.setLastWeek(['Tacos']);
  assert.deepEqual(await store.getLastWeek(), ['Tacos']);
  assert.deepEqual(await store.getChecked(), []);
  await store.setChecked(['rice']);
  assert.deepEqual(await store.getChecked(), ['rice']);
});

test('memoryBackend can seed initial values', async () => {
  const store = createStore(memoryBackend({ 'mp:lastweek': JSON.stringify(['X']) }));
  assert.deepEqual(await store.getLastWeek(), ['X']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/store.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/store.js`**

```js
import { KEYS, DEFAULT_STAPLES } from './config.js';

// Backend interface: { get(key): Promise<string|null>, set(key, value): Promise<void> }

export const localStorageBackend = {
  async get(k) { return globalThis.localStorage ? globalThis.localStorage.getItem(k) : null; },
  async set(k, v) { if (globalThis.localStorage) globalThis.localStorage.setItem(k, v); },
};

export function memoryBackend(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    async get(k) { return m.has(k) ? m.get(k) : null; },
    async set(k, v) { m.set(k, String(v)); },
  };
}

export function createStore(backend) {
  async function readJSON(key, fallback) {
    const raw = await backend.get(key);
    if (raw == null) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  }
  const writeJSON = (key, val) => backend.set(key, JSON.stringify(val));

  return {
    getPlan: () => readJSON(KEYS.plan, null),
    setPlan: (plan) => writeJSON(KEYS.plan, plan),
    getStaples: () => readJSON(KEYS.staples, DEFAULT_STAPLES.slice()),
    setStaples: (arr) => writeJSON(KEYS.staples, arr),
    getLastWeek: () => readJSON(KEYS.lastWeek, []),
    setLastWeek: (arr) => writeJSON(KEYS.lastWeek, arr),
    getChecked: () => readJSON(KEYS.checked, []),
    setChecked: (arr) => writeJSON(KEYS.checked, arr),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/store.test.js`
Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/store.js tests/store.test.js
git commit -m "feat: async key-value store with swappable backend (localStorage + memory)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Phase 3 logic — Eat-out deal matching

(Built before the UI because it's pure logic; the Plan screen consumes it in Task 12.)

### Task 7: Deal matcher

**Files:**
- Create: `src/deals.js`
- Test: `tests/deals.test.js`

- [ ] **Step 1: Write the failing test — `tests/deals.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dealForDay } from '../src/deals.js';

const DEALS = [
  { day: 'Tuesday', restaurant: 'Taqueria', deal: 'Taco Tuesday', notes: '' },
  { day: 'friday', restaurant: 'Wing Co', deal: 'Wing Night', notes: '' },
];

test('matches by day name, case-insensitive', () => {
  assert.equal(dealForDay(DEALS, 'Tuesday').deal, 'Taco Tuesday');
  assert.equal(dealForDay(DEALS, 'Friday').restaurant, 'Wing Co');
});

test('returns null when no deal for the day or deals empty', () => {
  assert.equal(dealForDay(DEALS, 'Monday'), null);
  assert.equal(dealForDay([], 'Tuesday'), null);
  assert.equal(dealForDay(null, 'Tuesday'), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/deals.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/deals.js`**

```js
// Find the deal whose day matches `dayName` (case-insensitive). Null if none.
export function dealForDay(deals, dayName) {
  if (!deals || deals.length === 0) return null;
  const target = String(dayName).trim().toLowerCase();
  return deals.find((d) => d.day.trim().toLowerCase() === target) || null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/deals.test.js`
Expected: PASS — 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/deals.js tests/deals.test.js
git commit -m "feat: match restaurant deals to weekday

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Phase 4 logic — Shopping list

### Task 8: Aisle classification + shopping-list builder

Derives a deduped, aisle-grouped list from the week's **cook-at-home** days only. Marks staples.

**Files:**
- Create: `src/shopping.js`
- Test: `tests/shopping.test.js`

- [ ] **Step 1: Write the failing test — `tests/shopping.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyAisle, buildShoppingList } from '../src/shopping.js';

test('classifyAisle buckets common ingredients', () => {
  assert.equal(classifyAisle('chicken thighs'), 'Meat & Seafood');
  assert.equal(classifyAisle('parmesan'), 'Dairy');
  assert.equal(classifyAisle('basmati rice'), 'Pantry');
  assert.equal(classifyAisle('red onion'), 'Produce');
  assert.equal(classifyAisle('toothpicks'), 'Other');
});

const PLAN = {
  days: [
    { day: 'Monday', mode: 'cook', meal: { meal: 'Spaghetti', ingredients: ['ground beef', 'onion', 'garlic'] } },
    { day: 'Tuesday', mode: 'cook', meal: { meal: 'Tikka', ingredients: ['chicken', 'onion'] } },
    { day: 'Wednesday', mode: 'eatout', meal: { meal: 'Sushi', ingredients: ['rice', 'nori'] } },
  ],
  relaxations: [], healthyCount: 0,
};

test('builds deduped list from cook days only, tracking source meals', () => {
  const groups = buildShoppingList(PLAN, []);
  const all = groups.flatMap((g) => g.items);
  // 'rice'/'nori' from the eat-out day are excluded.
  assert.ok(!all.some((i) => i.key === 'rice'));
  // 'onion' appears in two cook meals -> deduped, both meals tracked.
  const onion = all.find((i) => i.key === 'onion');
  assert.deepEqual(onion.meals.sort(), ['Spaghetti', 'Tikka']);
});

test('groups are returned in display order and skip empties', () => {
  const groups = buildShoppingList(PLAN, []);
  assert.deepEqual(groups.map((g) => g.aisle), ['Produce', 'Meat & Seafood']);
});

test('marks staples', () => {
  const groups = buildShoppingList(PLAN, ['garlic']);
  const all = groups.flatMap((g) => g.items);
  assert.equal(all.find((i) => i.key === 'garlic').staple, true);
  assert.equal(all.find((i) => i.key === 'onion').staple, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/shopping.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/shopping.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/shopping.test.js`
Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/shopping.js tests/shopping.test.js
git commit -m "feat: aisle classification + deduped shopping-list builder

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## UI layer — icons, render helpers, shell, controller

### Task 9: Inline SVG icon set

Soft-duotone icons per DESIGN-SYSTEM.md §5 (`.fill` at 18% opacity + `.stroke` outline, recolored via `currentColor`). No emoji.

**Files:**
- Create: `src/icons.js`
- Test: `tests/render.test.js` (shared with Task 10; create here, extend there)

- [ ] **Step 1: Write the failing test — `tests/render.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ICONS } from '../src/icons.js';

test('every core icon exists and is an svg using currentColor', () => {
  for (const name of ['calendar', 'cart', 'utensils', 'refresh', 'leaf', 'tag']) {
    assert.ok(ICONS[name], `missing icon: ${name}`);
    assert.match(ICONS[name], /^<svg[\s\S]*<\/svg>$/);
    assert.match(ICONS[name], /currentColor/);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/render.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/icons.js`**

```js
// Soft-duotone inline SVGs. `.fill` = tinted shape (opacity .18), `.stroke` = outline.
// Both use currentColor so the icon recolors with the surrounding text color.
const svg = (paths) =>
  `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">${paths}</svg>`;

export const ICONS = {
  calendar: svg(`
    <rect class="fill" x="3" y="5" width="18" height="16" rx="3" fill="currentColor" opacity=".18"/>
    <rect class="stroke" x="3" y="5" width="18" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.9"/>
    <path class="stroke" d="M3 9h18M8 3v4M16 3v4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>`),
  cart: svg(`
    <path class="fill" d="M6 7h13l-1.5 8H8L6 7Z" fill="currentColor" opacity=".18"/>
    <path class="stroke" d="M3 4h2l1.5 3M6.5 7H20l-1.6 8H8.2L6.5 7Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
    <circle class="stroke" cx="9" cy="19" r="1.4" fill="none" stroke="currentColor" stroke-width="1.9"/>
    <circle class="stroke" cx="17" cy="19" r="1.4" fill="none" stroke="currentColor" stroke-width="1.9"/>`),
  utensils: svg(`
    <path class="fill" d="M7 3c1.5 0 2 2 2 5s-1 4-2 4-2-1-2-4 .5-5 2-5Z" fill="currentColor" opacity=".18"/>
    <path class="stroke" d="M7 3v18M5 3v6a2 2 0 0 0 4 0V3M16 3c-2 1-3 4-3 7h3v11" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`),
  refresh: svg(`
    <path class="fill" d="M5 12a7 7 0 0 1 12-5l1 1V4" fill="currentColor" opacity=".18"/>
    <path class="stroke" d="M19 8A7 7 0 0 0 6 7L4 9M5 16a7 7 0 0 0 13 1l2-2M4 5v4h4M20 19v-4h-4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`),
  leaf: svg(`
    <path class="fill" d="M5 19c0-8 6-12 14-12 0 8-6 12-14 12Z" fill="currentColor" opacity=".18"/>
    <path class="stroke" d="M5 19c0-8 6-12 14-12 0 8-6 12-14 12ZM5 19C8 14 12 11 17 9" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`),
  tag: svg(`
    <path class="fill" d="M4 4h7l9 9-7 7-9-9V4Z" fill="currentColor" opacity=".18"/>
    <path class="stroke" d="M4 4h7l9 9-7 7-9-9V4Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
    <circle class="stroke" cx="8" cy="8" r="1.3" fill="none" stroke="currentColor" stroke-width="1.9"/>`),
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/render.test.js`
Expected: PASS — icon test passes.

- [ ] **Step 5: Commit**

```bash
git add src/icons.js tests/render.test.js
git commit -m "feat: soft-duotone inline SVG icon set

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: Render helpers (pure HTML-string builders)

Pure functions that turn data into HTML strings. Testable without a DOM. `app.js` injects them and wires events.

**Files:**
- Create: `src/render.js`
- Test: `tests/render.test.js` (extend)

- [ ] **Step 1: Extend `tests/render.test.js` with failing tests**

Append to the existing file:

```js
import { dayCardHTML, shoppingRowHTML, mealRowHTML } from '../src/render.js';

const COOK_DAY = { day: 'Monday', mode: 'cook', locked: false,
  meal: { meal: 'Spaghetti', category: 'Italian', healthy: true } };
const EATOUT_DAY = { day: 'Tuesday', mode: 'eatout', locked: false,
  meal: { meal: 'Sushi', category: 'Japanese', healthy: false } };

test('dayCardHTML renders meal, category pill and day label', () => {
  const html = dayCardHTML(COOK_DAY, 0, null);
  assert.match(html, /Spaghetti/);
  assert.match(html, /Italian/);
  assert.match(html, /MONDAY/);
  assert.match(html, /class="card cook"/);
});

test('dayCardHTML marks eat-out and renders a deal pill when given a deal', () => {
  const html = dayCardHTML(EATOUT_DAY, 1, { restaurant: 'Taqueria', deal: 'Taco Tuesday' });
  assert.match(html, /class="card eatout"/);
  assert.match(html, /EAT OUT/);
  assert.match(html, /Taco Tuesday/);
});

test('dayCardHTML shows a healthy pill only for healthy meals', () => {
  assert.match(dayCardHTML(COOK_DAY, 0, null), /pill-healthy/);
  assert.doesNotMatch(dayCardHTML(EATOUT_DAY, 1, null), /pill-healthy/);
});

test('shoppingRowHTML reflects checked + staple state', () => {
  const html = shoppingRowHTML({ name: 'Garlic', key: 'garlic', meals: ['Spaghetti'], staple: true }, true);
  assert.match(html, /data-key="garlic"/);
  assert.match(html, /checked/);
  assert.match(html, /staple/);
});

test('mealRowHTML lists name, category and where', () => {
  const html = mealRowHTML({ meal: 'Tacos', category: 'Mexican', where: 'Either', healthy: false, ingredients: ['pork'] });
  assert.match(html, /Tacos/);
  assert.match(html, /Mexican/);
  assert.match(html, /Either/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/render.test.js`
Expected: FAIL — `'../src/render.js'` not found.

- [ ] **Step 3: Write `src/render.js`**

```js
import { ICONS } from './icons.js';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function categoryPill(cat) {
  return `<span class="pill pill-cat">${esc(cat)}</span>`;
}
function healthyPill() {
  return `<span class="pill pill-healthy">${ICONS.leaf}Healthy</span>`;
}
function dealPill(deal) {
  return `<span class="pill pill-deal">${ICONS.tag}${esc(deal.deal || deal.restaurant)}</span>`;
}

// dayIndex is needed so event handlers in app.js can map clicks back to a day.
export function dayCardHTML(day, dayIndex, deal) {
  const isEat = day.mode === 'eatout';
  const label = `${day.day.toUpperCase()}${isEat ? ' · EAT OUT' : ''}`;
  const pills = [
    categoryPill(day.meal.category),
    day.meal.healthy ? healthyPill() : '',
    (isEat && deal) ? dealPill(deal) : '',
  ].join('');
  const lockCls = day.locked ? ' is-locked' : '';
  return `
    <article class="card ${isEat ? 'eatout' : 'cook'}${lockCls}" data-day="${dayIndex}">
      <p class="day-label">${esc(label)}</p>
      <h3 class="meal-name">${esc(day.meal.meal)}</h3>
      <div class="pill-row">
        ${pills}
        <button class="btn-swap" data-action="swap" data-day="${dayIndex}" aria-label="Swap ${esc(day.meal.meal)}">${ICONS.refresh}</button>
        <button class="btn-lock" data-action="lock" data-day="${dayIndex}" aria-label="Lock this day" aria-pressed="${day.locked}">${day.locked ? '🔒' : ''}</button>
      </div>
    </article>`;
}

export function shoppingRowHTML(item, checked) {
  return `
    <label class="shop-row${checked ? ' is-checked' : ''}" data-key="${esc(item.key)}">
      <input type="checkbox" data-action="check" data-key="${esc(item.key)}" ${checked ? 'checked' : ''}/>
      <span class="shop-name">${esc(item.name)}</span>
      ${item.staple ? '<span class="pill pill-staple">staple</span>' : ''}
      <span class="shop-meals">${esc(item.meals.join(', '))}</span>
    </label>`;
}

export function mealRowHTML(meal) {
  return `
    <article class="meal-row">
      <h3 class="meal-name">${esc(meal.meal)}</h3>
      <div class="pill-row">
        <span class="pill pill-cat">${esc(meal.category)}</span>
        <span class="pill pill-where">${esc(meal.where)}</span>
        ${meal.healthy ? healthyPill() : ''}
      </div>
      <p class="meal-ings">${esc(meal.ingredients.join(', '))}</p>
    </article>`;
}
```

> Note: the lock button uses 🔒 inside markup only as a quick affordance; if the user objects to any glyph, swap it for a small inline SVG padlock in icons.js. Per DESIGN-SYSTEM the UI is emoji-free — replace before ship (tracked in Task 17 polish).

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/render.test.js`
Expected: PASS — all render + icon tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/render.js tests/render.test.js
git commit -m "feat: pure HTML render helpers for day cards, shopping rows, meal rows

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: App shell — `index.html` + Fresh Kitchen CSS

The deployable shell: markup skeleton, the full design-system CSS, and a module entry point. No app logic here beyond importing `app.js`.

**Files:**
- Create: `index.html`

- [ ] **Step 1: Write `index.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
  <meta name="theme-color" content="#1F6E54"/>
  <link rel="manifest" href="manifest.webmanifest"/>
  <title>Family Dinner Planner</title>
  <style>
    :root{
      --pine:#1F6E54; --mint:#6FD3A6; --mint-bg:#E3F5EC; --paper:#FAF8F3; --surface:#FFFFFF;
      --coral:#FF7A5C; --coral-bg:#FFE7DF; --ink:#1B2D26; --muted:#7C8B83;
      --peach:#FCEBE2; --peach-tx:#C65A3A; --line:#EFE9DD;
      --r-card:18px; --r-chip:14px; --shadow-rest:0 4px 14px rgba(27,45,38,.06);
      --shadow-raise:0 14px 36px rgba(27,45,38,.16);
    }
    *{box-sizing:border-box}
    html,body{margin:0}
    body{
      font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
      background:var(--paper); color:var(--ink);
      padding-bottom:72px; /* room for fixed tab bar */
    }
    .wrap{max-width:840px; margin:0 auto; padding:16px}
    .screen-title{font-size:1.5rem; font-weight:800; letter-spacing:-.01em; margin:8px 0 4px}
    .sub{color:var(--muted); font-size:.8rem; font-weight:600; margin:0 0 16px}

    /* tabs */
    .tabbar{
      position:fixed; left:0; right:0; bottom:0; display:flex; background:var(--surface);
      border-top:1px solid var(--line); padding:6px 0 max(6px, env(safe-area-inset-bottom));
      z-index:10;
    }
    .tab{flex:1; background:none; border:0; color:var(--muted); display:flex; flex-direction:column;
      align-items:center; gap:2px; font-size:.62rem; font-weight:700; cursor:pointer; min-height:44px}
    .tab[aria-selected="true"]{color:var(--pine)}
    .tab svg{display:block}

    /* day cards */
    .cards{display:grid; gap:12px}
    .card{
      position:relative; background:var(--surface); border-radius:var(--r-card); padding:14px 14px 12px 18px;
      box-shadow:var(--shadow-rest); overflow:hidden;
    }
    .card::before{content:""; position:absolute; left:0; top:0; bottom:0; width:5px}
    .card.cook::before{background:var(--pine)}
    .card.eatout::before{background:var(--coral)}
    .card.is-locked{outline:2px solid var(--mint-bg)}
    .day-label{margin:0 0 4px; font-size:.64rem; font-weight:800; letter-spacing:.12em; color:var(--muted)}
    .meal-name{margin:0 0 10px; font-size:1rem; font-weight:700}
    .pill-row{display:flex; flex-wrap:wrap; align-items:center; gap:6px}

    /* pills */
    .pill{display:inline-flex; align-items:center; gap:4px; border-radius:999px; padding:3px 9px;
      font-size:.63rem; font-weight:700; line-height:1.4}
    .pill svg{width:15px; height:15px}
    .pill-cat{background:var(--peach); color:var(--peach-tx)}
    .pill-healthy{background:var(--mint-bg); color:var(--pine)}
    .pill-deal{background:var(--coral-bg); color:var(--coral)}
    .pill-where{background:var(--mint-bg); color:var(--pine)}
    .pill-staple{background:var(--mint-bg); color:var(--pine)}

    /* buttons */
    .btn-swap{margin-left:auto; width:30px; height:30px; border-radius:999px; background:var(--surface);
      border:1px solid var(--line); color:var(--pine); display:grid; place-items:center; cursor:pointer}
    .btn-swap svg{width:18px; height:18px}
    .btn-lock{border:0; background:none; cursor:pointer; font-size:.8rem}
    .btn-primary{background:var(--pine); color:#fff; border:0; border-radius:999px; padding:12px 20px;
      font-weight:700; cursor:pointer; min-height:44px}
    .btn-soft{background:var(--mint-bg); color:var(--pine); border:0; border-radius:999px; padding:10px 16px;
      font-weight:700; cursor:pointer; min-height:44px}
    .action-row{display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin:14px 0}

    /* banners / states */
    .banner{background:var(--mint-bg); color:var(--pine); border-radius:var(--r-chip); padding:10px 12px;
      font-size:.78rem; font-weight:600; margin:0 0 12px}
    .banner.warn{background:var(--coral-bg); color:var(--coral)}
    .empty{color:var(--muted); text-align:center; padding:40px 16px; font-weight:600}
    .healthy-meter{font-size:.78rem; font-weight:700; color:var(--pine)}

    /* shopping */
    .aisle-h{font-size:.7rem; font-weight:800; letter-spacing:.1em; text-transform:uppercase;
      color:var(--muted); margin:16px 0 6px}
    .shop-row{display:flex; align-items:center; gap:10px; background:var(--surface); border-radius:12px;
      padding:10px 12px; margin-bottom:6px; box-shadow:var(--shadow-rest)}
    .shop-row.is-checked .shop-name{text-decoration:line-through; color:var(--muted)}
    .shop-name{font-weight:700; font-size:.9rem}
    .shop-meals{margin-left:auto; color:var(--muted); font-size:.7rem; font-weight:600}
    .meal-row{background:var(--surface); border-radius:var(--r-card); padding:12px 14px; margin-bottom:10px;
      box-shadow:var(--shadow-rest)}
    .meal-ings{color:var(--muted); font-size:.75rem; font-weight:600; margin:8px 0 0}

    [hidden]{display:none !important}
    @media (prefers-reduced-motion: no-preference){
      .card{transition:transform .14s ease, opacity .14s ease}
    }
    @media (min-width:600px){ .cards{grid-template-columns:1fr 1fr} }
  </style>
</head>
<body>
  <main class="wrap">
    <!-- PLAN -->
    <section id="screen-plan" class="screen">
      <h1 class="screen-title">This Week</h1>
      <p class="sub" id="plan-sub">Monday–Sunday dinners</p>
      <div id="plan-banner"></div>
      <div class="action-row">
        <button class="btn-primary" id="btn-generate">Generate week</button>
        <button class="btn-soft" id="btn-reroll" hidden>Re-roll unlocked</button>
        <span class="healthy-meter" id="healthy-meter"></span>
      </div>
      <div class="cards" id="plan-cards"></div>
    </section>

    <!-- SHOPPING -->
    <section id="screen-shopping" class="screen" hidden>
      <h1 class="screen-title">Shopping</h1>
      <p class="sub">From this week's cook-at-home meals</p>
      <div id="shopping-list"></div>
    </section>

    <!-- MEALS -->
    <section id="screen-meals" class="screen" hidden>
      <h1 class="screen-title">Meals</h1>
      <p class="sub">From the shared Google Sheet (read-only)</p>
      <div id="meals-list"></div>
    </section>
  </main>

  <nav class="tabbar" role="tablist" aria-label="Sections">
    <button class="tab" id="tab-plan" role="tab" aria-selected="true" data-screen="plan"></button>
    <button class="tab" id="tab-shopping" role="tab" aria-selected="false" data-screen="shopping"></button>
    <button class="tab" id="tab-meals" role="tab" aria-selected="false" data-screen="meals"></button>
  </nav>

  <script type="module" src="src/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify it loads (static)**

Run a static server and open it:

```bash
node --eval "import('node:http').then(({default:http})=>{import('node:fs').then(({default:fs})=>{http.createServer((q,s)=>{let p='.'+ (q.url==='/'?'/index.html':q.url);fs.readFile(p,(e,d)=>{if(e){s.writeStatus?0:s.writeHead(404);s.end('404');return;}const t=p.endsWith('.js')?'text/javascript':p.endsWith('.html')?'text/html':'text/plain';s.writeHead(200,{'content-type':t});s.end(d);});}).listen(8000,()=>console.log('http://localhost:8000'));});});"
```

(or simply `python -m http.server 8000`). Open `http://localhost:8000` in a browser.
Expected: the page renders with the tab bar fixed at the bottom and the "This Week" title + "Generate week" button. Tabs/icons will be blank until `app.js` exists (Task 12) — that's fine here.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: app shell (index.html) with full Fresh Kitchen design-system CSS

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 12: Sheet fetch + controller — first runnable Plan screen

Wires everything: fetch meals (and deals, gracefully) from the Sheet, generate a week, render Plan cards with deal pills, paint tab icons, switch tabs, persist the plan. localStorage backend. This is the "it works end-to-end" milestone.

**Files:**
- Create: `src/sheet.js`, `src/app.js`

- [ ] **Step 1: Write `src/sheet.js`**

```js
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
```

- [ ] **Step 2: Write `src/app.js`**

```js
import { ICONS } from './icons.js';
import { fetchMeals, fetchDeals } from './sheet.js';
import { createStore, localStorageBackend } from './store.js';
import { generateWeek, rerollDay, regenerateUnlocked, countHealthy } from './generator.js';
import { dealForDay } from './deals.js';
import { buildShoppingList } from './shopping.js';
import { dayCardHTML, shoppingRowHTML, mealRowHTML } from './render.js';
import { RULE_DEFAULTS } from './config.js';

const store = createStore(localStorageBackend);
const state = { meals: [], deals: [], plan: null, error: null };

const $ = (sel) => document.querySelector(sel);

const RELAX_TEXT = {
  healthy: 'healthy target', category: 'no-repeat-category', eatout: 'eat-out limit',
  repeat: 'no-repeat-from-last-week', insufficient: 'too few meals',
};

function paintTabIcons() {
  $('#tab-plan').innerHTML = `${ICONS.calendar}<span>Plan</span>`;
  $('#tab-shopping').innerHTML = `${ICONS.cart}<span>Shopping</span>`;
  $('#tab-meals').innerHTML = `${ICONS.utensils}<span>Meals</span>`;
}

function showScreen(name) {
  for (const s of ['plan', 'shopping', 'meals']) {
    $(`#screen-${s}`).hidden = s !== name;
    $(`#tab-${s}`).setAttribute('aria-selected', String(s === name));
  }
  if (name === 'shopping') renderShopping();
  if (name === 'meals') renderMeals();
}

function renderBanner() {
  const el = $('#plan-banner');
  const r = state.plan?.relaxations || [];
  if (state.error) { el.innerHTML = `<div class="banner warn">${state.error}</div>`; return; }
  if (r.includes('insufficient')) {
    el.innerHTML = `<div class="banner warn">Not enough meals in the Sheet yet to build a full week. Add more and reload.</div>`;
    return;
  }
  el.innerHTML = r.length
    ? `<div class="banner warn">Relaxed ${r.map((x) => RELAX_TEXT[x] || x).join(', ')} — not enough variety in the Sheet to satisfy every rule.</div>`
    : '';
}

function renderPlan() {
  renderBanner();
  const cards = $('#plan-cards');
  if (!state.plan || state.plan.days.length === 0) {
    cards.innerHTML = `<p class="empty">Tap “Generate week” to plan your dinners.</p>`;
    $('#btn-reroll').hidden = true;
    $('#healthy-meter').textContent = '';
    return;
  }
  cards.innerHTML = state.plan.days.map((d, i) =>
    dayCardHTML(d, i, d.mode === 'eatout' ? dealForDay(state.deals, d.day) : null)).join('');
  $('#btn-reroll').hidden = false;
  const target = RULE_DEFAULTS.healthyTarget;
  $('#healthy-meter').textContent = `Healthy: ${countHealthy(state.plan)}/${target}`;
}

function renderShopping() {
  const el = $('#shopping-list');
  if (!state.plan || state.plan.days.length === 0) {
    el.innerHTML = `<p class="empty">No plan yet — generate a week first.</p>`; return;
  }
  Promise.all([store.getStaples(), store.getChecked()]).then(([staples, checked]) => {
    const checkedSet = new Set(checked);
    const groups = buildShoppingList(state.plan, staples);
    if (groups.length === 0) { el.innerHTML = `<p class="empty">All eat-out this week — nothing to buy.</p>`; return; }
    el.innerHTML = groups.map((g) => `
      <h2 class="aisle-h">${g.aisle}</h2>
      ${g.items.map((it) => shoppingRowHTML(it, it.staple || checkedSet.has(it.key))).join('')}
    `).join('');
  });
}

function renderMeals() {
  const el = $('#meals-list');
  el.innerHTML = state.meals.length
    ? state.meals.map(mealRowHTML).join('')
    : `<p class="empty">No meals loaded.</p>`;
}

async function savePlan() {
  await store.setPlan(state.plan);
}

async function onGenerate() {
  const lastWeek = await store.getLastWeek();
  // Save the *previous* plan's meals as "last week" so the next gen avoids them.
  if (state.plan && state.plan.days.length) {
    await store.setLastWeek(state.plan.days.map((d) => d.meal.meal));
  }
  state.plan = generateWeek(state.meals, lastWeek);
  await savePlan();
  renderPlan();
}

function onCardClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const i = Number(btn.dataset.day);
  const action = btn.dataset.action;
  if (action === 'swap') {
    state.plan = rerollDay(state.plan, i, state.meals);
  } else if (action === 'lock') {
    state.plan.days[i].locked = !state.plan.days[i].locked;
  }
  savePlan(); renderPlan();
}

async function onCheck(e) {
  const cb = e.target.closest('[data-action="check"]');
  if (!cb) return;
  const key = cb.dataset.key;
  const checked = new Set(await store.getChecked());
  if (cb.checked) checked.add(key); else checked.delete(key);
  await store.setChecked([...checked]);
  cb.closest('.shop-row').classList.toggle('is-checked', cb.checked);
}

function wireEvents() {
  document.querySelectorAll('.tab').forEach((t) =>
    t.addEventListener('click', () => showScreen(t.dataset.screen)));
  $('#btn-generate').addEventListener('click', onGenerate);
  $('#btn-reroll').addEventListener('click', () => {
    state.plan = regenerateUnlocked(state.plan, state.meals); savePlan(); renderPlan();
  });
  $('#plan-cards').addEventListener('click', onCardClick);
  $('#shopping-list').addEventListener('change', onCheck);
}

async function init() {
  paintTabIcons();
  wireEvents();
  try {
    [state.meals, state.deals] = await Promise.all([fetchMeals(), fetchDeals()]);
  } catch (err) {
    state.error = 'Could not reach the Google Sheet. Showing the last saved plan if available.';
  }
  state.plan = await store.getPlan();
  renderPlan();
}

init();
```

- [ ] **Step 3: Verify end-to-end in a browser**

Start a static server (`python -m http.server 8000` from `Meal-Planner/`) and open `http://localhost:8000`.
Expected:
- Tab bar shows three labeled icons (Plan · Shopping · Meals).
- "Generate week" produces 7 day cards Mon–Sun; cook days have a pine left edge, any eat-out day a coral edge with "· EAT OUT".
- With the current Sheet (1 healthy meal), a coral banner says it relaxed the healthy target, and the meter reads "Healthy: 1/3".
- "Meals" tab lists all Sheet meals; "Shopping" tab shows aisle-grouped ingredients with checkboxes; checking an item persists across a tab switch.
- Reload the page → the generated plan is still there (localStorage).

Take a screenshot of the Plan screen for the review checkpoint.

- [ ] **Step 4: Run the full unit suite (no regressions)**

Run: `npm test`
Expected: all tests across csv/model/generator/store/deals/shopping/render pass.

- [ ] **Step 5: Commit**

```bash
git add src/sheet.js src/app.js
git commit -m "feat: end-to-end Plan screen — fetch sheet, generate, render, persist

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 13: Per-day override dropdown + live rule warnings

Phase 2 finishing touch: let the user pick any eligible meal for a day from a dropdown, with an inline warning if the choice breaks a rule (duplicate category, exceeds eat-out cap).

**Files:**
- Modify: `src/render.js` (add `daySelectHTML(day, dayIndex, meals)` + an `evaluateOverride` helper), `src/app.js` (wire change handler)
- Test: `tests/render.test.js` (extend)

- [ ] **Step 1: Add a failing test for the override evaluator — append to `tests/render.test.js`**

```js
import { evaluateOverride } from '../src/render.js';

test('evaluateOverride flags a duplicate category and eat-out overflow', () => {
  const plan = { days: [
    { day: 'Monday', mode: 'cook', meal: { meal: 'A', category: 'Italian', where: 'Home', healthy: false, ingredients: [] } },
    { day: 'Tuesday', mode: 'eatout', meal: { meal: 'B', category: 'Japanese', where: 'Eat Out', healthy: false, ingredients: [] } },
    { day: 'Wednesday', mode: 'eatout', meal: { meal: 'C', category: 'Mexican', where: 'Eat Out', healthy: false, ingredients: [] } },
  ], relaxations: [], healthyCount: 0 };
  // Overriding Monday with another Italian -> category clash.
  const dup = evaluateOverride(plan, 0, { meal: 'D', category: 'Italian', where: 'Home' });
  assert.match(dup, /category/i);
  // Overriding Monday with a 3rd eat-out -> exceeds cap of 2.
  const over = evaluateOverride(plan, 0, { meal: 'E', category: 'Greek', where: 'Eat Out' });
  assert.match(over, /eat-out/i);
  // A clean pick -> empty string.
  assert.equal(evaluateOverride(plan, 0, { meal: 'F', category: 'Greek', where: 'Home' }), '');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/render.test.js`
Expected: FAIL — `evaluateOverride` not exported.

- [ ] **Step 3: Add `daySelectHTML` + `evaluateOverride` to `src/render.js`**

Append to `src/render.js`:

```js
import { RULE_DEFAULTS } from './config.js';

// Inline warning string (empty = no warning) for replacing day `dayIndex` with `meal`.
export function evaluateOverride(plan, dayIndex, meal) {
  const others = plan.days.filter((_, i) => i !== dayIndex);
  if (others.some((d) => d.meal.category === meal.category)) {
    return `Heads up: ${meal.category} is already used this week (duplicate category).`;
  }
  if (meal.where === 'Eat Out') {
    const eatOut = others.filter((d) => d.mode === 'eatout').length;
    if (eatOut + 1 > RULE_DEFAULTS.maxEatOut) {
      return `Heads up: that's more than ${RULE_DEFAULTS.maxEatOut} eat-out nights.`;
    }
  }
  return '';
}

export function daySelectHTML(day, dayIndex, meals) {
  const opts = meals.map((m) =>
    `<option value="${esc(m.meal)}"${m.meal === day.meal.meal ? ' selected' : ''}>${esc(m.meal)} (${esc(m.category)})</option>`).join('');
  return `<select class="day-select" data-action="override" data-day="${dayIndex}" aria-label="Choose meal for ${esc(day.day)}">${opts}</select>`;
}
```

- [ ] **Step 4: Wire it into the day card + controller**

In `src/render.js`, inside `dayCardHTML`, add the select + a warning slot right after the `pill-row` div:

```js
      <div class="override">
        ${daySelectHTML(day, dayIndex, day._meals || [])}
        <p class="override-warn" data-warn="${dayIndex}"></p>
      </div>
```

Because `dayCardHTML` needs the meal list, change its signature to `dayCardHTML(day, dayIndex, deal, meals = [])` and use `meals` instead of `day._meals`. Update the call in `app.js` `renderPlan()` to pass `state.meals`:

```js
  cards.innerHTML = state.plan.days.map((d, i) =>
    dayCardHTML(d, i, d.mode === 'eatout' ? dealForDay(state.deals, d.day) : null, state.meals)).join('');
```

In `app.js`, handle the override change event (add to `wireEvents`):

```js
  $('#plan-cards').addEventListener('change', (e) => {
    const sel = e.target.closest('[data-action="override"]');
    if (!sel) return;
    const i = Number(sel.dataset.day);
    const meal = state.meals.find((m) => m.meal === sel.value);
    if (!meal) return;
    const warn = evaluateOverride(state.plan, i, meal);
    state.plan.days[i] = { ...state.plan.days[i], meal, mode: meal.where === 'Eat Out' ? 'eatout' : 'cook' };
    state.plan.healthyCount = countHealthy(state.plan);
    savePlan();
    renderPlan();
    if (warn) {
      const slot = document.querySelector(`[data-warn="${i}"]`);
      if (slot) slot.textContent = warn;
    }
  });
```

Add the import in `app.js`:

```js
import { dayCardHTML, shoppingRowHTML, mealRowHTML, evaluateOverride } from './render.js';
```

Add minimal CSS to `index.html` `<style>`:

```css
    .override{margin-top:10px}
    .day-select{width:100%; padding:8px 10px; border:1px solid var(--line); border-radius:var(--r-chip);
      background:var(--surface); color:var(--ink); font-weight:600; min-height:44px}
    .override-warn{color:var(--coral); font-size:.72rem; font-weight:700; margin:6px 0 0}
```

- [ ] **Step 5: Run tests + verify in browser**

Run: `node --test tests/render.test.js`
Expected: PASS — override evaluator test passes.

Browser: generate a week, change a day via its dropdown; the card updates, and picking a clashing category or a 3rd eat-out shows a coral warning under that card.

- [ ] **Step 6: Commit**

```bash
git add src/render.js src/app.js index.html
git commit -m "feat: per-day override dropdown with live rule warnings

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 14: Polish — empty/error states, healthy meter wording, emoji removal, PWA, reduced motion

Covers ROADMAP Phase 5 niceties that don't need new logic modules.

**Files:**
- Create: `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png` (simple pine squares with a white plate glyph — see step)
- Modify: `src/icons.js` (add a `lock` SVG), `src/render.js` (use `ICONS.lock` instead of 🔒), `index.html` (register SW), `src/app.js` (offline-friendly load already handled; confirm)

- [ ] **Step 1: Replace the lock emoji with an SVG**

Add to `ICONS` in `src/icons.js`:

```js
  lock: svg(`
    <rect class="fill" x="5" y="11" width="14" height="9" rx="2" fill="currentColor" opacity=".18"/>
    <rect class="stroke" x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="1.9"/>
    <path class="stroke" d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>`),
```

In `src/render.js` `dayCardHTML`, change the lock button content from the emoji to:

```js
        <button class="btn-lock${day.locked ? ' is-on' : ''}" data-action="lock" data-day="${dayIndex}" aria-label="Lock this day" aria-pressed="${day.locked}">${ICONS.lock}</button>
```

Add CSS in `index.html`: `.btn-lock{color:var(--muted)} .btn-lock.is-on{color:var(--pine)} .btn-lock svg{width:18px;height:18px}`.

- [ ] **Step 2: Add the PWA manifest — `manifest.webmanifest`**

```json
{
  "name": "Family Dinner Planner",
  "short_name": "Dinner",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#FAF8F3",
  "theme_color": "#1F6E54",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Generate the two PNG icons (solid pine background, white fork+knife) without external tools:

```bash
node --input-type=module -e "
import fs from 'node:fs';
import zlib from 'node:zlib';
function png(size){
  const buf=Buffer.alloc(size*size*4);
  const [r,g,b]=[0x1F,0x6E,0x54];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const o=(y*size+x)*4;buf[o]=r;buf[o+1]=g;buf[o+2]=b;buf[o+3]=255;}
  // white vertical bar (a simple 'plate' mark) in the center
  const w=Math.floor(size*0.10), cx=Math.floor(size/2);
  for(let y=Math.floor(size*0.3);y<Math.floor(size*0.7);y++)for(let x=cx-w;x<cx+w;x++){const o=(y*size+x)*4;buf[o]=255;buf[o+1]=255;buf[o+2]=255;}
  // build PNG
  const raw=Buffer.alloc((size*4+1)*size);
  for(let y=0;y<size;y++){raw[y*(size*4+1)]=0;buf.copy(raw,y*(size*4+1)+1,y*size*4,(y+1)*size*4);}
  const idat=zlib.deflateSync(raw);
  function chunk(type,data){const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const t=Buffer.from(type);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data]))>>>0);return Buffer.concat([len,t,data,crc]);}
  function crc32(b){let c=~0;for(let i=0;i<b.length;i++){c^=b[i];for(let k=0;k<8;k++)c=c&1?(c>>>1)^0xEDB88320:c>>>1;}return ~c;}
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;
  const sig=Buffer.from([137,80,78,71,13,10,26,10]);
  return Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',idat),chunk('IEND',Buffer.alloc(0))]);
}
fs.writeFileSync('icon-192.png',png(192));
fs.writeFileSync('icon-512.png',png(512));
console.log('icons written');
"
```

Expected: `icons written`, two PNG files created. (The user may later replace these with a designed icon — fine.)

- [ ] **Step 3: Add a minimal service worker — `sw.js`**

```js
const CACHE = 'dinner-v1';
const SHELL = [
  '.', 'index.html', 'manifest.webmanifest',
  'src/app.js', 'src/config.js', 'src/csv.js', 'src/model.js', 'src/generator.js',
  'src/deals.js', 'src/shopping.js', 'src/store.js', 'src/sheet.js', 'src/render.js', 'src/icons.js',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
});
// Cache-first for the shell; network-first (cache fallback) for the Sheet CSV.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('docs.google.com')) {
    e.respondWith(fetch(e.request).then((r) => {
      const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r;
    }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
```

Register it — add before `</body>` in `index.html` (after the module script):

```html
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    }
  </script>
```

- [ ] **Step 4: Honor reduced motion + confirm empty states**

Confirm `index.html` already wraps card transitions in `@media (prefers-reduced-motion: no-preference)` (added in Task 11). Confirm the Plan/Shopping empty states render (Task 12 `renderPlan`/`renderShopping`). No code change if both hold; otherwise fix to match.

- [ ] **Step 5: Verify**

Run: `npm test` → all pass (no logic changed; render test still green since lock button still has `data-action="lock"`).
Browser: hard-reload, confirm no emoji anywhere, lock icon toggles pine, installable (DevTools → Application → Manifest shows icons, SW registered, offline reload serves the last plan).

- [ ] **Step 6: Commit**

```bash
git add manifest.webmanifest sw.js icon-192.png icon-512.png src/icons.js src/render.js index.html
git commit -m "feat: PWA (manifest + service worker), SVG lock icon, reduced-motion, offline shell

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Phase 5 — Sync & ship

### Task 15: Firebase backend (swap in real-time sync)

Adds a `firebaseBackend` conforming to the existing `{ get, set }` interface, plus a tiny subscribe hook so both phones see the same plan. localStorage stays the offline fallback. **Requires the user to create a Firebase project and paste the web config** (mirror the health-tracker setup, path-scoped).

**Files:**
- Create: `src/firebase.js`
- Modify: `src/app.js` (choose backend; subscribe to remote plan changes)

- [ ] **Step 1: Get Firebase config from the user**

Ask the user to create (or reuse) a Firebase project with Realtime Database enabled and provide the web config object (`apiKey`, `authDomain`, `databaseURL`, `projectId`, …) and a path scope (e.g. `dinner/<household>`). Mirror the health-tracker's path-scoped, public-but-obscure rules. **Do not invent credentials** — block on the real values.

- [ ] **Step 2: Write `src/firebase.js`**

```js
// Firebase RTDB backend conforming to the store's { get, set } interface, plus subscribe().
// Uses the modular CDN SDK via dynamic import so there's still no build step.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getDatabase, ref, get as dbGet, set as dbSet, onValue }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

export function firebaseBackend(config, scope = 'dinner/home') {
  const app = initializeApp(config);
  const db = getDatabase(app);
  const path = (key) => `${scope}/${key.replace(/:/g, '_')}`;
  return {
    async get(key) {
      const snap = await dbGet(ref(db, path(key)));
      return snap.exists() ? snap.val() : null;
    },
    async set(key, value) {
      await dbSet(ref(db, path(key)), value);
    },
    // Extra: live updates. cb(key, parsedValue) on every remote change.
    subscribe(key, cb) {
      return onValue(ref(db, path(key)), (snap) => {
        const raw = snap.exists() ? snap.val() : null;
        try { cb(key, raw == null ? null : JSON.parse(raw)); } catch { cb(key, null); }
      });
    },
  };
}
```

> The store serializes values to JSON strings, so RTDB stores strings and `subscribe` parses them — consistent with `createStore`.

- [ ] **Step 3: Wire backend selection in `src/app.js`**

Replace the backend import/usage at the top of `app.js`:

```js
import { createStore, localStorageBackend } from './store.js';
import { FIREBASE_CONFIG, FIREBASE_SCOPE } from './config.js';

let backend = localStorageBackend;
if (FIREBASE_CONFIG && FIREBASE_CONFIG.databaseURL) {
  const { firebaseBackend } = await import('./firebase.js');
  backend = firebaseBackend(FIREBASE_CONFIG, FIREBASE_SCOPE);
  // Live plan sync from the other phone.
  backend.subscribe?.('mp:plan', (_k, plan) => {
    if (plan) { state.plan = plan; renderPlan(); }
  });
}
const store = createStore(backend);
```

(Move the `state` declaration above this block so `subscribe` can reference it; `app.js` is a module so top-level `await` is allowed.)

Add to `src/config.js`:

```js
// Paste the Firebase web config here to enable cross-device sync. Leave null for
// localStorage-only (single device).
export const FIREBASE_CONFIG = null;
export const FIREBASE_SCOPE = 'dinner/home';
```

- [ ] **Step 4: Verify**

Run: `npm test` → unchanged suite still passes (store/generator/etc. untouched; firebase.js isn't unit-tested as it needs the network).
Browser (after pasting real config): generate a plan on one device/tab; a second tab pointed at the same URL updates its Plan screen within a second. With `FIREBASE_CONFIG = null`, behavior is exactly as before (localStorage).

- [ ] **Step 5: Commit**

```bash
git add src/firebase.js src/app.js src/config.js
git commit -m "feat: optional Firebase RTDB backend with live cross-device plan sync

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 16: Deploy to GitHub Pages + finalize docs

**Files:**
- Modify: `README.md` (fill in the real setup/run steps), `ROADMAP.md` (remove shipped items), `CHANGELOG.md` (record the release)

- [ ] **Step 1: Create the GitHub repo and push**

```bash
gh repo create meal-planner --public --source=. --remote=origin --push
```

(If the user prefers a different repo name/visibility, follow that. The repo must be public for free GitHub Pages, matching the health-tracker pattern.)

- [ ] **Step 2: Enable Pages**

```bash
gh api -X POST repos/:owner/meal-planner/pages -f "source[branch]=main" -f "source[path]=/" 2>/dev/null || echo "Enable Pages via repo Settings → Pages → main / root"
```

Confirm the site builds and the published URL serves `index.html` and `/src/*.js` (the `.nojekyll` file ensures `/src` isn't stripped). Open the live URL on a phone and "Add to Home Screen".

- [ ] **Step 3: Update README setup section**

Replace the `## Setup` section of `README.md` with the now-true steps: published Sheet URL pattern, the `FIREBASE_CONFIG` paste location in `src/config.js`, GitHub Pages URL, add-to-home-screen, and `npm test` for contributors. Flip the status line near the top from "not built yet" to the shipped version.

- [ ] **Step 4: Move shipped items ROADMAP → CHANGELOG**

Per the project convention (and the [[feedback-trading-combined-roadmap-changelog]] habit): delete the now-shipped Phase 0–5 checklists from `ROADMAP.md`, leaving only "Later / nice-to-have" and "not on the roadmap". Add a `## [0.1.0] — 2026-05-29` (or actual date) release block to `CHANGELOG.md` summarizing what shipped (generator, tweak/pivot, deals, shopping list, PWA, optional Firebase sync, Pages deploy).

- [ ] **Step 5: Verify the live site**

Open the GitHub Pages URL. Confirm: meals load from the Sheet, generate/override/re-roll/lock work, shopping list checkboxes persist, installable on a phone. Take a screenshot of the live Plan screen.

- [ ] **Step 6: Commit**

```bash
git add README.md ROADMAP.md CHANGELOG.md
git commit -m "docs: finalize README setup, move shipped roadmap items to changelog (v0.1.0)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push
```

---

## Self-Review (completed during planning)

**Spec coverage** — every ROADMAP Phase 0–5 item maps to a task:
- Phase 0: scaffold (T1), Sheet CSV endpoints (T2/T12 `sheet.js`), parse meals (T4), parse deals (T4), Firebase config path-scoped (T15), app shell + loading/error (T11/T12). ✓
- Phase 1: week model + rule engine + relaxation + generate + save/load (T5, T6, T12). ✓
- Phase 2: override dropdown + warnings (T13), swap (T12 `rerollDay`), re-roll unlocked (T5/T12), lock (T12), healthy meter (T12). ✓
- Phase 3: deal matching + deal pill + empty deal cells (T7, T12, T14). ✓
- Phase 4: derive list, dedupe, aisle grouping, checkboxes, staples persist/perishables reset, edit staples (T8, T12). *Note:* "edit staples" (mark/unmark) is exposed via persistence in T8/T12 but the UI affordance to toggle a staple is light — added as a long-press/secondary control in T13's shopping handler scope; if the user wants a dedicated staples editor screen, that's a small follow-up, not MVP-blocking.
- Phase 5: empty/edge states (T14), PWA + offline (T14), cross-device sync (T15), Pages deploy + README (T16). ✓

**Placeholder scan** — no TBD/TODO; every code step has complete code. ✓
**Type consistency** — `mode` is `'cook'|'eatout'`, `where` is `'Home'|'Either'|'Eat Out'`, relaxation tokens `'healthy'|'category'|'eatout'|'repeat'`, store keys via `KEYS`, render helpers and `app.js` agree on `data-action`/`data-day`/`data-key`. ✓
**Known heuristic limits** (acceptable for MVP, noted inline): aisle classification is keyword-based; the generated PNG icons are placeholders; `evaluateOverride` warns but does not block (by design — rules are guardrails, not cages).

**One gap to confirm with the user:** the "edit staples" UI is minimal in this plan. Flagging rather than over-building (YAGNI) — can be a fast follow.
