# 🗺️ Family Dinner Planner — Roadmap

How we get from "five design docs" to a dinner planner we actually use every week.
Phases are ordered by dependency and value. Anything not listed here is out of scope
until it earns a place (see [VISION.md](VISION.md) non-goals).

> **Convention:** when a roadmap item ships, it moves out of this file and into
> [CHANGELOG.md](CHANGELOG.md). This file only ever describes work *not yet done*.

---

## Phase 0 — Foundations *(next up)*

Get data flowing and the shell standing before any logic.

- [ ] Single-file `index.html` scaffold (HTML/CSS/JS, no build step) on the Fresh Kitchen
      design system.
- [ ] Publish the Google Sheet to the web (read-only) and confirm CSV endpoints for both
      tabs (meals + deals).
- [ ] Parse the **meals** CSV → `{ meal, category, ingredients[], where, healthy, notes }`.
- [ ] Parse the **deals** CSV → `{ day, restaurant, deal, notes }`.
- [ ] Firebase Realtime Database project + path-scoped config (mirror health-tracker setup).
- [ ] App shell: bottom tab bar (Plan · Shopping · Meals), responsive column layout,
      loading + error states for the Sheet fetch.

## Phase 1 — The generator (the heart) *(MVP)*

The rule-respecting week. This is the feature the whole app exists for.

- [ ] Week model: Monday–Sunday, each day = a meal slot (or eat-out slot).
- [ ] Rule engine, in priority order:
  1. No meal repeated from the last saved week.
  2. ≤ 2 eat-out days (Eat Out → must; Either → may; Home → never).
  3. No duplicate Category within the week.
  4. Healthy target (default ≥ 3/week, adjustable).
- [ ] Graceful relaxation: when the meal list can't satisfy every rule, relax the
      lowest-priority rule and surface a clear message about what was relaxed and why.
- [ ] "Generate week" → renders the Accent-bar day cards.
- [ ] Save the generated/edited plan to Firebase; load it on open.

## Phase 2 — Tweak & pivot *(MVP)*

Because life happens.

- [ ] Per-day override dropdown (pick any eligible meal; live rule warnings shown inline).
- [ ] "⟳ swap" — re-roll a single day within the rules.
- [ ] "Re-roll" — regenerate all unlocked days.
- [ ] Lock a day so re-roll leaves it alone.
- [ ] Healthy progress indicator ("Healthy: 2/3") that updates as days change.

## Phase 3 — Eat-out deals *(MVP)*

- [ ] On eat-out days, match the day-of-week to the deals table and show the
      restaurant/deal as a suggestion on the card (coral deal pill).
- [ ] Handle empty deal cells gracefully (just show "Eat out" with no suggestion).

## Phase 4 — Shopping list *(MVP)*

- [ ] Derive the list from the week's planned (cook-at-home) meals' ingredients.
- [ ] Dedupe identical ingredients across meals (and note which meals need each).
- [ ] Group by aisle: Produce · Meat & Seafood · Pantry · Dairy · Other (keyword mapping).
- [ ] Checkboxes for "already have"; persistent **staples** stay checked week-to-week,
      perishables reset on each new plan.
- [ ] Edit the staples set (mark/unmark an ingredient as a staple).

## Phase 5 — Polish & ship *(MVP complete)*

- [ ] Empty/edge states (no plan yet, Sheet unreachable, not enough meals for the rules).
- [ ] PWA niceties: add-to-home-screen, app icon, offline read of the last saved plan.
- [ ] Cross-device sync sanity check (both phones see the same plan in real time).
- [ ] Deploy to GitHub Pages; write the "first run" setup steps into the README.

---

## Later / nice-to-have *(post-MVP, not committed)*

- [ ] **Leftovers / "cook once, eat twice"** — mark a meal to fill two days.
- [ ] **Servings & quantities** in the shopping list (needs a qty column in the Sheet).
- [ ] **History view** — see past weeks; "we haven't had this in a while" nudges.
- [ ] **Avoid repeats for N weeks** (not just last week) once history is rich enough.
- [ ] **Dark mode** (`prefers-color-scheme`).
- [ ] **Share/export** the shopping list (copy to clipboard / text to phone).
- [ ] **Per-day notes** ("defrost chicken", "kids at grandma's").
- [ ] **Seasonal / favorite weighting** in the generator.

---

## Explicitly *not* on the roadmap

Recipe steps, nutrition/calorie computation, multi-household accounts, pantry stock
levels, native apps. See [VISION.md](VISION.md) for the reasoning.
