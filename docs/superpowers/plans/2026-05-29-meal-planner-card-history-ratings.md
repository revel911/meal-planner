# Card Redesign, Recency History & Ratings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up the day card (drop the inline dropdown and lock, add a home/eat-out badge and a Change footer), remember the last 3 weeks so meals fade out and back in gradually, and let the user thumbs-up/down meals to bias how often they appear.

**Architecture:** Pure logic lives in `src/generator.js` (selection + weighting) and `src/store.js` (persistence), both unit-tested with `node:test` and a seeded RNG. `src/render.js` builds HTML strings (unit-tested via regex matches). `src/app.js` and `index.html` are the DOM/CSS glue, verified by running the app. Selection weight = recency-weight × rating-weight, fed into an Efraimidis–Spirakis weighted shuffle; all existing hard rules and the relaxation ladder are unchanged.

**Tech Stack:** Vanilla ES modules, `node --test` (no deps), Firebase RTDB / localStorage via the existing store backend, single-file `index.html` with inline CSS.

**Spec:** `docs/superpowers/specs/2026-05-29-meal-planner-card-history-ratings-design.md`

**Run all tests with:** `npm test` (from `e:/Code/Fun Projects/Meal-Planner`). Run a single file with `node --test tests/<file>.test.js`.

---

## File Structure

- `src/config.js` — add `history` and `ratings` to `KEYS`; keep `lastWeek` for one-time migration read.
- `src/store.js` — add `getHistory` / `pushHistory` (cap 3, with `lastWeek` fallback) and `getRatings` / `setRating`.
- `src/generator.js` — add `ratingWeight`, `recencyWeight`, `weightedShuffle`; thread history + ratings through `select` / `generateWeek` / `rerollDay` / `regenerateUnlocked`.
- `src/icons.js` — add a `home` icon.
- `src/render.js` — badge uses `home` / `utensils`; card gains a `Change` footer with shuffle + list buttons; drop the inline `<select>` and lock button; meal rows get thumb buttons; add `pickerSheetHTML`.
- `src/app.js` — wire shuffle / list-picker / Reshuffle week / Meals-tab thumbs; push history on generate; load history + ratings at init.
- `index.html` — CSS for badge icon sizing, card footer, picker sheet, meal-row thumbs; rename the reroll button text.

---

## Task 1: Store — rolling history + ratings

**Files:**
- Modify: `src/config.js:18-23` (KEYS)
- Modify: `src/store.js:26-35` (createStore return)
- Test: `tests/store.test.js`

- [ ] **Step 1: Add the new keys**

In `src/config.js`, replace the `KEYS` object (lines 18-23) with:

```js
// localStorage / Firebase key names (namespaced)
export const KEYS = {
  plan: 'mp:plan',
  lastWeek: 'mp:lastweek',   // legacy: single previous week; read once for migration
  history: 'mp:history',     // string[][] of up to 3 recent weeks, most-recent first
  ratings: 'mp:ratings',     // { [mealName]: 'up' | 'down' }  (neutral = absent)
  staples: 'mp:staples',     // string[] of ingredient keys always kept on hand
  checked: 'mp:checked',     // string[] of currently-checked shopping keys
};
```

- [ ] **Step 2: Write failing tests for history + ratings**

Add to `tests/store.test.js`:

```js
test('history defaults to [], pushes most-recent-first and caps at 3', async () => {
  const store = createStore(memoryBackend());
  assert.deepEqual(await store.getHistory(), []);
  assert.deepEqual(await store.pushHistory(['A', 'B']), [['A', 'B']]);
  await store.pushHistory(['C']);
  await store.pushHistory(['D']);
  const capped = await store.pushHistory(['E']);
  assert.equal(capped.length, 3, 'capped at 3 weeks');
  assert.deepEqual(capped[0], ['E'], 'newest first');
  assert.deepEqual(await store.getHistory(), capped);
});

test('history falls back to the legacy lastWeek key once', async () => {
  const store = createStore(memoryBackend({ 'mp:lastweek': JSON.stringify(['Tacos']) }));
  assert.deepEqual(await store.getHistory(), [['Tacos']]);
});

test('ratings default to {}, set, overwrite and clear to neutral', async () => {
  const store = createStore(memoryBackend());
  assert.deepEqual(await store.getRatings(), {});
  await store.setRating('Tacos', 'up');
  await store.setRating('Sushi', 'down');
  assert.deepEqual(await store.getRatings(), { Tacos: 'up', Sushi: 'down' });
  await store.setRating('Tacos', 'neutral'); // neutral removes the entry
  assert.deepEqual(await store.getRatings(), { Sushi: 'down' });
});
```

