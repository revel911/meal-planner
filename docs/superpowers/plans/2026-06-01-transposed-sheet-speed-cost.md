# Transposed Sheet + Speed/Cost + Special/Sale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt the Meal Planner to the restructured Google Sheet — transposed layout, new `Speed`/`Cost`/`Special / Sale` attributes, `Bought` as the eat-out signal — keeping all generation rules working and Bought food off the shopping list.

**Architecture:** A dedicated transposed parser reads attribute-labeled rows and assembles one meal per column. The internal `where` vocabulary (`Home`/`Either`/`Eat Out`) is preserved by mapping `Bought → 'Eat Out'`, so the generator, override checks, and shopping list need no logic changes. `Speed`/`Cost`/`Special` are display-only pills. The separate Deals tab is removed.

**Tech Stack:** Vanilla ES modules (no build step), Node's built-in `node:test` for unit tests.

**Spec:** `docs/superpowers/specs/2026-06-01-meal-planner-transposed-sheet-speed-cost-design.md`

---

### Task 1: Transposed meal parser + new fields (`model.js`)

**Files:**
- Modify: `src/model.js`
- Test: `tests/model.test.js`

- [ ] **Step 1: Replace the test fixture and tests for the transposed schema**

Replace the entire contents of `tests/model.test.js` with:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMeals } from '../src/model.js';

// Transposed: row 0 is meal names ("Dinner", meal1, meal2, ...); every other
// row is one attribute keyed by its first cell. Last meal column is blank
// (should be skipped).
const MEAL_ROWS = [
  ['Dinner', 'Spaghetti', 'Sushi', 'Tacos', ''],
  ['Type', 'Italian', 'Asian', 'Mexican', ''],
  ['Bought / Made', 'Homemade', 'Bought', 'Either', ''],
  ['Special / Sale', '', '', 'Tuesdays', ''],
  ['Speed', 'Quick', 'Slow', 'N/A', ''],
  ['Cost', '$', '$$$', '', ''],
  ['Healthy', 'No', 'Yes', 'no', ''],
  ['Ingredients', 'spaghetti, meatballs, tomato sauce', 'rice, nori', '', ''],
];

test('parseMeals reads one meal per column and skips blank names', () => {
  const meals = parseMeals(MEAL_ROWS);
  assert.equal(meals.length, 3);
  assert.deepEqual(meals[0], {
    meal: 'Spaghetti',
    category: 'Italian',
    where: 'Home',
    healthy: false,
    speed: 'Quick',
    cost: '$',
    special: '',
    ingredients: ['spaghetti', 'meatballs', 'tomato sauce'],
  });
});

test('parseMeals maps Bought -> Eat Out and parses new fields', () => {
  const meals = parseMeals(MEAL_ROWS);
  assert.equal(meals[1].where, 'Eat Out');   // "Bought"
  assert.equal(meals[1].healthy, true);
  assert.equal(meals[1].speed, 'Slow');
  assert.equal(meals[1].cost, '$$$');
  assert.deepEqual(meals[1].ingredients, ['rice', 'nori']);
});

test('parseMeals handles Either, blank cost, special text, and empty ingredients', () => {
  const meals = parseMeals(MEAL_ROWS);
  assert.equal(meals[2].where, 'Either');
  assert.equal(meals[2].special, 'Tuesdays');
  assert.equal(meals[2].cost, '');
  assert.deepEqual(meals[2].ingredients, []);
});

test('parseMeals is independent of row order (keyed by attribute label)', () => {
  const shuffled = [MEAL_ROWS[0], MEAL_ROWS[6], MEAL_ROWS[2], MEAL_ROWS[4],
    MEAL_ROWS[1], MEAL_ROWS[7], MEAL_ROWS[3], MEAL_ROWS[5]];
  assert.deepEqual(parseMeals(shuffled), parseMeals(MEAL_ROWS));
});

