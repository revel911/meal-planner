# Meal Planner — Planning Improvements (category spacing, deal days, week strip, Either icon, reload)

**Date:** 2026-06-02
**Status:** Approved (design)
**Author:** Tommy + Claude

## Background

Five improvements to the Plan experience, driven by use of the live app:

1. **Too many back-to-back nights of the same category.** Root cause: the sheet has only **5 categories** (Italian, Mexican, Seafood, American, Asian) for **7 days**, so the existing "no duplicate category in the whole week" rule is mathematically impossible and is silently relaxed every week — leaving same-category nights free to clump.
2. **Honor deals:** the `Special / Sale` column carries a weekday (Tacos → Tuesdays, Empanadas → Wednesday). Those meals should land on their deal day.
3. **Week-at-a-glance:** show the whole week at the top so you can review it without scrolling the big cards.
4. **The sheet is always changing:** new meals (e.g. Vietnamese, Roots were just added) must flow through. The transposed parser already reads meals as columns, so additions appear on reload — add a one-tap refresh and a test that locks the behavior in.
5. **Distinct icon for "Either"** meals (can cook or buy), separate from Homemade and Bought.

(A sixth concern — "what happened to the shopping list" — was a false alarm: the Shopping tab was just at the bottom of the bar on desktop. No change.)

## Decisions (from brainstorming)