- [ ] **Step 3: Run the new tests to verify they fail**

Run: `node --test tests/store.test.js`
Expected: FAIL — `store.getHistory is not a function`.

- [ ] **Step 4: Implement the store methods**

In `src/store.js`, replace the `return { ... }` block (lines 26-35) with:

```js
  return {
    getPlan: () => readJSON(KEYS.plan, null),
    setPlan: (plan) => writeJSON(KEYS.plan, plan),
    getStaples: () => readJSON(KEYS.staples, DEFAULT_STAPLES.slice()),
    setStaples: (arr) => writeJSON(KEYS.staples, arr),
    getChecked: () => readJSON(KEYS.checked, []),
    setChecked: (arr) => writeJSON(KEYS.checked, arr),

    async getHistory() {
      const hist = await readJSON(KEYS.history, null);
      if (hist) return hist;
      // One-time fallback: seed from the legacy single-week key if present.
      const legacy = await readJSON(KEYS.lastWeek, null);
      return legacy && legacy.length ? [legacy] : [];
    },
    async pushHistory(week) {
      const hist = await this.getHistory();
      const next = [week, ...hist].slice(0, 3);
      await writeJSON(KEYS.history, next);
      return next;
    },

    getRatings: () => readJSON(KEYS.ratings, {}),
    async setRating(mealName, value) {
      const ratings = await readJSON(KEYS.ratings, {});
      if (value === 'up' || value === 'down') ratings[mealName] = value;
      else delete ratings[mealName];
      await writeJSON(KEYS.ratings, ratings);
      return ratings;
    },
  };
```

(Note: `getLastWeek`/`setLastWeek` are removed — Task 5 updates the one app.js caller.)

- [ ] **Step 5: Update the legacy store test**

In `tests/store.test.js`, replace the `'lastWeek + checked round-trip...'` test (lines 25-33) with a checked-only version, since `lastWeek` setters are gone:

```js
test('checked round-trips and defaults to []', async () => {
  const store = createStore(memoryBackend());
  assert.deepEqual(await store.getChecked(), []);
  await store.setChecked(['rice']);
  assert.deepEqual(await store.getChecked(), ['rice']);
});
```

Also replace the `'memoryBackend can seed initial values'` test (lines 35-38), which referenced `getLastWeek`, with:

```js
test('memoryBackend can seed initial values', async () => {
  const store = createStore(memoryBackend({ 'mp:ratings': JSON.stringify({ X: 'up' }) }));
  assert.deepEqual(await store.getRatings(), { X: 'up' });
});
```

- [ ] **Step 6: Run the store tests to verify they pass**

Run: `node --test tests/store.test.js`
Expected: PASS (all store tests green).

- [ ] **Step 7: Commit**

```bash
git add src/config.js src/store.js tests/store.test.js
git commit -m "feat(store): rolling 3-week history and per-meal ratings"
```

---

## Task 2: Generator — recency + rating weighting

**Files:**
- Modify: `src/generator.js`
- Test: `tests/generator.test.js`

- [ ] **Step 1: Write failing tests for the weight helpers**

Add to the top of `tests/generator.test.js` (after the existing imports), extend the import line and add tests:

Change line 3 to:
```js
import { generateWeek, rerollDay, regenerateUnlocked, countHealthy, ratingWeight, recencyWeight } from '../src/generator.js';
```

