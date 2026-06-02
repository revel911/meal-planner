# Meal Planner — Transposed Sheet + Speed/Cost + Special/Sale

**Date:** 2026-06-01
**Status:** Approved (design)
**Author:** Tommy + Claude

## Background

Tommy restructured the source Google Sheet. Three things changed at once:

1. **New sheet** — ID is now `1Y-KHVDtsOtPjscoIv3lz1lzCGf9Lb5eOGv9ajVhq9uM` (the app currently points at the old `1Y2ZhSSoxVelTCsDi_Moo5et0HRlqLvShK242a6sd3i4`).
2. **Transposed layout** — meals are now **columns**, attributes are **rows**. The current parser assumes one-meal-per-row with a header row, so it breaks entirely.
3. **Schema changes** — two new attributes (`Speed`, `Cost`), `Where` renamed to `Bought / Made` with new values, and the per-day restaurant **Deals** tab is replaced by a per-meal `Special / Sale` attribute.

### New sheet shape (single tab, transposed)

Row 0 is meal names; each subsequent row is one attribute:

```
Dinner       | Spaghetti | Tacos    | ... | Pizza
Type         | Italian   | Mexican  | ... | Italian
Bought / Made| Homemade  | Either   | ... | Either
Special / Sale|          | Tuesdays | ... |
Speed        | Quick     | Quick    | ... | Quick
Cost         | $         | $$       | ... | $$
Healthy      | No        | No       | ... | No
Ingredients  | Spaghetti,…|         | ... | Frozen Pizzas, Spinach
```

- **Type** → meal category (was `Category`).
- **Bought / Made** → `Homemade | Either | Bought` (was `Home | Either | Eat Out`).
- **Special / Sale** → free text, e.g. `Tuesdays` (was a separate Deals tab).
- **Speed** → `Quick | Slow | N/A`. NEW.
- **Cost** → `$ | $$ | $$$` (may be blank). NEW.
- **Healthy** → `Yes | No`. Retained.
- **Ingredients** → comma-separated; blank for many meals.

## Decisions (from brainstorming)

| Question | Decision |
| --- | --- |
| Speed & Cost role | **Display only** — ride through the model into card/list pills; no effect on generation. |
| Eat-out rule input | **Bought = the eat-out signal.** Map `Bought → 'Eat Out'` so the existing `eatout` mode and ≤2/week cap keep working. |
| Special / Sale + Deals tab | **Replace Deals with Special/Sale.** Drop the separate Deals-tab fetch entirely; show the meal's Special/Sale note as a pill on its day card. Display only — does not influence which day a meal lands on. |
| Parser approach | **B — dedicated transposed parser.** Read attribute-labeled rows directly; assemble one meal per column. Keeps "order doesn't matter" robustness (now row order). |
| Bought food on shopping list | **Excluded.** Bought meals are mode `eatout`; `buildShoppingList` already skips non-`cook` days, so Bought ingredients never appear. Locked in as an explicit invariant + test. |

## Data model

`parseMeals(rows)` returns `Meal[]`, where each `Meal` is:

```js
{
  meal: string,          // from the "Dinner" header row, per column
  category: string,      // Type; default 'Other' when blank
  where: 'Home' | 'Either' | 'Eat Out',  // normalized from Bought / Made
  healthy: boolean,      // Healthy === 'Yes'
  speed: string,         // 'Quick' | 'Slow' | 'N/A' | ''  (display only)
  cost: string,          // '$' | '$$' | '$$$' | ''        (display only)
  special: string,       // Special / Sale free text       (display only)
  ingredients: string[], // split/trimmed/filtered; [] when blank
}
```

### `Bought / Made` normalization

| Sheet value | `where` | `mode` (via `modeFor`) |
| --- | --- | --- |
| Homemade (or Home) | `Home` | `cook` |
| Either | `Either` | `cook` |
| Bought (or Eat Out) | `Eat Out` | `eatout` |
| blank / unknown | `Either` | `cook` |

Keeping the internal `where` vocabulary (`Home`/`Either`/`Eat Out`) unchanged means `modeFor`, the generator's ≤2 cap, `evaluateOverride`, and `buildShoppingList` all keep working without edits.