| # | Topic | Decision |
| --- | --- | --- |
| 1 | Category rule | **No back-to-back same category.** Replace the impossible "unique all week" rule with an adjacency rule: day *d*'s category ≠ day *d-1*'s. A category may repeat in the week, just not on consecutive nights. |
| 2 | Deal days | **Pin if chosen; deals win.** A meal with a parsed deal weekday may only be placed on that day (so it's never forced into the week, but if chosen it lands on its deal day). A deal placement overrides the adjacency rule. |
| 3 | Week overview | **Compact 7-day strip** above the detail cards; tapping a chip scrolls to / flashes that day's card. |
| 4 | Sheet additions | Already work on reload (parser reads columns dynamically). Add a **"Reload from Sheet"** button in the Meals tab + a test. |
| 5 | Either icon | **`pot`** icon (already in the icon set). Badge: `home`=Homemade, `pot`=Either, `utensils`=Bought. |

## Data model — `model.js`

Add a derived field to each meal: `dealDay` — the weekday index (0=Mon … 6=Sun) parsed from `special`, or `null`.

- Parse: lowercase/trim `special`; if it starts with a weekday name (matching `DAYS`, tolerant of a trailing "s" — "tuesdays" → Tuesday), set `dealDay` to that index; otherwise `null`.
- `special` (raw text) is unchanged and still drives the display pill.
- Free text that isn't a weekday (e.g. "BOGO") → `dealDay = null` (shows as a pill, not pinned).

## Generator — `generator.js`

Switch from "pick a valid set of 7 meals" to **slot-filling Mon→Sun (indices 0–6) with backtracking**.

For each day slot *d*, a candidate meal `m` may be placed if:
- `m.meal` not already used this week (distinct names).
- **Deal constraint** (never relaxed): if `m.dealDay !== null` then `m.dealDay === d`. (A deal meal is only ever eligible in its own slot.)
- **Adjacency** (unless `adjacent` relaxed): if `d > 0`, `m.category !== chosen[d-1].category` — **except** this check is skipped when `m.dealDay === d` (a pinned deal placement wins over spacing).
- **Bought cap** (unless `eatout` relaxed): placing a `mode === 'eatout'` meal keeps the running bought count ≤ `maxEatOut`.

On a full week (all 7 slots filled): unless `healthy` relaxed, `countHealthy ≥ healthyTarget`.

Pool: meals not in `recentWeek` (= `history[0]`) unless `repeat` relaxed. Candidate ordering is the existing `weightedShuffle` (recency × rating), so liked/less-recent meals are tried first.

**Relaxation ladder** (lowest priority dropped first; `category` token renamed to `adjacent`):

```js
const LADDER = [
  [],
  ['healthy'],
  ['healthy', 'adjacent'],
  ['healthy', 'adjacent', 'eatout'],
  ['healthy', 'adjacent', 'eatout', 'repeat'],
];
```

Deal pins are never in the ladder — they can't cause infeasibility (a deal meal can simply go unused).

If even fully relaxed the pool has < 7 meals, return the existing `insufficient` signal.

- `rerollDay(plan, dayIndex, meals, opts)` updated: the replacement must satisfy neighbor adjacency (vs day *d-1* and *d+1*, skipped if the candidate is a deal meal on day *d*), the bought cap across the other days, distinct names, and the deal constraint (a meal with `dealDay !== null` can only land on its day).
- **Remove `regenerateUnlocked`** and its tests — dead code (not called by the app); the model change would otherwise require maintaining it in parallel.
- `countHealthy`, `modeFor`, `ratingWeight`, `recencyWeight`, `weightedShuffle` unchanged.

## Render — `render.js`

- **Week strip:** new `weekStripHTML(plan)` → a compact Mon–Sun row; each chip shows the day abbreviation, a short meal name, and the category, with `data-day="<i>"` for click handling. Empty/no-plan → empty string.
- **Either icon (#5):** the day-card badge is keyed on `day.meal.where`:
  - `Home` → `ICONS.home`, class `badge-cook`
  - `Either` → `ICONS.pot`, class `badge-either`
  - `Eat Out` (Bought) → `ICONS.utensils`, class `badge-eatout`
  The card-level `eatout`/`cook` class (and the `· BOUGHT` label) continue to key off `mode`, so Either meals stay on the cook side for styling and the shopping list.
- **`evaluateOverride`:** replace the "duplicate category anywhere this week" warning with a **back-to-back** check — only warn when the picked meal's category matches the *adjacent* day(s) (`dayIndex-1` / `dayIndex+1`). Keep the bought-cap warning. Add a gentle informational hint when the picked meal has a `dealDay` that isn't the day it's being placed on (e.g. "Tacos has a Tuesday deal").

## App wiring — `app.js`

- In `renderPlan`, render `weekStripHTML(state.plan)` into a strip container above `#plan-cards`.
- Strip click → scroll the matching `[data-day]` card into view and briefly flash it.
- **Reload button (#4):** a "Reload from Sheet" control in the Meals tab that calls `fetchMeals()` again, updates `state.meals`, and re-renders the Meals list (and is resilient to fetch errors, mirroring `init`). The plan itself is left as-is.

## Styles / service worker

- `index.html`: CSS for the week strip and the `badge-either` (pot) treatment; a strip container element in the Plan screen; a Reload button in the Meals screen header.
- `sw.js`: bump `CACHE` `dinner-v4` → `dinner-v5` so the changed shell ships to installed clients.

## Invariants (preserve + test)

1. **No two consecutive days share a category** in a generated week, except where a deal pin forces it. (Deal wins.)
2. **A meal with a `dealDay` only ever appears on that weekday** — in generate and in reroll.
3. Deal meals are **not forced** into every week (pin-if-chosen).
4. Existing rules still hold: no-repeat-from-last-week, ≤2 bought, healthy ≥ target, with the documented relaxation order.
5. Speed/Cost/Special remain display-only; Bought meals stay off the shopping list.

## Testing

- `model`: `dealDay` parsing — "Tuesdays"→1, "Wednesday"→2, case-insensitive, non-weekday → null, blank → null.
- `generator`: no back-to-back category (seeded); a deal meal lands only on its day; a deal pin is allowed to break adjacency (deals win); deal meals not forced; relaxation order unchanged for the surviving rules; `rerollDay` respects neighbors + deal constraint.
- `render`: `weekStripHTML` lists 7 days with `data-day`; `pot` badge + `badge-either` for an Either meal, `home` for Homemade, `utensils` for Bought; `evaluateOverride` flags back-to-back (not week-wide) category and the bought cap.
- Remove `regenerateUnlocked` tests.

## Out of scope

- Auto-*including* deal meals every week (only pin-if-chosen).
- Speed/Cost as generation inputs (still display-only).
- Backfilling missing ingredients in the sheet (a Sheet edit; tracked in ROADMAP).
- Tightening Firebase rules / adding auth (separate task).