Add these tests:
```js
test('ratingWeight boosts up, penalizes down, neutral is 1', () => {
  assert.equal(ratingWeight('Tacos', { Tacos: 'up' }), 2.5);
  assert.equal(ratingWeight('Tacos', { Tacos: 'down' }), 0.25);
  assert.equal(ratingWeight('Tacos', {}), 1);
  assert.equal(ratingWeight('Tacos', undefined), 1);
});

test('recencyWeight fades meals seen 2-3 weeks ago, full for unseen', () => {
  // history is most-recent-first: [week-1, week-2, week-3]
  const history = [['Recent'], ['TwoAgo'], ['ThreeAgo']];
  assert.equal(recencyWeight('TwoAgo', history), 0.25);
  assert.equal(recencyWeight('ThreeAgo', history), 0.5);
  assert.equal(recencyWeight('Unseen', history), 1);
  // most-recent week is handled by the pool filter, not the weight -> treated as full here
  assert.equal(recencyWeight('Recent', history), 1);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test tests/generator.test.js`
Expected: FAIL — `ratingWeight is not a function`.

- [ ] **Step 3: Implement the weight helpers and weighted shuffle**

In `src/generator.js`, replace the `shuffled` function (lines 7-15) with the weighted versions and the helpers:

```js
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

// Efraimidis–Spirakis weighted shuffle: key = u^(1/weight); larger key sorts first,
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
```

- [ ] **Step 4: Thread weights through `select`**

In `src/generator.js`, change the `select` signature and its first line. Replace lines 21-25 (the comment + `function select(...)` through the `order` assignment) with:

```js
// Try to pick `need` distinct meals from `pool` satisfying the active rules.
// `relaxed` is a Set of tokens currently switched off. `weightOf` biases pick order.
// Returns Meal[] or null.
function select(pool, need, cfg, relaxed, rng, fixed = [], weightOf = () => 1) {
  // Weighted ordering biases greedy solutions toward liked/less-recent meals;
  // the healthy target is still enforced below by backtracking.
  const order = weightedShuffle(pool, rng, weightOf);
```

(The rest of `select` — `chosen`, `ok`, `backtrack` — is unchanged.)

- [ ] **Step 5: Thread history + ratings through `generateWeek`**

Replace `generateWeek` (lines 70-92) with:

```js
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
```

- [ ] **Step 6: Thread weights through `rerollDay` and `regenerateUnlocked`**

In `rerollDay` (lines 95-116), change the candidate line. Replace line 103 (`const candidates = shuffled(meals, rng).filter((m) =>`) with:

```js
  const weightOf = weightFn(opts.history || [], opts.ratings);
  const candidates = weightedShuffle(meals, rng, weightOf).filter((m) =>
```

In `regenerateUnlocked` (lines 121-146), add a weight function and pass it to `select`. After `const pool = meals.slice();` (line 127) add:

```js
  const weightOf = weightFn(opts.history || [], opts.ratings);
```

and change the `select(...)` call (line 132) to:

```js
    picks = select(pool, need, cfg, relaxed, rng, fixed, weightOf);
```

- [ ] **Step 7: Update the legacy history test to the new array-of-weeks API**

In `tests/generator.test.js`, replace the `'excludes last weeks meals...'` test (lines 43-48) with:

```js
test('excludes the most-recent week unless repeat must be relaxed', () => {
  const history = [['Spaghetti', 'Tikka']]; // most-recent week, as array-of-weeks
  const plan = generateWeek(MEALS, history, { rng: noShuffle, healthyTarget: 0 });
  // With 8 meals and 2 excluded, 6 remain < 7 -> repeat relaxed.
  assert.ok(plan.relaxations.includes('repeat'));
});
```

- [ ] **Step 8: Add a behavioral test that ratings bias frequency**

Add to `tests/generator.test.js`:

```js
test('thumbs-up meals are chosen more often than thumbs-down over many draws', () => {
  // Deterministic-but-varied rng so weightedShuffle actually differentiates.
  let seed = 1;
  const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const ratings = { Spaghetti: 'up', Gyros: 'down' };
  let up = 0, down = 0;
  for (let i = 0; i < 200; i++) {
    const plan = generateWeek(MEALS, [], { rng, ratings, healthyTarget: 0 });
    const names = plan.days.map((d) => d.meal.meal);
    if (names.includes('Spaghetti')) up++;
    if (names.includes('Gyros')) down++;
  }
  assert.ok(up > down, `expected up(${up}) > down(${down})`);
});
```