test('parseMeals defaults an unknown Bought/Made to Either and missing fields to empty', () => {
  const meals = parseMeals([
    ['Dinner', 'Mystery'],
    ['Type', ''],
    ['Bought / Made', 'whenever'],
  ]);
  assert.equal(meals[0].where, 'Either');
  assert.equal(meals[0].category, 'Other');
  assert.equal(meals[0].healthy, false);
  assert.equal(meals[0].speed, '');
  assert.equal(meals[0].cost, '');
  assert.equal(meals[0].special, '');
  assert.deepEqual(meals[0].ingredients, []);
});

test('parseMeals returns [] for too-few rows or a missing Dinner row', () => {
  assert.deepEqual(parseMeals([]), []);
  assert.deepEqual(parseMeals([['Dinner', 'X']]), []);          // < 2 rows
  assert.deepEqual(parseMeals([['Type', 'Italian'], ['Cost', '$']]), []); // no Dinner row
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/model.test.js`
Expected: FAIL — `parseMeals` still reads the old row-per-meal format and `parseDeals` import no longer exists, so assertions error (e.g. `meals.length` is 0 / wrong shape).

- [ ] **Step 3: Rewrite `model.js` for the transposed layout**

Replace the entire contents of `src/model.js` with:

```js
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/model.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/model.js tests/model.test.js
git commit -m "feat(model): transposed parser; add speed/cost/special; Bought->Eat Out; drop parseDeals"
```

---

### Task 2: Point at the new Sheet and drop the Deals fetch (`config.js`, `sheet.js`)

**Files:**
- Modify: `src/config.js`
- Modify: `src/sheet.js`

No unit test — these are config/IO wiring. Verified by the full suite still passing (no module imports the removed symbols) plus the manual smoke test in Task 7.

- [ ] **Step 1: Update the Sheet ID and remove the Deals URL in `config.js`**

In `src/config.js`, change line 2:

```js
export const SHEET_ID = '1Y-KHVDtsOtPjscoIv3lz1lzCGf9Lb5eOGv9ajVhq9uM';
```

Then delete the `DEALS_CSV_URL` export (line 8) so only the meals URL remains:

```js
export const MEALS_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
```

(The comment on lines 4-6 referring to "The deals tab" can be trimmed to describe only the meals URL.)

- [ ] **Step 2: Remove the Deals fetch from `sheet.js`**

Replace the entire contents of `src/sheet.js` with:

```js
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
```

- [ ] **Step 3: Run the full suite to confirm nothing regressed**

Run: `npm test`
Expected: PASS. (`deals.test.js` still passes here — `deals.js` is removed later in Task 6.)

- [ ] **Step 4: Commit**

```bash
git add src/config.js src/sheet.js
git commit -m "feat(sheet): point at new transposed Sheet; remove Deals tab fetch"
```

---

### Task 3: Card + meal-row pills, BOUGHT label (`render.js`)

**Files:**
- Modify: `src/render.js`
- Test: `tests/render.test.js`

- [ ] **Step 1: Update the render tests for the new card signature and pills**

Replace the two fixtures at the top of `tests/render.test.js` (lines 6-9) with:

```js
const COOK_DAY = { day: 'Monday', mode: 'cook', locked: false,
  meal: { meal: 'Spaghetti', category: 'Italian', healthy: true, speed: 'Quick', cost: '$', special: '' } };
const EATOUT_DAY = { day: 'Tuesday', mode: 'eatout', locked: false,
  meal: { meal: 'Sushi', category: 'Asian', healthy: false, speed: 'N/A', cost: '$$$', special: 'Tuesdays' } };
```

Replace the test `'dayCardHTML renders meal, category pill and day label'` (lines 19-26) with:

```js
test('dayCardHTML renders meal, category/speed/cost pills and day label', () => {
  const html = dayCardHTML(COOK_DAY, 0);
  assert.match(html, /Spaghetti/);
  assert.match(html, /Italian/);
  assert.match(html, /MONDAY/);
  assert.match(html, /pill-speed[^>]*>Quick/);
  assert.match(html, /pill-cost[^>]*>\$/);
  assert.match(html, /class="card cook"/);
  assert.match(html, /badge-cook/);
});
```

Replace the test `'dayCardHTML marks eat-out and renders a deal pill when given a deal'` (lines 28-34) with:

```js
test('dayCardHTML marks bought day with BOUGHT label and a Special/Sale pill', () => {
  const html = dayCardHTML(EATOUT_DAY, 1);
  assert.match(html, /class="card eatout"/);
  assert.match(html, /BOUGHT/);
  assert.doesNotMatch(html, /EAT OUT/);
  assert.match(html, /pill-special[^>]*>[\s\S]*Tuesdays/);
  assert.match(html, /pill-cost[^>]*>\$\$\$/);
  assert.doesNotMatch(html, /pill-speed/); // 'N/A' speed is omitted
  assert.match(html, /badge-eatout/);
});
```

Replace the `'dayCardHTML shows a healthy pill only for healthy meals'` test (lines 36-39) with the same intent using the new signature:

```js
test('dayCardHTML shows a healthy pill only for healthy meals', () => {
  assert.match(dayCardHTML(COOK_DAY, 0), /pill-healthy/);
  assert.doesNotMatch(dayCardHTML(EATOUT_DAY, 1), /pill-healthy/);
});
```

In the `'dayCardHTML has Change footer...'` test (lines 73-79), change the call `dayCardHTML(COOK_DAY, 0, null)` to `dayCardHTML(COOK_DAY, 0)`.

Update the `'mealRowHTML lists name, category and where'` test (lines 48-53) to also assert speed/cost:

```js
test('mealRowHTML lists name, category, where, speed and cost', () => {
  const html = mealRowHTML({ meal: 'Tacos', category: 'Mexican', where: 'Either',
    healthy: false, speed: 'Quick', cost: '$$', special: '', ingredients: ['pork'] });
  assert.match(html, /Tacos/);
  assert.match(html, /Mexican/);
  assert.match(html, /Either/);
  assert.match(html, /pill-speed[^>]*>Quick/);
  assert.match(html, /pill-cost[^>]*>\$\$/);
});
```

(The two `mealRowHTML ... thumb` tests on lines 81-88 pass meal objects without `speed`/`cost`; that's fine — the pills are simply omitted when those fields are absent.)

- [ ] **Step 2: Run the render test to verify it fails**

Run: `node --test tests/render.test.js`
Expected: FAIL — `dayCardHTML` still takes a `deal` arg and renders `EAT OUT`/`pill-deal`; `pill-speed`/`pill-cost`/`pill-special`/`BOUGHT` don't exist yet.

- [ ] **Step 3: Update `render.js`**

In `src/render.js`, replace the pill helpers + `dayCardHTML` (lines 7-42) with:

```js
function categoryPill(cat) {
  return `<span class="pill pill-cat">${esc(cat)}</span>`;
}
function healthyPill() {
  return `<span class="pill pill-healthy">${ICONS.leaf}Healthy</span>`;
}
function speedPill(speed) {
  return `<span class="pill pill-speed">${esc(speed)}</span>`;
}
function costPill(cost) {
  return `<span class="pill pill-cost">${esc(cost)}</span>`;
}
function specialPill(special) {
  return `<span class="pill pill-special">${ICONS.tag}${esc(special)}</span>`;
}

// 'N/A' speed means not applicable (e.g. bought meals) -> hide the pill.
const hasSpeed = (s) => Boolean(s) && s !== 'N/A';

// dayIndex is needed so event handlers in app.js can map clicks back to a day.
export function dayCardHTML(day, dayIndex) {
  const m = day.meal;
  const isEat = day.mode === 'eatout';
  const label = `${day.day.toUpperCase()}${isEat ? ' · BOUGHT' : ''}`;
  const pills = [
    categoryPill(m.category),
    m.healthy ? healthyPill() : '',
    hasSpeed(m.speed) ? speedPill(m.speed) : '',
    m.cost ? costPill(m.cost) : '',
    m.special ? specialPill(m.special) : '',
  ].join('');
  const badge = isEat
    ? `<span class="badge badge-eatout" aria-hidden="true">${ICONS.utensils}</span>`
    : `<span class="badge badge-cook" aria-hidden="true">${ICONS.home}</span>`;
  return `
    <article class="card ${isEat ? 'eatout' : 'cook'}" data-day="${dayIndex}">
      ${badge}
      <p class="day-label">${esc(label)}</p>
      <h3 class="meal-name">${esc(m.meal)}</h3>
      <div class="pill-row">${pills}</div>
      <div class="card-footer">
        <span class="change-label" aria-hidden="true">Change</span>
        <button class="btn-icon" data-action="swap" data-day="${dayIndex}" aria-label="Shuffle ${esc(m.meal)}">${ICONS.refresh}</button>
        <button class="btn-icon" data-action="pick" data-day="${dayIndex}" aria-label="Pick a meal for ${esc(day.day)}">${ICONS.list}</button>
      </div>
      <p class="override-warn" data-warn="${dayIndex}"></p>
    </article>`;
}
```

Then in `mealRowHTML` (currently lines 54-68), add speed/cost pills to the pill row. Replace the `<div class="pill-row">...</div>` block inside `mealRowHTML` with:

```js
      <div class="pill-row">
        <span class="pill pill-cat">${esc(meal.category)}</span>
        <span class="pill pill-where">${esc(meal.where)}</span>
        ${meal.healthy ? healthyPill() : ''}
        ${hasSpeed(meal.speed) ? speedPill(meal.speed) : ''}
        ${meal.cost ? costPill(meal.cost) : ''}
        <span class="thumbs">${thumb('up', ICONS.thumbUp)}${thumb('down', ICONS.thumbDown)}</span>
      </div>
```

(Leave `evaluateOverride` and `pickerSheetHTML` unchanged — `evaluateOverride` still keys off `where === 'Eat Out'`, which now means Bought.)

- [ ] **Step 4: Run the render test to verify it passes**

Run: `node --test tests/render.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render.js tests/render.test.js
git commit -m "feat(render): speed/cost/special pills; relabel eat-out card to BOUGHT"
```

---

### Task 4: Lock in "Bought food never hits the shopping list" (invariant test)

**Files:**
- Test: `tests/shopping.test.js`

No `shopping.js` change — `buildShoppingList` already skips non-`cook` days. This task adds a regression guard for the invariant.

- [ ] **Step 1: Add the invariant test**

Append to `tests/shopping.test.js`:

```js
test('Bought (eat-out) meals never contribute to the list, even with ingredients', () => {
  const plan = {
    days: [
      { day: 'Monday', mode: 'cook', meal: { meal: 'Spaghetti', ingredients: ['ground beef'] } },
      { day: 'Tuesday', mode: 'eatout', meal: { meal: 'Empanadas', ingredients: ['dough', 'onion'] } },
    ],
    relaxations: [], healthyCount: 0,
  };
  const all = buildShoppingList(plan, []).flatMap((g) => g.items);
  assert.ok(all.some((i) => i.key === 'ground beef')); // cook meal included
  assert.ok(!all.some((i) => i.key === 'dough'));       // bought meal excluded
  assert.ok(!all.some((i) => i.key === 'onion'));        // bought meal excluded
});
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `node --test tests/shopping.test.js`
Expected: PASS (the guard documents existing behavior).

- [ ] **Step 3: Commit**

```bash
git add tests/shopping.test.js
git commit -m "test(shopping): guard that Bought meals stay off the shopping list"
```

---

### Task 5: Remove Deals wiring from the app (`app.js`)

**Files:**
- Modify: `src/app.js`

No unit test (`app.js` is the DOM wiring layer, not unit-tested). Verified by the manual smoke test in Task 7.

- [ ] **Step 1: Remove the Deals imports and state**

In `src/app.js`:

Change line 2 to drop `fetchDeals`:

```js
import { fetchMeals } from './sheet.js';
```

Delete line 5 entirely (`import { dealForDay } from './deals.js';`).

Change line 10 to drop `deals`:

```js
const state = { meals: [], plan: null, ratings: {}, history: [], error: null };
```

- [ ] **Step 2: Stop passing a deal into the card and stop fetching deals**

Replace the `cards.innerHTML = ...` line in `renderPlan` (lines 73-74) with:

```js
  cards.innerHTML = state.plan.days.map((d, i) => dayCardHTML(d, i)).join('');
```

Replace the meals/deals fetch in `init` (lines 207-211) with a meals-only fetch:

```js
  try {
    state.meals = await fetchMeals();
  } catch (err) {
    state.error = 'Could not reach the Google Sheet. Showing the last saved plan if available.';
  }
```

- [ ] **Step 3: Run the full suite (sanity — app.js isn't unit-tested but imports must resolve in tests that touch render)**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app.js
git commit -m "feat(app): drop Deals fetch/wiring; render cards without deal pills"
```

---

### Task 6: Delete dead Deals module + test

**Files:**
- Delete: `src/deals.js`
- Delete: `tests/deals.test.js`

- [ ] **Step 1: Confirm nothing imports `deals.js` anymore**

Run: `git grep -n "deals.js\|dealForDay\|parseDeals\|fetchDeals\|DEALS_CSV_URL" -- src tests`
Expected: no matches (all references removed in Tasks 1-5).

- [ ] **Step 2: Delete the files**

```bash
git rm src/deals.js tests/deals.test.js
```

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: PASS, and the deals test no longer runs.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove dead deals module and its test"
```

---

### Task 7: Full verification + manual smoke test

**Files:** none (verification only)

- [ ] **Step 1: Run the whole suite**

Run: `npm test`
Expected: PASS, all tests green, zero failures. (Was 33 tests; deals tests removed, model/render/shopping tests added.)

- [ ] **Step 2: Manual smoke test against the live Sheet**

Serve the app locally and open it in a browser (the app fetches the published CSV from the new Sheet):

Run: `npx http-server -p 8080 .` (or any static server from the repo root)
Then open `http://localhost:8080/` and verify:
- Tap **Generate week** → 7 day cards render with category/speed/cost pills; Bought meals (e.g. Empanadas, Chick-fil-A, Sushi) show the `· BOUGHT` label and eat-out styling, capped at 2/week.
- **Tacos** card (when present) shows a **Tuesdays** Special/Sale pill.
- **Shopping** tab → no ingredients from Bought meals appear; cook-meal ingredients are grouped by aisle.
- **Meals** tab → every meal lists category/where/speed/cost pills and thumb controls.
- No console errors about a missing Deals tab or undefined `dealForDay`.

- [ ] **Step 3: Update docs (CHANGELOG/ROADMAP) and the design memory**

- Move the "new Sheet schema" work into `CHANGELOG.md` (per the trading-combined ROADMAP→CHANGELOG convention the user follows).
- Note in `README.md` the new Sheet ID and the column meanings (Type/Bought-Made/Special-Sale/Speed/Cost/Healthy/Ingredients) if the README documents the schema.

- [ ] **Step 4: Final commit**

```bash
git add CHANGELOG.md ROADMAP.md README.md
git commit -m "docs: record transposed-Sheet + speed/cost/special migration"
```

---

## Self-Review Notes

- **Spec coverage:** new Sheet ID (T2), transposed parser approach B (T1), Speed/Cost display-only pills (T3), Bought→Eat Out mapping (T1), Special/Sale pill replacing Deals (T1/T3), Deals tab removal (T2/T5/T6), Bought-off-shopping-list invariant (T4), unaffected modules left untouched (generator/store/firebase/icons/csv). All spec sections map to a task.
- **Placeholder scan:** none — every code step shows complete code.
- **Type consistency:** the `Meal` shape `{ meal, category, where, healthy, speed, cost, special, ingredients }` is defined in T1 and consumed unchanged in T3 (`m.speed`/`m.cost`/`m.special`) and the fixtures in T3/T4. `dayCardHTML(day, dayIndex)` two-arg signature is consistent across T3 and T5.