## Component changes

### `config.js`
- `SHEET_ID` → `1Y-KHVDtsOtPjscoIv3lz1lzCGf9Lb5eOGv9ajVhq9uM`.
- Remove `DEALS_CSV_URL`. `MEALS_CSV_URL` stays.

### `model.js`
- Rewrite `parseMeals` for the transposed grid:
  - Build a `label → row` map from column 0 (lowercased/trimmed attribute labels), so row order is irrelevant.
  - Meal names come from the `dinner` row (row 0), columns `1..N`; skip blank meal names.
  - For each meal column `j`, pull each attribute from its row at index `j`.
  - Populate `speed`, `cost`, `special`; normalize `where`; parse `healthy`/`ingredients` as today.
- `normalizeWhere`: add `bought → 'Eat Out'`; keep `home/homemade → 'Home'`, `either → 'Either'`, default `'Either'`.
- Delete `parseDeals`.

### `csv.js`
- Unchanged. Still parses the raw CSV grid into row arrays; the transpose happens in `model.js`.

### `sheet.js`
- Remove `fetchDeals`, the `DEALS_CSV_URL` import, and the `parseDeals` import. Keep `fetchMeals`.

### `deals.js` + `tests/deals.test.js`
- Delete both (dead once the Deals tab is gone).

### `render.js`
- `dayCardHTML(day, dayIndex)` — drop the `deal` parameter and `dealPill`. Add **Speed**, **Cost**, and **Special/Sale** pills (rendered only when the value is non-empty). Relabel the eat-out tag from `· EAT OUT` to `· BOUGHT`; keep the eat-out card styling/badge. Keep category + healthy pills.
- `mealRowHTML` — add Speed and Cost pills next to the existing category/where/healthy pills.
- `evaluateOverride` — unchanged; still keys off `where === 'Eat Out'` (now meaning Bought). Wording may say "bought" instead of "eat-out" for clarity.
- Remove `dealPill`.

### `app.js`
- Remove the `fetchDeals()` call and the `deal` argument passed into `dayCardHTML`. Remove any `dealForDay` usage.

## What stays the same

- The four rules and relaxation ladder, history/ratings weighting, store/Firebase sync (`dinner/home` scope), and the Sage-Gold design system.
- `generator.js`, `store.js`, `firebase.js`, `icons.js` — no functional changes.
- `buildShoppingList` — no change; the existing `day.mode !== 'cook'` guard delivers the "no Bought food on the list" requirement.

## Invariants (must be preserved + tested)

1. **Bought meals never appear on the shopping list** (mode `eatout` → skipped). Add a test covering a Bought meal that *does* have ingredients listed, asserting they are excluded.
2. **Speed/Cost/Special never affect generation** — they are absent from `generator.js` inputs and the rule checks.
3. **Row order in the sheet does not matter** — parser is keyed by attribute label, not row position.

## Testing

- `tests/model.test.js` — rewrite fixtures for the transposed grid; assert `speed`/`cost`/`special` parsing, `Bought → 'Eat Out'`, blank handling, and label-keyed (order-independent) row reading.
- `tests/render.test.js` — update for the new `dayCardHTML` signature; assert Speed/Cost/Special pills render when present and are omitted when blank; assert `· BOUGHT` label on eatout cards.
- `tests/shopping.test.js` — add the Bought-with-ingredients exclusion case (invariant #1).
- `tests/deals.test.js` — remove.
- `tests/csv.test.js`, `tests/generator.test.js`, `tests/store.test.js` — unaffected.

## Data caveat (no code change)

Many meals have blank Ingredients (Empanadas, Nachos, Fish, Crab Cakes, etc.), so the shopping list will be partial until Tommy fills them in. The app handles blanks correctly (empty arrays).

## Out of scope

- Letting Special/Sale steer which day a meal is scheduled (e.g. auto-placing Tacos on Tuesday).
- Speed/Cost as soft preferences, hard rules, or filters (explicitly deferred — display only for now).
- Backfilling missing ingredient data (a Sheet edit, not an app change).