- [ ] **Step 9: Run the generator tests to verify they pass**

Run: `node --test tests/generator.test.js`
Expected: PASS — all generator tests green, including the new weighting tests.

- [ ] **Step 10: Run the full suite (catch cross-file regressions)**

Run: `npm test`
Expected: PASS — every test green.

- [ ] **Step 11: Commit**

```bash
git add src/generator.js tests/generator.test.js
git commit -m "feat(generator): weighted selection by recency history and ratings"
```

---

## Task 3: Icons — add a `home` glyph

**Files:**
- Modify: `src/icons.js` (ICONS object)
- Test: `tests/render.test.js:11-17`

- [ ] **Step 1: Write the failing test**

In `tests/render.test.js`, update the icon-presence list (line 12) to include `home` and `thumb` glyphs and drop the now-unused `star`/`pot` from the required set:

```js
  for (const name of ['calendar', 'bag', 'utensils', 'refresh', 'leaf', 'tag', 'home', 'list', 'thumbUp', 'thumbDown']) {
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/render.test.js`
Expected: FAIL — `missing icon: home`.

- [ ] **Step 3: Add the icons**

In `src/icons.js`, add these entries inside the `ICONS` object (e.g. after `utensils`):

```js
  home: svg(`
    <path class="fill" d="M5 10.5 12 5l7 5.5V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8.5Z" fill="currentColor" opacity=".16"/>
    <path class="stroke" d="M4 10.5 12 4l8 6.5M6 10v9h12v-9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`),
  list: svg(`
    <path class="stroke" d="M8 6h11M8 12h11M8 18h11M4 6h.01M4 12h.01M4 18h.01" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`),
  thumbUp: svg(`
    <path class="fill" d="M7 10h2v9H7zM9 10l3.5-6c1.4 0 2.2 1 1.9 2.3L13.8 9H19c1 0 1.7 1 1.4 2l-1.6 6c-.2.8-.9 1.3-1.7 1.3H9V10Z" fill="currentColor" opacity=".16"/>
    <path class="stroke" d="M7 10v9M9 10l3.5-6c1.4 0 2.2 1 1.9 2.3L13.8 9H19c1 0 1.7 1 1.4 2l-1.6 6c-.2.8-.9 1.3-1.7 1.3H7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`),
  thumbDown: svg(`
    <path class="fill" d="M17 14h-2V5h2zM15 14l-3.5 6c-1.4 0-2.2-1-1.9-2.3L10.2 15H5c-1 0-1.7-1-1.4-2l1.6-6C5.4 6.2 6.1 5.7 6.9 5.7H15V14Z" fill="currentColor" opacity=".16"/>
    <path class="stroke" d="M17 14V5M15 14l-3.5 6c-1.4 0-2.2-1-1.9-2.3L10.2 15H5c-1 0-1.7-1-1.4-2l1.6-6C5.4 6.2 6.1 5.7 6.9 5.7H17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`),
