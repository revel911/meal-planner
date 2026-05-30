# Meal Planner — Card Redesign, Recency History & Ratings

**Date:** 2026-05-29
**Status:** Approved design, ready for implementation plan

## Problem

Five pieces of feedback on the as-built Sage & Gold dinner planner:

1. The per-card meal **dropdown** wastes a full row on every card and is redundant with the swap button.
2. The per-card **lock** button feels gimmicky.
3. Cook-at-home vs eat-out is only shown as a text label; it should have an **icon**.
4. Generation only avoids the **single previous week**, so meals recur sooner than desired. It should remember the last 2–3 weeks and favor newer/unused meals.
5. There is no way to express preference. The user wants a **thumbs up / down** per meal so liked meals come up more often and disliked ones less.

## Design

### 1. Day card (chosen layout: "D2")

Each day card renders, top to bottom:

- A **mode badge** in the top-left corner: a *house* icon (cook at home) or a gold *fork/utensils* icon (eat out). Replaces the old inline `· EAT OUT` text label. (point #3)
- Day label, then the meal name (serif).
- The existing pill row (category, healthy, deal).
- A **hairline-separated footer** with a small uppercase `CHANGE` label and two icon buttons:
  - **⟳ shuffle** — re-rolls *this one day* to a different eligible meal, using the weighted selection below.
  - **☰ list** — opens a **picker sheet** listing all meals (name + category), to choose a specific meal for that day. Replaces the old inline `<select>`. (point #1)

Removed from the card: the inline `<select>` dropdown (point #1) and the **lock** button (point #2).

### 2. Top-of-screen actions

With per-day locking gone, the **"Re-roll unlocked"** button is replaced by **"Reshuffle week"**, which re-rolls all seven days. "Generate week" is unchanged. Individual days are now adjusted with the per-card shuffle/list controls instead of lock-then-regenerate.

### 3. Recency history — soft fade (point #4)

- Storage: replace the single `mp:lastweek` (string[] of last week's meal names) with **`mp:history`**, a list of up to **3** past weeks, each a `string[]` of meal names. Firebase-synced under the existing `dinner/home` scope so both phones share it.
- On each **Generate week**, the week being replaced is pushed onto `mp:history`; the list is capped to the most recent 3 entries.
- During selection each meal gets a **recency weight**:
  - In the most-recent week → weight `0` (hard "no repeat", same as today). Relaxable via the existing ladder if the pool would otherwise be too small.
  - In the week before that → `~0.25`.
  - Three weeks ago → `~0.5`.
  - Not in recent history → `1.0`.

### 4. Ratings — weighted odds (point #5)

- Storage: new **`mp:ratings`**, a map `{ mealName -> "up" | "neutral" | "down" }`. Firebase-synced. Default for any unrated meal is `neutral`.
- UI: on the **Meals tab only**, each meal row gets a 👍 / 👎 toggle. Tapping the active state again clears it back to neutral. Day cards stay clean (no thumbs).
- **Rating weight**: `up ≈ 2.5`, `neutral = 1`, `down ≈ 0.25`. (Starting values; tunable in one place.)

### 5. Combined selection model

Final pick-weight per meal = **recency weight × rating weight**.

The generator's random ordering becomes a **weighted shuffle** (Efraimidis–Spirakis style: key = `rng^(1/weight)`, take largest keys) so higher-weight meals tend to be chosen earlier. All existing **hard constraints stay**: distinct meal names, no-repeat-category, max eat-out, healthy target, and the relaxation ladder that loosens these (then finally the no-repeat) when the meal list is too small to satisfy them.

A meal's weight only affects *ordering / probability*, never *eligibility* (any meal with weight > 0 remains selectable). The only weight-0 case is the most-recent week, which is already the existing hard-avoid behavior. Therefore this introduces **no new "not enough meals" failure** beyond what exists today.

`shuffled()` in `generator.js` gains an optional per-item weight function; `select()`, `generateWeek()`, `rerollDay()`, and `regenerateUnlocked()` (→ reshuffle) pass recency + rating weights through. The healthy target continues to be enforced by the existing backtracking constraint.

### 6. Data & sync summary

Store keys after this change:

- `mp:plan` — unchanged.
- `mp:history` — **new**, replaces `mp:lastweek`.
- `mp:ratings` — **new**.
- `mp:staples`, `mp:checked` — unchanged.

Graceful degradation: a missing `mp:history` reads as empty (no recency penalty); a missing/partial `mp:ratings` reads as all-neutral. Existing saved data and the other phone keep working without migration; `mp:lastweek`, if present, is simply ignored (optionally seeded as the first history entry on first run).

## Components touched

- `src/store.js` / `src/config.js` — `KEYS` (add `history`, `ratings`; drop `lastWeek`), store getters/setters: `getHistory`/`pushHistory`, `getRatings`/`setRating`.
- `src/generator.js` — weighted `shuffled`, recency + rating weighting in `select`/`generateWeek`/`rerollDay`/`regenerateUnlocked`.
- `src/render.js` — card footer (badge, hairline, shuffle/list icons), meal-row thumbs, picker-sheet markup.
- `src/icons.js` — add `house` (cook) and reuse/adjust `utensils` (eat out), `list`, `thumbUp`, `thumbDown`.
- `src/app.js` — wire shuffle/list/picker-sheet, "Reshuffle week", Meals-tab thumb toggles, history push on generate; load ratings/history on init.
- `index.html` — CSS for badge, card footer, picker sheet, thumbs; rename the reroll button.

## Testing

- **generator**: seeded-RNG tests that 👍 meals are selected more often than neutral, 👎 less; that recent-history meals are avoided/de-prioritized in the right order; that weight-0 only applies to the most-recent week; that all hard constraints and the relaxation ladder still hold.
- **store**: history push/cap-at-3, ratings read/write/clear, graceful defaults for missing keys.
- **render**: card footer + badge variants (cook/eat-out), picker-sheet markup, Meals-tab thumb states.

## Out of scope

- Per-meal explicit cadence ("weekly/monthly") — rejected in favor of weighted thumbs.
- Rating from the day card — Meals tab only.
- Changes to the Google Sheet schema, shopping list, or deals logic.