```

(`star` and `pot` stay defined in `ICONS` — harmless — but are no longer required by the test.)

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/render.test.js`
Expected: the icon test PASSES (other render tests may still fail until Task 4 — that's expected).

- [ ] **Step 5: Commit**

```bash
git add src/icons.js tests/render.test.js
git commit -m "feat(icons): add home, list and thumb up/down glyphs"
```

---

## Task 4: Render — badge, Change footer, picker sheet, meal thumbs

**Files:**
- Modify: `src/render.js`
- Test: `tests/render.test.js`

- [ ] **Step 1: Write failing render tests**

In `tests/render.test.js`, update the import (line 4) to include the new export:

```js
import { dayCardHTML, shoppingRowHTML, mealRowHTML, evaluateOverride, pickerSheetHTML } from '../src/render.js';
```

Replace the two badge assertions inside the existing card tests, and add new tests. Specifically, in `'dayCardHTML renders meal, category pill and day label'` keep `badge-cook` (line 25). In `'dayCardHTML marks eat-out...'` keep `badge-eatout` (line 33). Then add:

```js
test('dayCardHTML has Change footer with shuffle + list, and no dropdown or lock', () => {
  const html = dayCardHTML(COOK_DAY, 0, null);
  assert.match(html, /data-action="swap"/);
  assert.match(html, /data-action="pick"/);
  assert.doesNotMatch(html, /data-action="lock"/);
  assert.doesNotMatch(html, /<select/);
});

test('mealRowHTML renders thumb up/down reflecting current rating', () => {
  const up = mealRowHTML({ meal: 'Tacos', category: 'Mexican', where: 'Either', healthy: false, ingredients: ['pork'] }, 'up');
  assert.match(up, /data-action="rate"/);
  assert.match(up, /data-meal="Tacos"/);
  assert.match(up, /data-rate="up"[^>]*aria-pressed="true"/);
  const none = mealRowHTML({ meal: 'Tacos', category: 'Mexican', where: 'Either', healthy: false, ingredients: ['pork'] });
  assert.match(none, /data-rate="up"[^>]*aria-pressed="false"/);
});

test('pickerSheetHTML lists every meal as a pick option for the given day', () => {
  const meals = [
    { meal: 'Tacos', category: 'Mexican' },
    { meal: 'Sushi', category: 'Japanese' },
  ];
  const html = pickerSheetHTML(2, meals);
  assert.match(html, /data-action="pick-meal"/);
  assert.match(html, /data-day="2"/);
  assert.match(html, /Tacos/);
  assert.match(html, /Sushi/);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test tests/render.test.js`
Expected: FAIL — `pickerSheetHTML is not a function` and footer assertions fail.

- [ ] **Step 3: Rewrite `dayCardHTML`**

In `src/render.js`, replace `dayCardHTML` (lines 18-45) with:

```js
// dayIndex is needed so event handlers in app.js can map clicks back to a day.
export function dayCardHTML(day, dayIndex, deal) {
  const isEat = day.mode === 'eatout';
  const label = `${day.day.toUpperCase()}${isEat ? ' · EAT OUT' : ''}`;
  const pills = [
    categoryPill(day.meal.category),
    day.meal.healthy ? healthyPill() : '',
    (isEat && deal) ? dealPill(deal) : '',
  ].join('');
  const badge = isEat
    ? `<span class="badge badge-eatout" aria-hidden="true">${ICONS.utensils}</span>`
    : `<span class="badge badge-cook" aria-hidden="true">${ICONS.home}</span>`;
  return `
    <article class="card ${isEat ? 'eatout' : 'cook'}" data-day="${dayIndex}">
      ${badge}
      <p class="day-label">${esc(label)}</p>
      <h3 class="meal-name">${esc(day.meal.meal)}</h3>
      <div class="pill-row">${pills}</div>
      <div class="card-footer">
        <span class="change-label">Change</span>
        <button class="btn-icon" data-action="swap" data-day="${dayIndex}" aria-label="Shuffle ${esc(day.meal.meal)}">${ICONS.refresh}</button>
        <button class="btn-icon" data-action="pick" data-day="${dayIndex}" aria-label="Pick a meal for ${esc(day.day)}">${ICONS.list}</button>
      </div>
      <p class="override-warn" data-warn="${dayIndex}"></p>
    </article>`;
}
```

- [ ] **Step 4: Rewrite `mealRowHTML` to take a rating and render thumbs**

Replace `mealRowHTML` (lines 57-68) with:

```js
export function mealRowHTML(meal, rating) {
  const thumb = (dir, icon) =>
    `<button class="btn-thumb${rating === dir ? ' is-on' : ''}" data-action="rate" data-meal="${esc(meal.meal)}" data-rate="${dir}" aria-pressed="${rating === dir}" aria-label="Thumbs ${dir} ${esc(meal.meal)}">${icon}</button>`;
  return `
    <article class="meal-row">
      <h3 class="meal-name">${esc(meal.meal)}</h3>
      <div class="pill-row">
        <span class="pill pill-cat">${esc(meal.category)}</span>
        <span class="pill pill-where">${esc(meal.where)}</span>
        ${meal.healthy ? healthyPill() : ''}
        <span class="thumbs">${thumb('up', ICONS.thumbUp)}${thumb('down', ICONS.thumbDown)}</span>
      </div>
      <p class="meal-ings">${esc(meal.ingredients.join(', '))}</p>
    </article>`;
}
```

- [ ] **Step 5: Replace `daySelectHTML` with `pickerSheetHTML`**

Replace `daySelectHTML` (lines 85-89) with:

```js
// Bottom-sheet markup listing every meal as a tap-to-pick option for `dayIndex`.
export function pickerSheetHTML(dayIndex, meals) {
  const rows = meals.map((m) =>
    `<button class="picker-row" data-action="pick-meal" data-day="${dayIndex}" data-meal="${esc(m.meal)}">
       <span class="picker-name">${esc(m.meal)}</span>
       <span class="picker-cat">${esc(m.category)}</span>
     </button>`).join('');
  return `
    <div class="picker-backdrop" data-action="picker-close"></div>
    <div class="picker-sheet" role="dialog" aria-label="Pick a meal">
      <h2 class="picker-title">Pick a meal</h2>
      <div class="picker-list">${rows}</div>
    </div>`;
}
```

- [ ] **Step 6: Run render tests to verify they pass**

Run: `node --test tests/render.test.js`
Expected: PASS — all render tests green.

- [ ] **Step 7: Commit**

```bash
git add src/render.js tests/render.test.js
git commit -m "feat(render): home/utensils badge, Change footer, picker sheet, meal thumbs"
```

---

## Task 5: App wiring + CSS

> No unit tests cover `app.js`/`index.html`; verify by running the app (Step 9). Make the edits, then exercise every interaction.

**Files:**
- Modify: `src/app.js`
- Modify: `index.html` (CSS + button label)

- [ ] **Step 1: Load history + ratings into state at init**

In `src/app.js`, change the state init (line 10) to:

```js
const state = { meals: [], deals: [], plan: null, ratings: {}, history: [], error: null };
```

In `init()` (lines 169-179), after `state.plan = await store.getPlan();` add:

```js
  [state.ratings, state.history] = await Promise.all([store.getRatings(), store.getHistory()]);
```

- [ ] **Step 2: Update `onGenerate` to use history + ratings and push history**

Replace `onGenerate` (lines 107-117) with:

```js
async function onGenerate() {
  // Avoid the week currently on screen (treat it as the most-recent history entry)
  // plus the stored older weeks; bias by ratings.
  const current = (state.plan && state.plan.days.length)
    ? state.plan.days.map((d) => d.meal.meal)
    : null;
  const historyForGen = current ? [current, ...state.history] : state.history;
  state.plan = generateWeek(state.meals, historyForGen, { ratings: state.ratings });
  if (current) state.history = await store.pushHistory(current);
  await savePlan();
  renderPlan();
}
```

- [ ] **Step 3: Update the Reshuffle button handler**

Replace the `#btn-reroll` listener (lines 146-148) with a full-week reshuffle that avoids the current week and respects ratings:

```js
  $('#btn-reroll').addEventListener('click', () => {
    const current = state.plan.days.map((d) => d.meal.meal);
    state.plan = generateWeek(state.meals, [current, ...state.history], { ratings: state.ratings });
    savePlan(); renderPlan();
  });
```

- [ ] **Step 4: Update `onCardClick` — drop lock, add picker open**

Replace `onCardClick` (lines 119-130) with:

```js
function onCardClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const i = Number(btn.dataset.day);
  const action = btn.dataset.action;
  if (action === 'swap') {
    state.plan = rerollDay(state.plan, i, state.meals, { history: state.history, ratings: state.ratings });
    savePlan(); renderPlan();
  } else if (action === 'pick') {
    openPicker(i);
  }
}
```

- [ ] **Step 5: Add the picker open/close/apply logic**

Add these functions in `src/app.js` (e.g. just below `onCardClick`). They reuse `evaluateOverride` and the existing override-apply logic:

```js
function openPicker(dayIndex) {
  const host = $('#picker-host');
  host.innerHTML = pickerSheetHTML(dayIndex, state.meals);
  host.hidden = false;
}

function closePicker() {
  const host = $('#picker-host');
  host.hidden = true;
  host.innerHTML = '';
}

function applyPick(dayIndex, mealName) {
  const meal = state.meals.find((m) => m.meal === mealName);
  if (!meal) return;
  const warn = evaluateOverride(state.plan, dayIndex, meal);
  state.plan.days[dayIndex] = {
    ...state.plan.days[dayIndex], meal,
    mode: meal.where === 'Eat Out' ? 'eatout' : 'cook',
  };
  state.plan.healthyCount = countHealthy(state.plan);
  closePicker();
  savePlan();
  renderPlan();
  if (warn) {
    const slot = document.querySelector(`[data-warn="${dayIndex}"]`);
    if (slot) slot.textContent = warn;
  }
}
```

- [ ] **Step 6: Update imports and wireEvents**

In `src/app.js`, update the render import (line 7) to:

```js
import { dayCardHTML, shoppingRowHTML, mealRowHTML, evaluateOverride, pickerSheetHTML } from './render.js';
```

Remove the old `#plan-cards` `change` listener (lines 150-165, the `override` select handler) entirely — picking now happens through the sheet. Then add a click handler on the picker host inside `wireEvents()`:

```js
  $('#picker-host').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'pick-meal') applyPick(Number(btn.dataset.day), btn.dataset.meal);
    else if (btn.dataset.action === 'picker-close') closePicker();
  });
```

- [ ] **Step 7: Wire the Meals-tab thumbs**

In `renderMeals` (lines 96-101), pass each meal's current rating:

```js
function renderMeals() {
  const el = $('#meals-list');
  el.innerHTML = state.meals.length
    ? state.meals.map((m) => mealRowHTML(m, state.ratings[m.meal])).join('')
    : `<p class="empty">No meals loaded.</p>`;
}
```

Add a click handler for the thumbs inside `wireEvents()`:

```js
  $('#meals-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="rate"]');
    if (!btn) return;
    const meal = btn.dataset.meal;
    const dir = btn.dataset.rate;
    const next = state.ratings[meal] === dir ? 'neutral' : dir; // tap active to clear
    state.ratings = await store.setRating(meal, next);
    renderMeals();
  });
```

- [ ] **Step 8: Add the picker host + rename the button in `index.html`**

In `index.html`, change the reroll button text (line 145) from:

```html
        <button class="btn-soft" id="btn-reroll" hidden>Re-roll unlocked</button>
```
to:
```html
        <button class="btn-soft" id="btn-reroll" hidden>Reshuffle week</button>
```

Add a picker host element just before the closing `</main>` (after line 163, the end of the meals section, before `</main>` on line 164):

```html
    <div id="picker-host" hidden></div>
```

Add CSS inside the `<style>` block (before the closing `</style>` on line 133). This styles the new badge sizing, footer, thumbs, and picker sheet:

```css
    /* badge glyph sizing (home / utensils) */
    .badge svg{width:20px;height:20px}
    .badge-cook{border:1.5px solid rgba(198,161,76,.55); color:var(--gold)}
    .badge-eatout{background:linear-gradient(135deg,var(--gold),var(--gold-2)); color:var(--ink-on-gold)}

    /* card Change footer */
    .card-footer{display:flex; align-items:center; gap:8px; margin:12px -14px 0; padding:10px 14px 0;
      border-top:1px solid rgba(236,231,217,.10)}
    .change-label{margin-right:auto; font-size:.56rem; font-weight:700; letter-spacing:.12em;
      text-transform:uppercase; color:var(--cream-muted)}
    .btn-icon{width:32px; height:32px; border-radius:999px; background:transparent;
      border:1.5px solid rgba(198,161,76,.45); color:var(--gold); display:grid; place-items:center; cursor:pointer}
    .btn-icon svg{width:16px; height:16px}

    /* meals-tab thumbs */
    .thumbs{margin-left:auto; display:flex; gap:6px}
    .btn-thumb{width:30px; height:30px; border-radius:999px; background:transparent;
      border:1px solid var(--surface-line); color:var(--cream-muted); display:grid; place-items:center; cursor:pointer}
    .btn-thumb svg{width:16px; height:16px}
    .btn-thumb.is-on{color:var(--gold); border-color:rgba(198,161,76,.55); background:var(--gold-soft)}

    /* picker bottom sheet */
    #picker-host[hidden]{display:none !important}
    .picker-backdrop{position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:20}
    .picker-sheet{position:fixed; left:0; right:0; bottom:0; z-index:21; max-height:70vh; overflow:auto;
      background:#222a23; border:1px solid rgba(198,161,76,.25); border-radius:18px 18px 0 0;
      padding:16px 16px max(16px, env(safe-area-inset-bottom)); max-width:840px; margin:0 auto}
    .picker-title{font-family:var(--serif); font-size:1.2rem; color:var(--cream); margin:0 0 12px}
    .picker-row{display:flex; justify-content:space-between; align-items:center; width:100%; gap:10px;
      background:transparent; border:0; border-bottom:1px solid rgba(236,231,217,.08);
      padding:12px 4px; color:var(--cream); font-size:.95rem; text-align:left; cursor:pointer; min-height:44px}
    .picker-cat{color:var(--cream-muted); font-size:.72rem; font-weight:600}
```

- [ ] **Step 9: Run the app and verify every interaction**

Start a static server and open the app:

Run: `cd "e:/Code/Fun Projects/Meal-Planner" && python -m http.server 8000`
Open: `http://localhost:8000`

Verify, in order:
- Plan screen → "Generate week" builds 7 cards; each shows a home (cook) or gold utensils (eat-out) badge; no dropdown, no lock.
- A card's **⟳** shuffles just that day; the rest stay put.
- A card's **☰** opens the bottom sheet; tapping a meal sets that day and closes the sheet; tapping the backdrop closes without change; an eat-out/duplicate-category pick shows the warning line.
- "Reshuffle week" re-rolls all seven and avoids last week's meals.
- Meals tab → 👍/👎 toggle highlights; tapping the active thumb clears it.
- Reload the page → ratings persist (thumbs still highlighted) and a freshly generated week avoids the meals from the previous generation.

Stop the server with Ctrl+C when done.

- [ ] **Step 10: Run the full test suite once more**

Run: `npm test`
Expected: PASS — all tests green.

- [ ] **Step 11: Commit**

```bash
git add src/app.js index.html
git commit -m "feat(app): per-day shuffle/picker, reshuffle week, meal thumbs, history wiring"
```

---

## Task 6: Docs — move shipped items per project convention

**Files:**
- Modify: `CHANGELOG.md`, `ROADMAP.md`

- [ ] **Step 1: Update the changelog and roadmap**

Add a CHANGELOG entry summarizing: home/eat-out badge, Change footer (shuffle + picker sheet) replacing the inline dropdown and lock, rolling 3-week recency history, and thumbs-up/down weighting. If any of these features were listed in `ROADMAP.md`, remove them there (this project's convention: shipped items move from ROADMAP to CHANGELOG).

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md ROADMAP.md
git commit -m "docs: changelog for card redesign, recency history and ratings"
```

---

## Self-review notes

- **Spec coverage:** #1 dropdown removed (Task 4 footer + picker) ✓; #2 lock removed (Task 4/5) ✓; #3 home/utensils badge (Tasks 3-4) ✓; #4 rolling 3-week soft-fade history (Tasks 1-2, wired Task 5) ✓; #5 thumbs-up/down weighted, Meals-tab only (Tasks 1-5) ✓; "Reshuffle week" rename (Task 5) ✓; graceful degradation / no migration (Task 1 `getHistory` fallback, default `{}` ratings) ✓.
- **Type consistency:** `pickerSheetHTML(dayIndex, meals)`, `mealRowHTML(meal, rating)`, `dayCardHTML(day, dayIndex, deal)`, `generateWeek(meals, history, opts)`, `rerollDay(plan, i, meals, {history, ratings})`, `store.pushHistory(week) -> history`, `store.setRating(name, value) -> ratings`, data-actions `swap`/`pick`/`pick-meal`/`picker-close`/`rate` — all consistent across tasks.
- **Numbers** (history depth 3; recency 0.25 / 0.5; rating 2.5 / 0.25) are centralized (`RECENCY_WEIGHT`, `RATING_WEIGHT` in generator, `slice(0,3)` in store) for easy tuning.
